(function() {
    'use strict';

    var app = angular.module('cacApp', ['ngResource', 'ngRoute', 'ngAnimate']);

    app.config(function($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true);

        $routeProvider
            .when('/', {
                templateUrl: '/partials/home/home-tpl',
                controller: 'cacHomeCtrl'
            })
            .when('/help', {
                templateUrl: '/partials/help/help-tpl',
                controller: 'cacHelpCtrl'
            })
            .when('/couchbase', {
                templateUrl: '/partials/couchbase/couchbase-tpl',
                controller: 'cacCouchbaseCtrl'
            })
            .otherwise('/');
        ;
    });
})();