(function() {
    'use strict';

    function cacAuth($q, $http, cacIdentity) {
        function authenticate(username, password) {
            var defer = $q.defer();

            $http.post('/login', {username : username, password : password}).then(
                function(response) {
                    if(response.data.success) {
                        var user = response.data.user;
                        cacIdentity.currentUser = user;
                        defer.resolve(response.data.user.username);
                    } else {
                        defer.resolve(false);
                    }
                },
                function(err) {
                    defer.reject(err);
                }
            );

            return defer.promise;
        }


        function logout() {
            var defer = $q.defer();

            $http.post('/logout', {logout : true}).then(
                function() {
                    cacIdentity.currentUser = undefined;
                    defer.resolve();
                },
                function(err) {
                    defer.reject(err);
                }
            );

            return defer.promise;
        }

        return {
            authenticate : authenticate,
            logout : logout
        }
    }

    angular.module('cacApp').factory('cacAuth', ['$q', '$http', 'cacIdentity', cacAuth]);

})();