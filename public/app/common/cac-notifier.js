(function() {
    'use strict';

    angular.module('cacApp').value('cacToastr', toastr);

    angular.module('cacApp').factory('cacNotifier', ['cacToastr', cacNotifier]);

    function cacNotifier(cacToastr) {
        cacToastr.options = {
            "closeButton": true,
            "debug": false,
            "progressBar": true,
            "positionClass": "toast-bottom-right",
            "onclick": null,
            "showDuration": "300",
            "hideDuration": "1000",
            "timeOut": "5000",
            "extendedTimeOut": "1000",
            "showEasing": "swing",
            "hideEasing": "linear",
            "showMethod": "slideDown",
            "hideMethod": "slideUp"
        }

        return {
            success : function(msg, consoleMsg) {
                console.log(msg, consoleMsg);
                cacToastr.success(msg);
            },
            info : function(msg, consoleMsg) {
                console.log(msg, consoleMsg);
                cacToastr.info(msg)
            },
            error : function(msg, consoleMsg) {
                console.log(msg, consoleMsg);
                cacToastr.error(msg)
            },
            warning: function(msg, consoleMsg) {
                console.log(msg, consoleMsg);
                cacToastr.warning(msg)
            }
        }
    }
})();