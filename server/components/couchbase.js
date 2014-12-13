var couchbase = require('couchbase'),
    _ = require('underscore'),
    q = require('q'),
    helpers = require('./helpers');

module.exports = function(config){
    var clusters = config.clusters;

    function getBucketData(clusterName, bucketName) {
        var result = {};

        for(var i = 0; i < clusters.length; ++i) {
            if(clusters[i].name == clusterName) {
                result.clusterUrl = clusters[i].url;
                for(var j = 0; j < clusters[i].buckets; ++j) {
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
        var bucketData = getBucketData(clusterName, bucketName);
        var cluster = new couchbase.Cluster(bucketData.clusterUrl);
        self.bucket = cluster.openBucket(bucketData.bucketName, bucketData.bucketPass, function(error) {
            if (error) throw error;
        });
        self.bucket.operationTimeout = 10000;

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
                if (n in o) {
                    o = o[n];
                } else {
                    o[n] = {};
                    o = o[n];
                }
            }
            o[a[a.length - 1]] = value;
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
                if (n in o) {
                    o = o[n];
                }
            }
            delete o[a[a.length - 1]];
        };

        self.runNickelQuery = function(query, getOnlyIds, callback) {
            var queryPredicates = self.getNickelCondition(query.predicates);
            var limit = query.limitRows;
            if (getOnlyIds == 1) {
                if (limit) {
                    var queryCode =
                        'SELECT META().id AS docId, ' +
                        'META().cas AS casValue ' +
                        'FROM ' + bucket + ' ' +
                        'WHERE ' + queryPredicates + ' ' +
                        'LIMIT ' + limit;
                } else {
                    var queryCode =
                        'SELECT META().id AS docId, ' +
                        'META().cas AS casValue ' +
                        'FROM ' + bucket + ' ' +
                        'WHERE ' + queryPredicates;
                }
            } else {
                if (limit) {
                    var queryCode =
                        'SELECT META().id AS docId, ' +
                        'META().cas AS casValue,* ' +
                        'FROM ' + bucket + ' ' +
                        'WHERE ' + queryPredicates + ' ' +
                        'LIMIT ' + limit;
                } else {
                    var queryCode =
                        'SELECT META().id AS docId, ' +
                        'META().cas AS casValue,* ' +
                        'FROM ' + bucket + ' ' +
                        'WHERE ' + queryPredicates;
                }
            }

            self.bucket.query(queryCode, function (error, result) {
                console.log('Executing N1QL: ' + queryCode);
                if (error) {
                    console.log('N1QL - ' + error);
                }
                var parsedResult = util.inspect(result);
                callback(error, result);
            });
        };

        self.getNickelCondition = function(node) {
            if (typeof node == 'object' && node.op != 'undefined' && node.param1 != 'undefined' && node.param2 != 'undefined')
                return " ( " + self.getNickelCondition(node.param1) + " " + node.op + " " + self.getNickelCondition(node.param2) + " ) ";
            else return node;
        }
    };

    return {
        db : db
    };
};