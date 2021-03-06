'use strict';
var efte = require('efte');
var env = require('../lib/env');
var $ = require('zepto-fix-issue');
var nut = require('nut-hui');
var util = require('../lib/util');
var validator = require("../util/validator");
var _ = require('underscore');
var moment = require('moment');
var backAction = util.backAction;


var dftTimePeriod = {
    dayRange: [],
    timeRange: []
};

var timeOpt = [];
for (var i = 0; i <= 23; i++) {
    ['00', '15', '30', '45'].forEach(function(j){
        var t = (i < 10 ? '0' + i : i) + ':' + j;
        timeOpt.push({
            text: t,
            value: t
        });
    });
}
// timeOpt.shift();
// timeOpt.push({
//     text: '24:00',
//     value: '24:00'
// });
// var nextTimeOpt = timeOpt.map(function(time){
//     return {
//         text: '次日' + time.text,
//         value: time.value == "00:00" ? "24:00" : time.value
//     }
// });

var nextTimeOpt = timeOpt.concat({
            text: '24:00',
            value: '24:00'
        });
nextTimeOpt.shift();
var timeRange = timeOpt.map(function(time, i){
    return _.extend({}, time, {
        children: nextTimeOpt
    });
});

var weekday = [{
    text: '周一',
    value: 2
}, {
    text: '周二',
    value: 3
}, {
    text: '周三',
    value: 4
}, {
    text: '周四',
    value: 5
}, {
    text: '周五',
    value: 6
}, {
    text: '周六',
    value: 7
}, {
    text: '周日',
    value: 1
}];

var nextWeekday = weekday.map(function(d){
    return {
        text: '第二周' + d.text,
        value: d.value
    };
});

var weekdayRange = weekday.map(function(d, i){
    return {
        text: d.text,
        value: d.value,
        children: weekday.slice(i).concat(nextWeekday.slice(0, i))
    }
});

module.exports = {
    init: function() {
        var self = this;
        this.models =[];
        efte.action.get(function(query) {
            self.topic = query.topic;
            efte.setTitle(query.title || '时间区间');
            self.timePeriods = self.genShowData(query.data);
            self.readOnly = query.readOnly;
            self.outdated = query.data.length > 1;
            if (self.timePeriods.length === 0) {
                self.addTimePeriod();
            } else {
                self.timePeriods.forEach(function(it, i) {
                    self.addTimePeriod(it);
                });
            }
            !self.readOnly && self.setButtons();
        });
    },
    addTimePeriod: function(timePeriod) {
        timePeriod = _.extend({}, dftTimePeriod, timePeriod);
        var self = this;
        var i = this.models.length;
        var container = $('<div class="group-container"></div>').appendTo('body');
        var model = new(nut.property.Composite.extend({
            mapping: {
                dayRange: nut.control.MultipleLevelSelect.extend({
                    label: '日期范围',
                    options: weekdayRange,
                    required: true,
                    setValue: function(values){
                        if (values.length === 1) {
                            values.push(values[0]);
                        }
                        this.values = values || [];
                        var text = [];
                        var days = weekdayRange;
                        this.values.forEach(function(v){
                            days.some(function(day){
                                if (day.value == v) {
                                    text.push(day.text);
                                    days = day.children;
                                    return true;
                                }
                            });
                        });
                        var str = '未设置';
                        if (values.length === 2) {
                            str = values[0] == values[1] ? text[0] : text.join('至');
                        }
                        this.b.text(str);
                    }
                }),
                timeRange: nut.control.MultipleLevelSelect.extend(function(){
                    this.addValidator(function(value){
                        if (value.length === 1) {
                            return '请填写完整';
                        }
                    });
                }, {
                    label: '时间范围',
                    options: timeRange,
                    required: true,
                    setValue: function(values){
                        this.values = values || [];
                        var text = [];
                        var time = timeRange;
                        this.values.forEach(function(v){
                            time.some(function(t){
                                if (t.value === v) {
                                    text.push(t.text);
                                    time = t.children;
                                    return true;
                                }
                            });
                        });
                        if (text.length === 1) {
                            text.push('<span style="color:red"> ？</span>');
                        }
                        this.b.html(text.join('至') || '未设置');
                    }
                }),
                deleteTimePeriod: nut.control.AbstractLink.extend(
                function(){
                    this.el.addClass('no-icon-next text-center');
                }, {
                    label: '删除本时段',
                    onTap: function(){
                        if (!window.confirm('确认删除此时段吗？')) return;
                        self.deleteTimePeriod(model);
                    },
                    setValue: function(){},
                    getValue: function(){}
                })
            }
        }));
        this.models.push(model);
        model.container = container;
        nut.generate(this.models[i], [{
            title: '时间段',
            children: ['dayRange', 'timeRange'].concat(this.readOnly || i === 0 ? [] : 'deleteTimePeriod')
        }], container);
        model.value(timePeriod);
        model.forEach(function(control, name) {
            if (name === 'deleteTimePeriod') {
                control[self.readOnly ? 'disable' : 'enable']();
            } else {
                control[(self.readOnly || self.outdated) ? 'disable' : 'enable']();
            }
        });
    },
    deleteTimePeriod: function(model) {
        var index = this.models.indexOf(model);
        if (index < 0) return;
        model.container.remove();
        this.models.splice(index, 1);
        if (this.models.length === 1 && this.outdated) {
            this.outdated = false;
            if (!this.readOnly) {
                this.models[0].forEach(function(control){
                    control.enable();
                });
            }
        }
    },
    genShowData: function(data) {
        return data.map(function(period){
            return {
                dayRange: _.compact([period.beginDay, period.endDay]),
                timeRange: _.compact([period.beginTime, period.endTime])
            };
        });
    },
    genAjaxData: function() { // sum(timeInterval * repeat)
        var self = this;
        var timePeriods = [];
        debugger
        for (var j = 0; j < self.models.length; j++) {
            var thisData = self.models[j].value();
            timePeriods.push({
                beginDay: thisData.dayRange[0],
                endDay: thisData.dayRange[1],
                beginTime: thisData.timeRange[0],
                endTime: thisData.timeRange[1]
            });
        }
        return timePeriods;
    },
    setButtons: function() {
        var self = this;
        backAction(function(back) {
            if (!validator(self.models[0])) return;
            efte.publish(self.topic, self.genAjaxData());
            back();
        });
    }
};