var $ = require('zepto-fix-issue');
var ejs = require('ejs');
var efte = require('efte');
var _ = require('underscore');

var DateSel = function(label, $container) {
    this.label = label;
    this.container = $container;

    this.container.addClass('no-icon-next').html('<span>' + label + '<b></b></span>');
    this.bBox = this.container.find('b');

    this.bindEvent();
};

var p = DateSel.prototype;

p.bindEvent = function() {
    var self = this;

    this.container.on('tap', function() {
        var dates = self.getValue();
        if (dates === null) {
            var now = new Date();
            dates = now.getFullYear() + "-" + parseInt(now.getMonth() + 1, 10) + "-" + now.getDate();
        }

        efte.datePicker("date", dates, function(date) {
            self.value = date;
            self.setValue(self.value);
        });
    });
};

p.setValue = function(value) {
    if (value === null) {
        this.bBox.html("请选择");
    } else {
        this.value = value;
    }
    this.bBox.html(this.value);
};

p.getValue = function() {
    return this.value;
};

p.offEvent = function() {
    this.container.off('tap');
};

module.exports = DateSel;