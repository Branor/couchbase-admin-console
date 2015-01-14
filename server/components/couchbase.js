var couchbase = require('couchbase'),
    _ = require('underscore'),
    q = require('q'),
    helpers = require('./helpers'),
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

        for(var i = 0; i < clusters.length; ++i) {
            if(clusters[i].name == clusterName) {
                result.clusterUrl = clusters[i].url;
                result.nickelUrl = clusters[i].nickelUrl;
                for(var j = 0; j < clusters[i].buckets.length; ++j) {
                    if(clusters[i].buckets[j].name == bucketName) {
                        result.bucketName = clusters[i].buckets[j].name;
                        result.bucketPass = clusters[i].buckets[j].password;
                        break;
                    }
                }
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

        self.setValueByPath = function (object, path, value) {
            var a = path.split('.');
            var o = object;
            for (var i = 0; i < a.length - 1; i++) {
                var n = a[i];
                if (!(n in o)) {
                    o[n] = {};
                }
                o = o[n];
            }
            o[a[a.length - 1]] = value;

            return object;
        };

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

        self.executeCustomExpression = function(doc, path, expression) {
            vm.runInNewContext(expression, {doc: doc}, self.config.customStackTraceFile);
            return doc;
        };

        self.runCommand = function(predicate, propName, propVal, queryType, dryRun, commandCallback) {
            console.log("runCommandCom", predicate, self.bucketData);
            self.runNickelQuery(predicate, self.bucketData.bucketName, function (error, results) {
                if(error)
                    return commandCallback(error);
                console.log("runCommandCom: running async on " + results.length + " with " + self.config.maxProcessingParallelism + " 'thread'");
                async.eachLimit(results, self.config.maxProcessingParallelism, 
                    function (result, callback) {
                        console.log("processing data for docid " + result.docId);
                        self.processData(result.docId, propName, propVal, queryType, dryRun, 0, callback);
                    }, 
                    function (err){
                        commandCallback(err, results ? results.length : null);
                    }
                );
            });
        };

        self.getProcessorFunction = function(queryType) {
            switch(queryType) {
                case 'add': return self.setValueByPath;
                case 'change-value': return self.setValueByPath;
                case 'delete': return self.deleteValueByPath;
                case 'change-custom': return self.executeCustomExpression;
            }
        };

        self.processData = function(docId, propName, propVal, queryType, dryRun, tries, callback)
        {
            if(tries >= self.config.maxDocumentUpdateRetries)
                return callback('Unable to update document ' + docId + ' in ' + tries + ' tries.');

            var processor = self.getProcessorFunction(queryType);

            self.bucket.get(docId, function (error, result) {
                if(error)
                    return callback(error);
   
                var doc = processor(result.value, propName, propVal);
                if(dryRun)
                    return callback();

                self.bucket.replace(docId, doc, {cas : result.cas}, function (err, res) {
                    if(err)
                        if(err.code == couchbase.errors.keyAlreadyExists)
                            return self.processData(docId, propName, propVal, queryType, dryRun, tries + 1, callback);
                        else
                            return callback(err);
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