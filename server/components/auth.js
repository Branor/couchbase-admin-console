var passport = require('passport');

function authenticate(req, res, next) {
    var auth = passport.authenticate('local', function(err, user) {
        if(err) return next(err);
        else {
            if(!user) res.send({ success : false });
            else {
                req.logIn(user, function(err) {
                    if(err) { return next(err); }
                    req.session.userObj = user;
                    req.session.cookie.maxAge = 1000 * 60 * 10; // set max age for authentication cookie - 10 minutes
                    res.send({ success : true, user : user});
                });
            }
        }
    });

    auth(req, res, next);
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
    requiresApiAuth : requiresApiAuth
};