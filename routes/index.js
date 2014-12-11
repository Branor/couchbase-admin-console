var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  req.session.clusterUrl = "localhost:8091";
  req.session.bucketName = "default";
  req.session.bucketPassword = "";
  console.log(req.session);
  res.render('index', { title: 'Data Admin' });
});

module.exports = router;
