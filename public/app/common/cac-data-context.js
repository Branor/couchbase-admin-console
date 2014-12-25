(function() {
    'use strict';

    angular.module('cacApp').factory('cacDataContext', ['$http', '$q', '$location', cacDataContext]);

    function cacDataContext($http, $q, $location) {
        var runQuery = function(predicate, propName, propVal, queryType, dryRun) {
            var dfr = $q.defer();

            $http.post('api/couchbase/docs/query',
                        {
                            predicate: predicate,
                            propName: propName,
                            propVal : propVal,
                            queryType : queryType,
                            dryRun : dryRun
                        })
                .then(function(data) {
                    dfr.resolve(data.data);
                }).catch(function(data) {
                    if(data.status == 403) {
                        return $location.path("/");
                    }
                    console.log("ERROR", data.data.error);
                    dfr.reject(data.data);
                });

            return dfr.promise;
        };

        var encrypt = function(msg) {
            var dfr = $q.defer();

            $http.get('/api/encrypt/' + msg)
                .then(function(data) {
                    dfr.resolve(data.data.encrypted);
                }).catch(function(err) {
                    console.log(err);
                    dfr.reject(err);
                });

            return dfr.promise;
        };

        return {
            runQuery : runQuery,
            encrypt : encrypt
        };
    };
})();