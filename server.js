var express = require('express');
var https = require('https');

var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';
var app = express();

var config = require('./server/components/config')[env];
var dbFactory = require('./server/components/couchbase')(config);

require('./server/components/passport')(dbFactory);
require('./server/components/express')(app, config);
require('./server/components/routes')(app, dbFactory, config);

var server = https.createServer(config.certificateOptions, app).listen(config.port, function() {
    console.log('Express server listening on port ' + server.address().port);
});