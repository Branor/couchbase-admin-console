var passport = require('passport'),
    localStrategy = require('passport-local').Strategy;

module.exports = function(dbFactory) {
    function getUserObj(username) {
        var usernameParts = username.split('|');
        if(usernameParts.length != 3) {
            return ("Username parameter is wrong", null);
        }

        return {
            clusterName : usernameParts[0],
            bucketName : usernameParts[1],
            username : usernameParts[2]
        };
    }

    passport.use(new localStrategy({passReqToCallback: true},
        function(req, username, password, done) {
            var userObj = getUserObj(username);
            var db = new dbFactory.db(userObj.clusterName, userObj.bucketName);
            db.authenticate(userObj.username, password).then(
                function(user) {
                    if(user) return done(null, userObj);
                    else return done(null, false);
                },
                function(err) {
                    return done(err);
                }
            );
        }
    ));

    passport.serializeUser(function(userObj, done) {
        if(userObj) {
            return done(null, userObj.clusterName + "|" + userObj.bucketName + "|" + userObj.username);
        }
        done('No User');
    });

    passport.deserializeUser(function(username, done) {
        var userObj = getUserObj(username);
        var db = new dbFactory.db(userObj.clusterName, userObj.bucketName);
        db.findUser(userObj.username).then(
            function(user) {
                if(user) return done(null, userObj);
                else return done(null, false);
            },
            function(err) {
                return done(err);
            }
        );
    });
};