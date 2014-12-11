var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var auth = require('http-auth');
var config = require('./config/config');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var app = express();

var routes = require('./routes/index')(config);
var users = require('./routes/users');
var couchbaseAPI = require('./routes/couchbase')();
var userAuth = require('./security/userAuth')();

passport.use(new LocalStrategy(
    function(username, password, done) {
        couchbase.authenticateUser(cluster, bucket, bucketpass, username, password)
            .then(function(user) {
                return done(null, user);
            }).catch(function(err) {
                return done(err, null);
            });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(id, done) {
    userAuth.findUser(id)
        .then(function(user) {
            done(null, user);
        }).catch(function(err) {
            done(err, null);
        });
});

app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'sizmek',
  resave: false,
  saveUninitialized: true
}));

// Session-persisted message middleware
app.use(function(req, res, next){
    var err = req.session.error,
        msg = req.session.notice,
        success = req.session.success;

    delete req.session.error;
    delete req.session.success;
    delete req.session.notice;

    if (err) res.locals.error = err;
    if (msg) res.locals.notice = msg;
    if (success) res.locals.success = success;

    next();
});

var authMiddleware = function (req, res, next) {
    console.log("authMiddleware");
    if (req.isAuthenticated()) { return next(); }
    req.session.error = 'Please sign in!';
    res.redirect('/');
};

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err || !user) {
            if(err) req.session.error = err;
            else req.session.error = "No user found";
            return res.redirect('/');
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            req.session.clusterUrl = req.param('clusterUrl');
            req.session.bucketName = req.param('bucketName');
            return res.redirect('/couchbase');
        });
    })(req, res, next);
});
app.use('/users', users);
app.use('/couchbase', authMiddleware, couchbaseAPI.router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
