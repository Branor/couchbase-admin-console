var path = require('path'),
    fs = require('fs');

var rootPath = path.normalize(__dirname + "/../../");
var clusters = JSON.parse(fs.readFileSync(rootPath + "config.json"));
var certificateOptions = {
    key: fs.readFileSync(rootPath + '/security/privatekey.pem'),
    cert: fs.readFileSync(rootPath + '/security/certificate.pem')
};

module.exports = {
    development : {
        rootPath : rootPath,
        port : process.env.PORT || 3000,
        clusters : clusters,
        certificateOptions : certificateOptions,
        maxProcessingParallelism : 100,
        maxDocumentUpdateRetries : 100,
        customStackTraceFile : rootPath + 'vm.log'
    },
    production : {
        rootPath : rootPath,
        port : process.env.PORT || 80,
        clusters : clusters,
        certificateOptions : certificateOptions,
        maxProcessingParallelism : 100,
        maxDocumentUpdateRetries : 100,
        customStackTraceFile : rootPath + 'vm.log'
    }
};