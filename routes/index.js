var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  req.state.clusterUrl = "localhost:8091";
  req.state.bucketName = "default";
  req.state.bucketPassword = "";
  console.log(req.state);
  res.render('index', { title: 'Data Admin' });
});

module.exports = router;
