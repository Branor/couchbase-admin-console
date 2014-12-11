#!/usr/bin/env node
var debug = require('debug')('CouchbaseAdminConsole');
var fs = require('fs');
var https = require('https');
var app = require('./app');

var options = {
    key: fs.readFileSync('./security/privatekey.pem'),
    cert: fs.readFileSync('./security/certificate.pem')
};

app.set('port', process.env.PORT || 3000);

var server = https.createServer(options,app).listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port);
});
