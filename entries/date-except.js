'use strict';
var efte = require('efte');
var _ = require('underscore');
var $ = require('zepto-fix-issue');
var nut = require('nut-hui');
var moment = require('moment');
var util = require('../lib/util');
var backAction = util.backAction;
var env = require('../lib/env');

module.exports = {
    init: function() {
        var self = this;
        this.dateContainer = $('.js-date-container');
        this.dateListContainer = $('.js-date-list');
        this.dateTemplate = $('.js-date-item').html();
        this.typeSelect = $('.js-select-type input');
        this.selectHolidays = $('.js-select-holidays');
        this.selectPeriods = $('.js-select-periods');

        efte.action.get(function(query) {
            self.topic = query.topic;
            self.readOnly = query.readOnly;
            efte.setTitle('不可用日期');
            self.parseData(query.data);
            self.selectHolidays.prop('checked', !self.effectiveInHolidays);
            self.selectPeriods.prop('checked', self.exceptTimePeriods.length);
            self.updateSelection();
            if (self.exceptTimePeriods.length) {
                self.exceptTimePeriods.forEach(function(date){
                    self.addDate(date);
                });
            }
            if (self.readOnly) {
                $('.js-add-date').parent().hide();
                self.typeSelect.prop('disabled', true);
                self.dateListContainer.addClass('disabled');
            } else {
                self.setButton();
            }
        });
        this.bindEvents();
    },
    bindEvents: function(){
        var self = this;
        this.selectPeriods.on('change', function(){
            self.updateSelection();
        });
        this.dateListContainer.on('touchstart', '.js-delete-date', function(e){
            e.preventDefault();
            var item = $(this).parents('li').eq(0);
            var index = self.dateListContainer.children().indexOf(item);
            self.exceptTimePeriods.splice(index, 1);
            item.remove();
        }).on('touchstart', 'li', function(e){
            e.preventDefault();
            if ($(e.target).is('.action')) return;
            var value = $(this).find('.value');
            var index = self.dateListContainer.children().indexOf(this);
            efte.date({
                type: 'date',
                'default': value.text()
            }, function(date){
                value.text(date);
                self.exceptTimePeriods[index] = date;
            });
        });
        $('.js-add-date').on('touchstart', function(e){
            e.preventDefault();
            var date = moment().format('YYYY-MM-DD');
            self.exceptTimePeriods.push(date);
            self.addDate(date);
        });
    },
    updateSelection: function(){
        if (this.selectPeriods.prop('checked')) {
            this.dateContainer.insertAfter('.js-select-type');
        } else {
            this.dateContainer.remove();
        }
    },
    addDate: function(date){
        var dateItem = $(this.dateTemplate).appendTo(this.dateListContainer);
        dateItem.find('.value').text(date);
    },
    setButton: function() {
        var self = this;
        backAction(function(back) {
            if (!self.validate()) return;
            efte.publish(self.topic, self.generateData());
            back();
        });
    },
    validate: function(){
        if (this.selectPeriods.prop('checked') && !this.exceptTimePeriods.length) {
            if (confirm(env.confirm_invalid_with_title({msg: "请选择除外日期"}))) {
                efte.action.back(true);
                return true;
            }else{
                return false;
            }
        }
        return true;
    },
    parseData: function(data) {
        this.effectiveInHolidays = data.effectiveInHolidays || false;
        this.exceptTimePeriods = data.exceptTimePeriods || [];
    },
    generateData: function() {
        return {
            effectiveInHolidays: !this.selectHolidays.prop('checked'),
            exceptTimePeriods: this.selectPeriods.prop('checked') ? this.exceptTimePeriods : []
        }
    }
};