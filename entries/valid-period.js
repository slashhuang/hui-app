'use strict';
var efte = require('efte');
var moment = require('moment');
var _ = require('underscore');
var rivets = require('rivets');
var neo = require('hui-neo');
var $ = require('zepto-fix-issue');
window.$ = null;
var env = require('../lib/env');
var util = require('../lib/util');
var ajax = util.ajax;
var backAction = util.backAction;
var toast = util.toast;

var self = module.exports = {
    init: function () {
        var self = this;
        var enabledDate = 0;
        this.dateContainer = $('.js-date-container');
        this.dateListContainer = $('#js-date-list');
        this.dateTemplate = $('.js-date-item').html();
        this.selectHolidays = $('.js-select-holidays');
        this.selectPeriods = $('.js-select-periods');
        this.beginDateNode = $("#beginDate");
        this.endDateNode = $("#endDate");
        this.autoDelayNode = $("#autoDelay");
        this.addDateButton = $("#js-add-date");
        this.exceptDateListNode = $("#exceptDateList");
        //this.model = {
        //    couponOffers: []
        //};
        //this.rvModel = {
        //    model: this.model,
        //    readOnly: this.readOnly
        //};
        //this.view = rivets.bind($('#container').get(0), this.rvModel);
        efte.action.get(function (query) {
            self.topic = query.topic;
            self.readOnly = query.readOnly;
            self.parseData(query.data);
            //填充页面显示数据
            self.selectHolidays.prop('checked',!self.viewData.effectiveInHolidays);
            self.selectPeriods.prop('checked', self.viewData.exceptTimePeriods.length);
            self.autoDelayNode.prop('checked', self.viewData.autoDelay);
            self.endDateNode.html(self.viewData.endDate);
            self.beginDateNode.html(self.viewData.beginDate);
            self.updateSelection();
            if (self.viewData.exceptTimePeriods.length) {
                self.viewData.exceptTimePeriods.forEach(function (date, i) {
                    self.addDate(date, i + 1);
                });
            }
            if (self.readOnly) {
                //this 已变
                // this.addDateButton.parent().hide();
                self.addDateButton.parent().hide();
                self.dateListContainer.addClass('disabled');
                self.selectHolidays.prop('disabled',true);
                self.selectPeriods.prop('disabled',true);
                self.autoDelayNode.prop('disabled',true);
            } else {
                self.setButton();
                self.bindEvents();
            }
            //efte.setTitle('优惠 有效期');

        });

    },
    bindEvents: function () {
        var self = this;
            this.dateListContainer.on('touchstart', '.js-delete-date', function (e) {
                e.preventDefault();
                var item = $(this).parent();
                var index = self.dateListContainer.children().index(item);
                self.viewData.exceptTimePeriods.splice(index, 1);
                item.remove();
                self.reCalculateIndex();
            }).on('touchstart', '.control', function (e) {
                e.preventDefault();
                if ($(e.target).is('.action')) return;
                var value = $(this).find('.value');
                var index = self.dateListContainer.children().index(this);
                efte.date({
                    type: 'date',
                    'default': value.text()
                }, function (date) {
                    value.text(date);
                    self.viewData.exceptTimePeriods[index] = date;
                });
            });
            this.addDateButton.on('touchstart', function (e) {
                var date;
                //自定义日期比上一项自增1天
                var _exceptTime = self.viewData.exceptTimePeriods;
                if (_exceptTime && _exceptTime.length) {
                    date = _exceptTime[_exceptTime.length - 1];
                    var _singleDayTime = 60 * 60 * 24 * 1000;
                    var _dateTime = new Date(date).getTime();
                    date = moment(new Date(_dateTime + _singleDayTime)).format('YYYY-MM-DD');
                } else {
                    date = moment().format('YYYY-MM-DD');
                }
                self.viewData.exceptTimePeriods.push(date);
                self.addDate(date);
            });

            var _date = new Date();
            var _formatDate = moment().format('YYYY-MM-DD');
            var _startDate = "";

            //开始时间绑定唤起efte.date控件
            $('#beginDate').on('touchstart', function (e) {
                e.preventDefault();
                var _self = $(this);
                efte.date({
                    type: 'date',
                    'default': _formatDate
                }, function (date) {
                    _self.html(date);
                    _startDate = date;
                    //value.text(date);
                    //self.exceptTimePeriods[index] = date;
                });
            });

            //结束时间绑定唤起efte.date控件
            $('#endDate').on('touchstart', function (e) {
                e.preventDefault();
                var _self = $(this);
                efte.date({
                    type: 'date',
                    'default': _startDate,
                    'minDate': new Date(_startDate).getTime() || _formatDate
                }, function (date) {
                    _self.html(date);
                    //value.text(date);
                    //self.exceptTimePeriods[index] = date;
                });
            });

            //切换自定义日期滑块的事件
            this.selectPeriods.on('change', function (e) {
                e.preventDefault();
                self.updateSelection();
            });
    },
    validate: function(){
        var _data = self.generateData(),
            begin = _data.beginDate,
            end = _data.endDate;
        if (moment(begin).isAfter(end, 'day')) {
            if (confirm(env.confirm_invalid_with_title({msg: "开始时间必须早于结束时间"}))) {
                efte.action.back(true);
                return true;
            }else{
                return false;
            }
        }
        return true;
    },
    updateSelection: function(){
        if (this.selectPeriods.prop('checked')) {
            this.exceptDateListNode.show();
            this.dateContainer.insertAfter('.js-select-type');
        } else {
            this.exceptDateListNode.hide();
            this.dateListContainer.children().remove();
        }
    },
    addDate: function (date, i) {
        var dateItem = $(this.dateTemplate).appendTo(this.dateListContainer);

        dateItem.find('.value').text(date);

        if(i){
            dateItem.find('.item-number').text(i);
        }else{
            var _num = 0;
            //自定义不可用日期 序列显示
            if(self.viewData.exceptTimePeriods && self.viewData.exceptTimePeriods.length){
                _num = self.viewData.exceptTimePeriods.length;
            }
            dateItem.find('.item-number').text(_num);
        }
        this.reCalculateIndex();
    },
    reCalculateIndex:function(){
        var _lists = $("#js-date-list").find(".control"),
            _len = _lists.length;
        for(var i = 0; i < _len; i++){
            $(_lists.find(".item-number")[i]).html(i + 1);
        }
    },
    setButton: function () {
        var self = this;
        backAction(function (back) {
            if (!self.validate()) return;
            efte.publish(self.topic, self.generateData());
            back();
        });
    },
    parseData: function(data) {
        this.viewData = {
            effectiveInHolidays : typeof(data.effectiveInHolidays)!= "undefined"?data.effectiveInHolidays: true,
            exceptTimePeriods : data.exceptTimePeriods || [],
            beginDate: moment(data.beginDate).format("YYYY-MM-DD"),
            endDate: moment(data.endDate).format("YYYY-MM-DD"),
            autoDelay: data.autoDelay
        };
    },
    generateData: function() {
        return {
            effectiveInHolidays: !this.selectHolidays.prop('checked'),
            exceptTimePeriods: this.selectPeriods.prop('checked') ? this.viewData.exceptTimePeriods : [],
            autoDelay: this.autoDelayNode.prop('checked')? 1 : 0,
            beginDate: moment(this.beginDateNode.html()).valueOf(),
            endDate: moment(this.endDateNode.html()).valueOf()
        }

    }
};