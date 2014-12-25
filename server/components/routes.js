var auth = require('./auth'),
    couchbaseRoutes = require('./couchbase-routes'),
    helpers = require('./helpers');

module.exports = function(app, dbFactory, config) {

    couchbaseRoutes('/api/couchbase', app, dbFactory);

    app.get('/partials/*', function(req, res) {
        res.render('../../public/app/' + req.params[0]);
    });

    app.post('/login', auth.authenticate);

    app.post('/logout', function(req, res) {
        req.logout();
        res.end();
    });

    app.get('/api/encrypt/:msg', function(req, res) {
        res.json({encrypted : helpers.encrypt(req.param('msg'))});
    });

    app.get('*', function(req, res) {
        var _clusters = [];
        for(var i = 0; i < config.clusters.length; ++i) {
            var tmpCluster = { name : config.clusters[i].name, buckets : []};

            for(var j = 0; j < config.clusters[i].buckets.length; ++j) {
                tmpCluster.buckets.push( { name : config.clusters[i].buckets[j].name });
            }

            _clusters.push(tmpCluster);
        }
        res.render('index', {
            clusters: _clusters,
            bootstrapUser: req.user
        });
    });
};