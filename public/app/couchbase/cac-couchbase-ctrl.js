(function() {
    'use strict';

    angular.module('cacApp').controller('cacCouchbaseCtrl', ['$scope', '$location', 'cacDataContext', 'cacIdentity', cacCouchbaseCtrl]);

    function cacCouchbaseCtrl($scope, $location, cacDataContext, cacIdentity) {
        if(!cacIdentity.isAuthenticated()) {
            $location.path('/');
        }

        $scope.cacQuery = "";
        $scope.cacPropertyName = "";
        $scope.cacPropertyValue = "";
        $scope.cacPropertyCustom = "";
        $scope.cacActionType = "add";
        $scope.cacDryRun = true;
        $scope.dataSubmit = false;
        $scope.identity = cacIdentity;
        $scope.showPropertyCustom = function() {
            return $scope.cacActionType == 'change-custom';
        };

        $scope.submit = function() {
            $scope.dataSubmit = true;
            cacDataContext.runQuery($scope.cacQuery,
                                    $scope.cacPropertyName,
                                    $scope.showPropertyCustom() ? $scope.cacPropertyCustom : $scope.cacPropertyValue,
                                    $scope.cacActionType,
                                    $scope.cacDryRun)
                .then(function(results) {
                    $scope.queryResults = results;
                }).catch(function(err) {
                    $scope.queryResults = err;
                }).finally(function() {
                    $('#resultsWindow').modal({ keyboard : false });
                    $scope.dataSubmit = false;
                });
        };
    }

})();