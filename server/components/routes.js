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
        var _clusters = {};
        for(var clusterCode in config.clusters) {
            _clusters[clusterCode] = {
                name: config.clusters[clusterCode].name,
                buckets: []
            };

            for(var i = 0; i < config.clusters[clusterCode].buckets.length; ++i) {
                _clusters[clusterCode].buckets.push( { name : config.clusters[clusterCode].buckets[i].name });
            }
        }
        res.render('index', {
            clusters: _clusters,
            bootstrapUser: req.user
        });
    });
};