var _ = require('underscore');

module.exports = function(baseUrl, app, dbFactory) {

    var getDb = function(request) {
        return new dbFactory.db(request.session.userObj.clusterName, request.session.userObj.bucketName);
    };

    var getById = function (request, response) {
        var keyToGet = request.params.id;
        var db = getDb(request);
        db.getById(keyToGet, function (error, result) {
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
        var db = getDb(request);
        var keysArray = request.body.keysToGet;
        db.getMulti(keysArray, {}, function (error, results) {
            if (error) {
                var msg = 'Error on fetch: ' + error.message;
                console.log(msg);
                response.json(500, {message: msg});
                return;
            }
            if(!results) {
                var msg = "Unknown error has occurred";
                console.log(msg);
                response.json(500, {message: msg});
                return;
            } else {
                var kvPairs = _.pairs(results);
                var resultsArray = [];
                for (key in kvPairs) {
                    if (kvPairs[key][1].value) {
                        var obj = {};
                        obj[kvPairs[key][0]] = kvPairs[key][1].value;
                        resultsArray.push(obj);
                    }
                }
                response.json(200, resultsArray);
                return;
            }
        });
    };

    var deleteDocs = function(request, response) {
        var db = getDb(request);
        var keysArray = [];
        var state = 200;
        var message = '';
        db.runNickelQuery(request.body, 1, function (error, results) {
            if (error) {
                state = 500;
                message = util.inspect(error);
                response.json(state, message);
            } else {
                _.each(results, function (result) {
                    keysArray.push(result.docId);
                });
                db.removeMulti(keysArray, {persist_to: 1}, function (error, results) {
                    if (error) {
                        message = util.inspect(error);
                        state = 500;
                        console.log('Error occured on delete: ' + error.message);
                        response.send(error);
                    } else {
                        response.json(results);
                    }
                })
            }
            response.end();
        });
    };

    var runQuery = function (request, response) {
        var db = getDb(request);
        console.log("runQuery", request.session);
        db.runCommand(request.body.predicate,
                      request.body.propName,
                      request.body.propVal,
                      request.body.queryType,
                      request.body.dryRun,
                        function (error, result) {
                            if (error) {
                                response.json(500, util.inspect(error));
                            } else {
                                response.json(result);
                            }
                        });
    };

    var runCommand = function (request, response) {
        var db = getDb(request);
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
        db.runNickelQuery(queryDetails, 0, function (error, results) {
            if (error) {
                response.json(500, util.inspect(error));
            } else {
                _.each(results, function (result) {
                    var documentKey = result.docId;
                    kvToUpsert[documentKey] = { value: result };
                    delete kvToUpsert[documentKey].value.docId;
                    if (commandType == commandTypes.addProperty) {
                        if (db.getValueByPath(kvToUpsert[documentKey].value, pathToModify)) {
                            console.log('property already exists in key ' + documentKey);
                            delete kvToUpsert[documentKey];
                        }
                        else {
                            db.setValueByPath(kvToUpsert[documentKey].value, pathToModify, newValue);
                        }
                    }
                    else if (commandType == commandTypes.modifyProperty) {
                        db.setValueByPath(kvToUpsert[documentKey].value, pathToModify, newValue);
                    }
                    else if (commandType == commandTypes.removeProperty) {
                        db.deleteValueByPath(kvToUpsert[documentKey].value, pathToModify);
                    }
                });

                if (_.size(kvToUpsert) > 0)
                    db.setMulti(kvToUpsert, {persist_to: 1}, function (setError, setResult) {
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

    app.get(baseUrl + '/docs/:id', getById);
    app.post(baseUrl + '/docs', multiGetByIds);
    app.delete(baseUrl + '/docs', deleteDocs);
    app.post(baseUrl + '/docs/query', runQuery);
    app.post(baseUrl + '/command', runCommand);

    return app;
};