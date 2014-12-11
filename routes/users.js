var bcrypt = require('bcrypt');
var util = require('util');
var express = require('express');
var userAuth = require('../security/userAuth');
var router = express.Router();

var generateUser = function (request, response) {
    var username = request.body.username;
    var password = request.body.password;

    userAuth.generateUser(username, password, function(error, result) {
        if(error)
            return response.json(500, util.inspect(error));
        
        response.status(200).json(result);
    });
}

/* GET users listing. */
router.get('/', function(req, res) {
	var bucket = req.bucket;
  	res.send('Nothing to see here, move along...');
});

router.post('/generate', generateUser);
module.exports = router;