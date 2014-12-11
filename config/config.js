var fs = require('fs');

var configFile = JSON.parse(fs.readFileSync('./config.json'));

if(process.env.NODE_ENV === 'production') {
    return configFile.prod;
}

module.exports = configFile.dev;