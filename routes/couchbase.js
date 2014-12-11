var _ = require('underscore');
var util = require('util');
var express = require('express');
var router = express.Router();
var couchbase = require('couchbase');

module.exports = function(applicationState) {
    var state = applicationState;
    // This enum represents the possible action types for documents
    var commandTypes = Object.freeze({'addProperty': 1, 'removeProperty': 2, 'modifyProperty': 3});

    // Index page - gesture
    var index = function (req, res) {
        var bucket = req.bucket;
        var msg = 'Couchbase is connected: ' + bucket.connected;
        res.send(msg);
    };

    var getBucket = function() {   
        var clusterUrl = state.getClusterUrl();
        var bucketName = state.getBucketName();
        var bucketPassword = state.getBucketPassword();
        var cluster = new couchbase.Cluster(clusterUrl);
        var bucket = cluster.openBucket(bucketName, bucketPassword, function(error) {
            if (error) throw error;
        });
        bucket.operationTimeout = 10000;
    };

    var setValueByPath = function (object, path, value) {
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
    }

    var getValueByPath = function (object, path) {
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
    }

    var deleteValueByPath = function (object, path) {
        var a = path.split('.');
        var o = object;
        for (var i = 0; i < a.length - 1; i++) {
            var n = a[i];
            if (n in o) {
                o = o[n];
            }
        }
        delete o[a[a.length - 1]];
    }

    // Get documents based on keys
    var getById = function (request, response) {
        var keyToGet = request.params.id;
        bucket.get(keyToGet, function (error, result) {
            var status = 200;
            var message = "";
            if (error) {
                if (error.code == couchbase.errors.keyNotFound)
                    status = 404;
                else
                    status = 500;
                message = error.message;
            }
            else {
                message = result.value;
            }
            response.json(status, message);
        });
    };

    var multiGetByIds = function (request, response) {
        var requestJson = request.body;
        var keysArray = requestJson.keysToGet;
        bucket.getMulti(keysArray, {}, function (error, results) {
            if (error) {
                console.log('Error on fetch: ' + error.message);
            }
            if (results) {
                var kvPairs = _.pairs(results);
                var resultsArray = new Array();
                var obj = {};
                for (key in kvPairs) {
                    if (kvPairs[key][1].value) {
                        obj[[
                            [kvPairs[key][0]]
                        ]] = kvPairs[key][1].value;
                        resultsArray.push(obj);
                        obj = {};
                    }
                }
                response.json(200, resultsArray);
                return;
            }
            response.json(500, util.inspect(error));
        });
    };

    // Modify Documents
    var runCommand = function (request, response) {
        var requestJson = request.body;
        var commandType = requestJson.commandType;
        var queryDetails = requestJson.queryDetails;
        var pathToModify = requestJson.pathToModify;
        var newValue = requestJson.newValue;
        var kvToUpsert = {};
        var status = 200;
        var message = 'There are errors with your input:';


        //Run validations
        var flag = 1;
        _.each(commandTypes, function (commandTypeFromEnum) {
            if (commandType == commandTypeFromEnum)
                flag = 0;
        });
        if (flag == 1) {
            status = 404;
            message += '\nCommand type is not found'
        }

        if (!newValue && commandType != commandTypes.removeProperty && flag == 0) {
            status = 404;
            message += '\nNo new value provided for the given command type'
        }

        if (!pathToModify) {
            status = 500;
            message += '\nPath to modify was not supplied';
        }

        if (status != 200) {
            response.send(status, message);
            return;
        }


        //Run the query which will provide the keys for the action
        runNickelQuery(queryDetails, 0, function (error, results) {
            if (error) {
                response.json(500, util.inspect(error));
            }
            else {
                _.each(results, function (result) {
                    var documentKey = result.docId;
                    kvToUpsert[documentKey] = { value: result };
                    delete kvToUpsert[documentKey].value.docId;
                    if (commandType == commandTypes.addProperty) {
                        if (getValueByPath(kvToUpsert[documentKey].value, pathToModify)) {
                            console.log('property already exists in key ' + documentKey);
                            delete kvToUpsert[documentKey];
                        }
                        else {
                            setValueByPath(kvToUpsert[documentKey].value, pathToModify, newValue);
                        }
                    }
                    else if (commandType == commandTypes.modifyProperty) {
                        setValueByPath(kvToUpsert[documentKey].value, pathToModify, newValue);
                    }
                    else if (commandType == commandTypes.removeProperty) {
                        deleteValueByPath(kvToUpsert[documentKey].value, pathToModify);
                    }
                });

                if (_.size(kvToUpsert) > 0)
                    bucket.setMulti(kvToUpsert, {persist_to: 1}, function (setError, setResult) {
                        if (setError) {
                            console.log('Error on Set: ' + setError.message);
                            response.json(500, setError);
                        }
                        else
                            response.json(setResult);
                    });
                else
                    response.send(204);
            }
        });
    };

    function runNickelQuery(query, getOnlyIds, callback) {
        var queryPredicates = getNickelCondition(query.predicates);
        var limit = query.limitRows;
        if (getOnlyIds == 1) {
            if (limit) {
                var queryCode =
                    'SELECT META().id AS docId, ' +
                    'META().cas AS casValue ' +
                    'FROM ' + bucket + ' ' +
                    'WHERE ' + queryPredicates + ' ' +
                    'LIMIT ' + limit;
            }
            else {
                var queryCode =
                    'SELECT META().id AS docId, ' +
                    'META().cas AS casValue ' +
                    'FROM ' + bucket + ' ' +
                    'WHERE ' + queryPredicates;
            }
        }
        else {
            if (limit) {
                var queryCode =
                    'SELECT META().id AS docId, ' +
                    'META().cas AS casValue,* ' +
                    'FROM ' + bucket + ' ' +
                    'WHERE ' + queryPredicates + ' ' +
                    'LIMIT ' + limit;
            }
            else {
                var queryCode =
                    'SELECT META().id AS docId, ' +
                    'META().cas AS casValue,* ' +
                    'FROM ' + bucket + ' ' +
                    'WHERE ' + queryPredicates;
            }
        }

        bucket.query(queryCode, function (error, result) {
            console.log('Executing N1QL: ' + queryCode);
            if (error) {
                console.log('N1QL - ' + error);
            }
            var parsedResult = util.inspect(result);
            callback(error, result);
        });
    }

    function getNickelCondition(node) {
        if (typeof node == 'object' && node.op != 'undefined' && node.param1 != 'undefined' && node.param2 != 'undefined')
            return " ( " + getNickelCondition(node.param1) + " " + node.op + " " + getNickelCondition(node.param2) + " ) ";
        else return node;
    }

    var runQuery = function (request, response) {
        var requestJson = request.body;
        runNickelQuery(requestJson, 0, function (error, result) {
            if (error) {
                response.json(500, util.inspect(error));
            }
            else {
                response.json(result);
            }
        });
    };


    function deleteDocs(request, response) {
        var requestJson = request.body;
        var keysArray = new Array();
        var state = 200;
        var message = '';
        runNickelQuery(requestJson, 1, function (error, results) {
            if (error) {
                state = 500;
                message = util.inspect(error);
                response.json(state, message);
            }
            else {
                _.each(results, function (result) {
                    keysArray.push(result.docId);
                });
                bucket.removeMulti(keysArray, {persist_to: 1}, function (error, results) {
                    if (error) {
                        message = util.inspect(error);
                        state = 500;
                        console.log('Error occured on delete: ' + error.message);
                        response.send(error);
                    }
                    else {
                        response.json(results);
                    }
                })
            }
            response.end();
        });
    }


    router.get('/', index);
    router.get('/docs/:id', getById);
    router.post('/docs', multiGetByIds);
    router.delete('/docs', deleteDocs);
    router.post('/docs/query', runQuery);
    router.post('/command', runCommand);

    return {
        router : router,
        getBucket : getBucket   
    }
}
