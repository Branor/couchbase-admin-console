var passport = require('passport');

function authenticate(req, res, next) {
    var auth = passport.authenticate('local', function(err, user) {
        if(err) return next(err);
        else {
            if(!user) res.send({ success : false });
            else {
                req.logIn(user, function(err) {
                    if(err) { return next(err); }
                    res.send({ success : true, user : user});
                });
            }
        }
    });

    auth(req, res, next);
};


function requiresApiRole(role) {
    return function(req, res, next) {
        if(req.isAuthenticated() && req.user.data && req.user.data.roles && req.user.data.roles.indexOf(role) > -1) {
            next();
        } else {
            res.status(403);
            res.end();
        }
    }
}

function requiresApiAuth() {
    return function(req, res, next) {
        if(req.isAuthenticated()) {
            next();
        } else {
            res.status(403);
            res.end();
        }
    }
}

module.exports = {
    authenticate : authenticate,
    requiresApiRole : requiresApiRole,
    requiresApiAuth : requiresApiAuth
};