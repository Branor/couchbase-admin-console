var bcrypt = require('bcrypt');
var util = require('util');
var q = require('q');

module.exports = function() {

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
        generateUser : generateUser
    };
}


