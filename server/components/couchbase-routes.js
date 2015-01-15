var _ = require('underscore'),
    auth = require('./auth');

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
        db.runCommand(request.body.predicate,
                      request.body.propName,
                      request.body.propVal,
                      request.body.queryType,
                      request.body.dryRun,
                        function (error, counters) {
                            if (error) {
                                console.log("runQuery Error", error);
                                response.status(500).json({error: error.toString(), counters: counters});
                            } else {
                                response.status(200).json({counters: counters});
                            }
                        });
    };

    app.get(baseUrl + '/docs/:id', getById);
    app.post(baseUrl + '/docs', multiGetByIds);
    app.delete(baseUrl + '/docs', deleteDocs);
    app.post(baseUrl + '/docs/query', auth.requiresApiAuth(), runQuery);

    return app;
};