(function() {
    angular.module('cacApp').controller('cacHomeCtrl', ['$scope', '$window', '$location', 'cacAuth', 'cacNotifier', 'cacDataContext', cacHomeCtrl]);

    function cacHomeCtrl($scope, $window, $location, cacAuth, cacNotifier, cacDataContext) {
        $scope.clusters = undefined;
        if(!!$window.cac_clusters_list) {
            $scope.clusters = $window.cac_clusters_list;
        }
        $scope.buckets = null;

        $scope.chosenCluster = null;
        $scope.chosenClusterKey = null;
        $scope.chosenBucket = null;

        $scope.chooseCluster = function(clusterKey) {
            $scope.chosenClusterKey = clusterKey;
            $scope.chosenCluster = $scope.clusters[$scope.chosenClusterKey];
            $scope.buckets = $scope.chosenCluster.buckets;
        };

        $scope.chooseBucket = function(bucket) {
            $scope.chosenBucket = bucket;
        };

        $scope.signin = function() {
            var compositeUsername = $scope.chosenClusterKey + "|" + $scope.chosenBucket.name + "|" + $scope.username;
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