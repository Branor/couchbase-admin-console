var bcrypt = require('bcrypt');
var util = require('util');

var bucket;
module.exports.setBucket = function (couchbaseBucket) {
    bucket = couchbaseBucket;
};

//define API functions
var authenticateUser = function (user, pass, callback) {
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

module.exports.authenticateUser = authenticateUser;
module.exports.generateUser = generateUser;
