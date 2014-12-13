(function() {
    'use strict';

    function cacNavBarCtrl($scope, $location, cacAuth, cacNotifier, cacIdentity) {
        $scope.identity = cacIdentity;

        $scope.signout = function() {
            cacAuth.logout().then(
                function() {
                    $scope.username = "";
                    $scope.password = "";
                    cacNotifier.success("Goodbye...");
                    $location.path("/");
                },
                function(err) {
                    cacNotifier.error("Error connecting to the server. Please refresh and try again.", err);
                }
            );
        };
    }

    angular.module('cacApp').controller('cacNavBarCtrl', ['$scope', '$location', 'cacAuth', 'cacNotifier', 'cacIdentity', cacNavBarCtrl]);
})();