(function() {
    'use strict';

    angular.module('cacApp').controller('cacCouchbaseCtrl', ['$scope', cacCouchbaseCtrl]);

    function cacCouchbaseCtrl($scope) {
        $scope.cacActionType = "add";
        $scope.cacDryRun = true;

        $scope.showPropertyCustom = function() {
            return $scope.cacActionType == 'change-custom';
        };
    }

})();