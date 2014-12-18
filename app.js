var couchbase = require('couchbase');

var cluster = new couchbase.Cluster("localhost:8091");

var bucket = cluster.openBucket("default");
bucket.enableN1ql("localhost:8093");

bucket.query(couchbase.N1qlQuery.fromString("SELECT META().id as docId FROM default WHERE META().id LIKE 'pymc%'"), function(err, results) {
    if(err) return console.log(err);
    for(var i = 0; i < results.length; i++) bucket.remove(results[i].docId, console.log);
    process.exit(0);
})