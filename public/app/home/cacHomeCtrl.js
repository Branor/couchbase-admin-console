(function() {
    angular.module('cacApp').controller('cacHomeCtrl', ['$scope', cacHomeCtrl]);

    function cacHomeCtrl($scope) {
        $scope.clusters = window.cac_clusters_list;
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

        $scope.go = function() {
            console.log($scope.chosenCluster.url, $scope.chosenBucket.name, $scope.chosenBucket.password);
        };
    }
})();