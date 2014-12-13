(function() {
    angular.module('cacApp').controller('cacHomeCtrl', ['$scope', '$window', '$location', 'cacAuth', 'cacNotifier', cacHomeCtrl]);

    function cacHomeCtrl($scope, $window, $location, cacAuth, cacNotifier) {
        $scope.clusters = undefined;
        if(!!$window.cac_clusters_list) {
            $scope.clusters = $window.cac_clusters_list;
        }
        $scope.buckets = null;

        $scope.chosenCluster = null;
        $scope.chosenBucket = null;

        $scope.chooseCluster = function(cluster) {
            $scope.chosenCluster = cluster;
            $scope.buckets = cluster.buckets;
        };

        $scope.chooseBucket = function(bucket) {
            $scope.chosenBucket = bucket;
        };

        $scope.signin = function() {
            var compositeUsername = $scope.chosenCluster.name + "|" + $scope.chosenBucket.name + "|" + $scope.username;
                cacAuth.authenticate(compositeUsername, $scope.password).then(
                function(username) {
                    if(username) {
                        cacNotifier.success("You've successfully logged in as " + username);
                        $location.path("/couchbase");
                    } else {
                        cacNotifier.error("Login failed. Please check username and password.");
                    }
                },
                function(err) {
                    cacNotifier.error("Error connecting to the server. Please refresh the page and try again.", err);
                }
            );
        };
    }
})();