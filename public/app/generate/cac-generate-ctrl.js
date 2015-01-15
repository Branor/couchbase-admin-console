(function() {
    angular.module('cacApp').controller('cacGenerateCtrl', ['$scope', 'cacDataContext', cacGenerateCtrl]);

    function cacGenerateCtrl($scope, cacDataContext) {
        $scope.encrypt = function() {
            $scope.newStub = "Generating...";
            cacDataContext.encrypt($scope.newPassword).then(function(encryptedPass) {
                $scope.newStub = '"credentials": { "username": "' + $scope.newUsername + '", "password": "' + encryptedPass + '" }';
            });
        };
    }

})();