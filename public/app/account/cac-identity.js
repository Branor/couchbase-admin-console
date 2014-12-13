(function() {
    'use strict';

    angular.module('cacApp').factory('cacIdentity', ['$window', '$location', cacIdentity]);

    function cacIdentity($window, $location) {
        var currentUser = undefined;

        if(!!$window.cac_bootstrap_user) {
            currentUser = $window.cac_bootstrap_user;
            $location.path("/couchbase");
        }

        return {
            currentUser : currentUser,
            isAuthenticated : function() {
                return !!this.currentUser;
            }
        };
    }
})();