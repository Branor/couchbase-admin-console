var bcrypt = require('bcrypt');
var util = require('util');

module.exports = function(couchbaseAPI) {
    var couchbase = couchbaseAPI;

    //define API functions
    var authenticateUser = function (user, pass, callback) {
        var bucket = couchbase.getBucket();
        if(!bucket)
            return callback(false);

        bucket.get('cb::manager::users', function (error, result) {
            if (error)
                return callback(false);
            if (!result.value || !result.value[user])
                return callback(false);
            var password = result.value[user];
            bcrypt.compare(pass, password, function(err, valid) {
                callback(valid);
            });
        });
    }

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
        generateUser : generateUser    
    }
}


