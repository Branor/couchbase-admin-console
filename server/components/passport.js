var helpers = require('./helpers'),
    passport = require('passport'),
    localStrategy = require('passport-local').Strategy;

module.exports = function(config) {
    function getUserObj(username) {
        var usernameParts = username.split('|');
        if(usernameParts.length != 3) {
            throw "Username parameter is wrong";
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

            var cluster = config.clusters[userObj.clusterName];
            if(!cluster) return done("No cluster found");
            if(!cluster.credentials) return done("No credentials are configured for this cluster");

            var user = false;
            if(userObj.username == cluster.credentials.username && helpers.compare(cluster.credentials.password, password)) {
                user = userObj;
            }

            return done(null, user);
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

        var cluster = config.clusters[userObj.clusterName];
        if(!cluster) return done("No cluster found");
        if(!cluster.credentials) return done("No credentials are configured for this cluster");

        var user = false;
        if(userObj.username == cluster.credentials.username) {
            user = userObj;
        }
        return done(null, user);
    });
};