var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var couchbase = require('couchbase');
var auth = require('http-auth');

var app = express();

var routes = require('./routes/index');
var users = require('./routes/users');
var couchbaseAPI = require('./routes/couchbase');
var userAuth = require('./security/userAuth');

// DB Connection strings
var couchbaseURL = 'localhost:8091';
var couchbaseBucket = 'default';

var cluster = new couchbase.Cluster(couchbaseURL);
var bucket = cluster.openBucket(couchbaseBucket, function(error) {
    if (error) throw error;
});
bucket.operationTimeout = 10000;

userAuth.setBucket(bucket);
var basic = auth.basic({ realm: "Sizmek" }, userAuth.authenticateUser);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(auth.connect(basic));
app.use(express.static(path.join(__dirname, 'public')));

// Make the Couchbase client accessible to the router
app.use(function(req,res,next){
    req.bucket = bucket;
    next();
});
app.use('/', routes);
app.use('/users', users);
app.use('/couchbase', couchbaseAPI);

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
