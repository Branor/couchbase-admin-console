var express = require('express');
var router = express.Router();

module.exports = function(config) {

  router.get('/', function(req, res) {
    req.session.clusterUrl = "localhost:8091";
    req.session.bucketName = "default";
    req.session.bucketPassword = "";
    console.log(req.session);
    res.render('index', { title: 'Data Admin', clusters : JSON.stringify(config.clusters) });
  });

  return router;
};
