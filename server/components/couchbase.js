var couchbase = require('couchbase'),
    _ = require('underscore'),
    q = require('q'),
    helpers = require('./helpers'),
    async = require('async');

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
        console.log(self.bucketData, cluster, self.bucket);
        self.bucket.enableN1ql(self.bucketData.nickelUrl);


        self.findUser = function(user) {
            var dfr = q.defer();

            self.bucket.get('cb::manager::users', function (error, result) {
                if (error) {
                    dfr.notify(error);
                    dfr.reject("Error finding Users document");
                }
                if (result && result.value && result.value[user]) {
                    dfr.resolve(result.value[user]);
                }
                dfr.reject("No user found");
            });

            return dfr.promise;
        };

        self.authenticate = function (username, password) {
            var dfr = q.defer();

            self.bucket.get('cb::manager::users', function (error, result) {
                if (error) {
                    console.error(error);
                    dfr.reject("Error finding Users document");
                } else {
                    if (!result.value || !result.value[username]) {
                        dfr.resolve(false);
                    }
                    var savedPassword = result.value[username];

                    if(helpers.compare(savedPassword, password)) {
                        dfr.resolve(username);
                    } else {
                        dfr.resolve(false);
                    }
                }
            });

            return dfr.promise;
        };

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

        self.executeCustomExpression = function(object, expression) {
            // eval(expression, object)

            return object;
        };

        self.runCommand = function(predicate, propName, propVal, queryType, dryRun, commandCallback) {
            console.log("runCommand", self.bucketData);
            self.runNickelQuery(predicate, self.bucketData.bucketName, function (error, results) {
                if(error)
                    return commandCallback(error);

                async.eachLimit(results, self.config.maxProcessingParallelism, 
                    function (result, callback) {
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
            self.bucket.query(nickelQuery, function (error, result) {
                console.log('Executing N1QL: ' + queryCode);
                if (error) {
                    console.log('N1QL - ' + error);
                }
                console.log(result);
                callback(error, result);
            });
        };
    };

    return {
        db : db
    };
};