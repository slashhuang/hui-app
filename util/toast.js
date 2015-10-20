var isInit = false;
var $ = require('zepto-fix-issue');


module.exports = {
    show: function(text, showMask) {
        if (!isInit) {
            this._init();
        }

        if (showMask) {
            this.mask.show();
        }        
        this.toast.text(text || '加载中...').show()
    },

    hide: function() {
        this.mask.hide();
        this.toast.hide();
    },

    _init: function() {
        this.mask = $('<div class="mask" style="display: none"></div>').appendTo(document.body);
        this.toast = $('<div class="toast"></div>').appendTo(document.body);
    }
}