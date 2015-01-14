var https = require('https'),
    cluster = require('cluster');

var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (cluster.isMaster) {
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
} else {
    var express = require('express');
    var app = express();

    var config = require('./server/components/config')[env];
    var dbFactory = require('./server/components/couchbase')(config);

    require('./server/components/passport')(config);
    require('./server/components/express')(app, config);
    require('./server/components/routes')(app, dbFactory, config);

    var server = https.createServer(config.certificateOptions, app).listen(config.port, function() {
        console.log('Express server listening on port ' + server.address().port);
    });
}


