(function() {
    'use strict';

    angular.module('cacApp').controller('cacCouchbaseCtrl', ['$scope', '$location', 'cacIdentity', cacCouchbaseCtrl]);

    function cacCouchbaseCtrl($scope, $location, cacIdentity) {
        if(!cacIdentity.isAuthenticated()) {
            $location.path('/');
        }

        $scope.cacActionType = "add";
        $scope.cacDryRun = true;

        $scope.showPropertyCustom = function() {
            return $scope.cacActionType == 'change-custom';
        };
    }

})();