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

var self = module.exports = {
    init: function() {
        var _self = this;
        self.models =[];
        efte.action.get(function(query) {
            alert(JSON.stringify(query));
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
            if(!self.readOnly ) {
                self.bindEvent.call(self);
            }
            self.bindData(query);

        });
    },
    bindData: function(query){
        var _timePeriodNodes = $("#controlRadios label");
        _timePeriodNodes.removeClass("muti-checked");
        $("#controlRadios span").each(function(i){
            if($(this).text() === query.data[0].timePeriod){
                $(_timePeriodNodes.get(i)).addClass("muti-checked");
            }
            $(this)
        });
    },
    bindEvent: function(){
        //绑定适用人群切换事件
        var _self = this;
        $("#controlRadios").find(".radio").bind("touchstart", function(){
            var _radioList = $(this).parents(".sc-control-radios"),
                _model = _self.models[0],
                _timeRange = _model.timeRange.values;
            _radioList.find(".radio").removeClass("muti-checked");
            _radioList.find("input").attr("disabled", true).val("");
            $(this).addClass("muti-checked");
            $(this).parent().find("input").removeAttr("disabled");

            //处理timePeriod默认时间的逻辑
            if($(this).attr("data-value") == "0"){
                setValue.call(_model.timeRange, ["11:30", "14:00"]);
                _model.timePeriod = "午市";
            }else if($(this).attr("data-value") == "1"){
                setValue.call(_model.timeRange, ["17:00", "22:30"]);
                _model.timePeriod = "晚市";
            }else{
                setValue.call(_model.timeRange, ["00:00", "24:00"]);
                _model.timePeriod = "其他";
            }
            function setValue(values){
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
        });
    },
    addTimePeriod: function(timePeriod) {
        timePeriod = _.extend({}, dftTimePeriod, timePeriod);
        var _self = this;
        var i = this.models.length;
        var container = $('<div class="group-container"></div>').appendTo($("#container"));
        var model = new(nut.property.Composite.extend({
            mapping: {
                dayRange: nut.control.MultipleLevelSelect.extend({
                    label: '每周起止日',
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
                    label: '每日起止时间',
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
        //model.timePeriod = $("#controlRadios label.muti-checked").next().text();
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
        var _self = this;
        var timePeriods = [];
        for (var j = 0; j < self.models.length; j++) {
            var thisData = self.models[j].value();

            /**
             * 按照产品经理要求，在此页面执行点击返回就要执行校验
             * 午市 10-18；晚：15-24
             */
            //获取描述的字段
            var timePeriod = $("#controlRadios label.muti-checked").next().text();
            //校验数据格式
            var CheckNoon =function(timePeriod){
               //数据正则分解捕获
               var regExp =/^(\d+)*:?(\d+)*/ ;
                /**
                 * 转换数据为整数
                 * @param time
                 */
               var changeTimeFormat = function(time){
                    var data = regExp.exec(time);
                    data.splice(0,1);
                   return data.reduce(function(pre,val){
                       return pre+val;
                   },'')

                };
                var earlyTime = changeTimeFormat(thisData.timeRange[0]);
                var laterTime = changeTimeFormat(thisData.timeRange[1]);
               switch(timePeriod) {
                   case '午市':
                       if (earlyTime >= 1000 && earlyTime<laterTime && laterTime <= 1800) {
                           return true;
                       }
                       else {
                           alert('午市时间请控制在10:00-18:00之间');
                           return false;
                       }
                       break;
                   case '晚市':
                       if (earlyTime >= 1500  && earlyTime<laterTime && laterTime <= 2400) {
                           return true;
                       }
                       else {
                           alert('晚市时间请控制在15:00-24:00之间');
                           return false;
                       }
                       break;
                   default :
                       return true;
                       break;
               }
            };
            //存储数据
            timePeriods.push({
                beginDay: thisData.dayRange[0] || 2,
                endDay: thisData.dayRange[1] || 3,
                beginTime: thisData.timeRange[0] || "11:30",
                endTime: thisData.timeRange[1] || "14:00",
                timePeriod: timePeriod
            });
        }
        return {
            timePeriods : timePeriods,
            bool : CheckNoon(timePeriod)
        };
    },
    setButtons: function() {
        var _self = this;
        backAction(function(back) {
            /**
             * 把genAjaxData()返回值转为对象，存储数据和bool值用于校验
             * @type {*|{timePeriods, bool}}
             */
            var data = self.genAjaxData();
            if(data.bool){
                efte.publish(self.topic, data.timePeriods);
                back();
            }
            else{
                return false;
            }
        });
    }
};