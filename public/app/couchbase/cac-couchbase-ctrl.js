(function() {
    'use strict';

    angular.module('cacApp').controller('cacCouchbaseCtrl', ['$scope', '$location', '$timeout', 'cacIdentity', cacCouchbaseCtrl]);

    function cacCouchbaseCtrl($scope, $location, $timeout, cacIdentity) {
        if(!cacIdentity.isAuthenticated()) {
            //$location.path('/');
        }

        $scope.cacActionType = "add";
        $scope.cacDryRun = true;
        $scope.dataSubmit = false;

        $scope.showPropertyCustom = function() {
            return $scope.cacActionType == 'change-custom';
        };

        $scope.submit = function() {
            $scope.dataSubmit = true;
            $timeout(function() {
                var options = { keyboard : false };
                $('#resultsWindow').modal(options);
                $scope.dataSubmit = false;
            }, 3000);
        };
    }

})();