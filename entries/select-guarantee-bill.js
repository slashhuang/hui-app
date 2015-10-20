'use strict';
var efte = require('efte');
var rivets = require('rivets');
var neo = require('hui-neo');
var $ = require('zepto-fix-issue');
window.$ = null;
var util = require('../lib/util');
var ajax = util.ajax;
var toast = util.toast;

var self = module.exports = {
    model: {
        selectBill: function (e, model) {
            efte.publish(self.query.topic, model.bill.useQuotaApplyId);
            efte.action.back();
        }
    },
    init: function () {
        this.view = rivets.bind(document.getElementById('container'), this.model);
        efte.setTitle('选择保底单');
        efte.action.get(function (query) {
            self.query = query;
            self.model.currentId = query.useQuotaApplyId;
            ajax({
                url: '/guaranteeBillController/get_guaranteeBill',
                data: {
                    customerId: query.customerId
                },
                success: function (data) {
                    self.model.billList = data.msg;
                },
                error: function (message) {
                    window.alert(message);
                }
            });
        });
    }
};