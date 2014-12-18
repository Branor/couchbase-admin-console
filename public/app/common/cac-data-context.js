(function() {
    'use strict';

    angular.module('cacApp').factory('cacDataContext', ['$http', '$q', cacDataContext]);

    function cacDataContext($http, $q) {
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
                    console.log("ERROR", data.data.error);
                    dfr.reject(data.data);
                });

            return dfr.promise;
        };

        return {
            runQuery : runQuery
        };
    };
})();