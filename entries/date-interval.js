'use strict';
var efte = require('efte');
var env = require('../lib/env');
var $ = require('zepto-fix-issue');
var nut = require('nut-hui');
var util = require('../lib/util');
var validator = require("../util/validator");
var moment = require('moment');
var backAction = util.backAction;

module.exports = {
    init: function() {
        var self = this;
        efte.action.get(function(query) {
            self.topic = query.topic;
            self.readOnly = query.readOnly;
            efte.setTitle(query.title || '日期区间');
            self.dateRegions = query.dateRegions || null;
            self.model = new(nut.property.Composite.extend({
                mapping: {
                    beginDate: nut.control.Datebox.extend({
                        label: '开始',
                        dateType: 'date',
                        placeholder: '未设置',
                        required: true
                    }),
                    endDate: nut.control.Datebox.extend(
                        function() {
                            this.addValidator(function() {
                                var start = self.model.beginDate.value();
                                var end = this.value();
                                if(moment(end, 'YYYY-M-D').isBefore(moment(start, 'YYYY-M-D'))) {
                                    return '开始时间不得晚于结束时间';
                                }
                                if(self.dateRegions && (moment(end, 'YYYY-M-D').isBefore(moment(self.dateRegions.endDate, 'YYYY-M-D')) || moment(start, 'YYYY-M-D').isAfter(moment(self.dateRegions.beginDate, 'YYYY-M-D')))){
                                    return moment(end, 'YYYY-M-D').isBefore(moment(self.dateRegions.endDate, 'YYYY-M-D')) ? "方案有效期结束时间必须晚于每个优惠的结束时间" : "方案有效期开始时间早于等于每个优惠开始时间";
                                }
                            });
                        }, {
                            label: '结束',
                            dateType: 'date',
                            placeholder: '未设置',
                            required: true
                        }
                    )
                }
            }));
            nut.generate(self.model, [{
                title: '日期区间',
                children: ['beginDate', 'endDate']
            }], '.container');
            !self.readOnly && self.setButton();
            self.model.value(query.dateInterval || {});
            self.model.forEach(function(control) {
                control[self.readOnly ? 'disable' : 'enable']();
            });
        });
    },
    setButton: function() {
        var self = this;
        backAction(function(back) {
            if (!validator(self.model)) return;
            efte.publish(self.topic, {
                beginDate: self.model.beginDate.value(),
                endDate: self.model.endDate.value()
            });
            back();
        });
    }
};