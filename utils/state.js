module.exports = function(getSession) {

    var getClusterUrl = function () {
        var session = getSession();
        if(!session)
            return null;
        console.log(app, session);
        return session.clusterUrl;
    }

    var getBucketName = function () {
        var session = getSession();
        if(!session)
            return null;

        return session.bucketName;
    }

    var getBucketPassword = function () {
        var session = getSession();
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
