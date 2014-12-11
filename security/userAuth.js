var bcrypt = require('bcrypt');
var util = require('util');
var q = require('q');

module.exports = function(couchbaseAPI) {
    var couchbase = couchbaseAPI;

    var findUser = function(userid) {
        var dfr = q.defer();

        var bucket = couchbase.getBucket();
        if(!bucket)
            dfr.reject("No bucket found");

        bucket.get('cb::manager::users', function (error, result) {
            if (error) {
                dfr.info(error);
                dfr.reject("Error finding Users document");
            }
            if (!result.value || !result.value[user]) {
                dfr.reject("No user found");
            }

            dfr.resolve(result.value[user]);
        });

        return dfr.promise;
    };

    //define API functions
    var authenticateUser = function (user, pass) {
        var dfr = q.defer();

        var bucket = couchbase.getBucket();
        if(!bucket) {
            dfr.reject("No bucket found");
        } else {
            bucket.get('cb::manager::users', function (error, result) {
                if (error) {
                    dfr.info(error);
                    dfr.reject("Error finding Users document");
                }
                if (!result.value || !result.value[user]) {
                    dfr.reject("No user found");
                }
                var password = result.value[user];
                bcrypt.compare(pass, password, function(err, valid) {
                    if(valid) {
                        dfr.resolve(user);
                    } else {
                        dfr.reject("Password mismatch");
                    }
                });
            });
        }

        return dfr.promise;
    };

    var generateUser = function (username, password, callback) {
        bcrypt.hash(password, 10, function(error, result) {
            if(error)
                return callback(error, null);

            var data = {};
            data[username] = result;
            return callback(null, data);
        });
    }

    return {
        authenticateUser : authenticateUser,
        generateUser : generateUser,
        findUser : findUser
    };
}


