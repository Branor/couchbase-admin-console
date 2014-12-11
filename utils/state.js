module.exports = function(application) {
    var app = application;
    var session = app.session;

    var getClusterUrl = function () {
        if(!session)
            return null;
        console.log(app, session);
        return session.clusterUrl;
    }

    var getBucketName = function () {
        if(!session)
            return null;

        return session.bucketName;
    }

    var getBucketPassword = function () {
        if(!session)
            return null;

        return session.bucketPassword;
    }

    return {
        getClusterUrl : getClusterUrl,
        getBucketName : getBucketName,
        getBucketPassword : getBucketPassword    
    }
}
