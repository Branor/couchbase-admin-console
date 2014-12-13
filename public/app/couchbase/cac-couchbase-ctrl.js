(function() {
    'use strict';

    angular.module('cacApp').controller('cacCouchbaseCtrl', ['$scope', cacCouchbaseCtrl]);

    function cacCouchbaseCtrl($scope) {
        $scope.msg = 'Hello from Couchbase Ctrl';
    }

})();