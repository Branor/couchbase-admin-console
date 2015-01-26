var couchbase = require('couchbase'),
    _ = require('underscore'),
    q = require('q'),
    async = require('async'),
    vm = require('vm');

module.exports = function(config){
    var config = config;

    function getConfig() {
        return config;
    }

    function getBucketData(clusterName, bucketName) {
        var result = {};
        var clusters = getConfig().clusters;

        result.clusterUrl = clusters[clusterName].url;
        result.nickelUrl = clusters[clusterName].nickelUrl;
        for(var j = 0; j < clusters[clusterName].buckets.length; ++j) {
            if(clusters[clusterName].buckets[j].name == bucketName) {
                result.bucketName = clusters[clusterName].buckets[j].name;
                result.bucketPass = clusters[clusterName].buckets[j].password;
                break;
            }
        }

        return result;
    }

    var db = function(clusterName, bucketName) {
        var self = this;
        self.config = getConfig();
        self.bucketData = getBucketData(clusterName, bucketName);
        var cluster = new couchbase.Cluster(self.bucketData.clusterUrl);
        self.bucket = cluster.openBucket(self.bucketData.bucketName, self.bucketData.bucketPass, function(error) {
            if (error) throw error;
        });
        self.bucket.operationTimeout = 10000;
        self.bucket.enableN1ql(self.bucketData.nickelUrl);
        self._vmContext = null;

        self.resetCounters = function() {
            self.counters = {};
            self.counters.matched = 0;
            self.counters.warnings = {};
            self.counters.errors = {};
            self.counters.saved = 0;
            self.counters.start = new Date().getTime();
        };

        // for change or add actions.
        self.setValueByPath = function (object, path, value) {
            var a = path.split('.'); // parse the given path of the property
            var o = object; // assign the pointer to the object
            for (var i = 0; i < a.length - 1; i++) { // loop through path (except for the last part)
                var n = a[i];
                if (!(n in o)) { // if the given property is not in the object
                    o[n] = {}; // create the new object
                }
                o = o[n]; // point to the sub object
            }
            // the pointer 'o' is now pointing to the lowest level of tree so we just assign the value to the last part of the path (not looped in the last loop)
            o[a[a.length - 1]] = value;

            return object;
        };

        // for add actions - if property already exists, will add a warning, but resume action
        self.addValueByPath = function(object, path, value) {
            if(typeof(self.getValueByPath(object, path)) !== 'undefined') {
                if(typeof(self.counters.warnings['property-already-exists']) === 'undefined') {
                    self.counters.warnings['property-already-exists'] = 0;
                }
                ++self.counters.warnings['property-already-exists'];
            }
            return self.setValueByPath(object, path, value);
        };

        // for change actions - if property not exists, will add a warning, but resume action
        self.changeValueByPath = function(object, path, value) {
            if(typeof(self.getValueByPath(object, path)) === 'undefined') {
                if(typeof(self.counters.warnings['property-does-not-exists']) === 'undefined') {
                    self.counters.warnings['property-does-not-exists'] = 0;
                }
                ++self.counters.warnings['property-does-not-exists'];
            }
            return self.setValueByPath(object, path, value);
        };

        // will return the value of the specified path in a given object.
        self.getValueByPath = function (object, path) {
            var o = object;
            path = path.replace(/\[(\w+)\]/g, '.$1');
            path = path.replace(/^\./, '');
            var a = path.split('.');
            while (a.length) {
                var n = a.shift();
                if (n in o) {
                    o = o[n];
                } else {
                    return;
                }
            }
            return o;
        };

        // will delete a property by path on an object
        self.deleteValueByPath = function (object, path) {
            var a = path.split('.');
            var o = object;
            for (var i = 0; i < a.length - 1; i++) {
                var n = a[i];
                if (n in o)
                    o = o[n];
                else 
                    return object;
            }
            delete o[a[a.length - 1]];

            return object;
        };

        // will execute a custom expression on an object
        self.executeCustomExpression = function(doc, path, expression) {
            if(!self._vmContext) self._vmContext = vm.createContext();
            self._vmContext.doc = doc;
            vm.runInContext(expression, self._vmContext, self.config.customStackTraceFile);
            return doc;
        };

        // main entry point - will run an N1QL query, to get document ids, and then run the process (according to type)
        self.runCommand = function(predicate, propName, propVal, queryType, dryRun, commandCallback) {
            self.resetCounters();
            self.runNickelQuery(predicate, self.bucketData.bucketName, function (error, results) {
                if(error)
                    return commandCallback(error);
                console.log("runCommandCom: running async on " + results.length + " with " + self.config.maxProcessingParallelism + " 'thread'");
                self.counters.matched = results.length;
                async.eachLimit(results, self.config.maxProcessingParallelism, 
                    function (result, callback) {
                        self.processData(result.docId, propName, propVal, queryType, dryRun, 0, callback);
                    }, 
                    function (err){
                        if(self._vmContext) self._vmContext = null;
                        self.counters.finish = new Date().getTime();
                        self.counters.elapsed = ((self.counters.finish - self.counters.start) / 1000) + " seconds";
                        delete self.counters.start;
                        delete self.counters.finish;
                        commandCallback(err, self.counters);
                    }
                );
            });
        };

        // decide on action to perform
        self.getProcessorFunction = function(queryType) {
            switch(queryType) {
                case 'add': return self.addValueByPath;
                case 'change-value': return self.changeValueByPath;
                case 'delete': return self.deleteValueByPath;
                case 'change-custom': return self.executeCustomExpression;
            }
        };

        // handle each document in the result set (get document id, get document, perform action and save or not - depending on dryrun value)
        self.processData = function(docId, propName, propVal, queryType, dryRun, tries, callback) {
            if(tries >= self.config.maxDocumentUpdateRetries) {
                if(typeof(self.counters.errors['max-write-attemptes']) === 'undefined') {
                    self.counters.errors['max-write-attemptes'] = 0;
                }
                ++self.counters.errors['max-write-attemptes'];
                return callback('Unable to update document ' + docId + ' in ' + tries + ' tries.');
            }

            var processor = self.getProcessorFunction(queryType);

            self.bucket.get(docId, function (error, result) {
                if(error)
                    return callback(error);
   
                var doc = processor(result.value, propName, propVal);
                if(dryRun)
                    return callback();

                self.bucket.replace(docId, doc, {cas : result.cas}, function (err, res) {
                    if(err)
                        // if err code is keyAlready exists, it means that cas has changed - someone updated the document since we queried about it.
                        if(err.code == couchbase.errors.keyAlreadyExists) {
                            return self.processData(docId, propName, propVal, queryType, dryRun, tries + 1, callback);
                        } else {
                            if(typeof(self.counters.errors[err.code]) === 'undefined') {
                                self.counters.errors[err.code] = 0;
                            }
                            ++self.counters.errors[err.code];
                            return callback(err);
                        }
                    ++self.counters.saved;
                    return callback();
                });
            });
        };
 
        self.runNickelQuery = function(query, bucket, callback) {
            var queryCode =
                'SELECT META().id AS docId, ' +
                'META().cas AS casValue ' +
                'FROM ' + bucket + ' ' +
                'WHERE ' + query;
            var nickelQuery = couchbase.N1qlQuery.fromString(queryCode);
            var start = new Date().getTime();
            self.bucket.query(nickelQuery, function (error, result) {
                console.log('Executing N1QL: ' + queryCode);
                if (error) {
                    console.log('N1QL - ' + error);
                }
                var end = new Date().getTime();
                console.log("finished query. elapsed time: " + (end - start) + " ms.");
                callback(error, result);
            });
        };
    };

    return {
        db : db
    };
};