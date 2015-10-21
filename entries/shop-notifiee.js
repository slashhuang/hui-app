'use strict';
var efte = require('efte');
var env = require('../lib/env');
var $ = require('zepto-fix-issue');
window.$ = null;
var _ = require('underscore');
var nut = require('nut-hui');
var util = require('../lib/util');
var validator = require("../util/validator");
var moment = require('moment');
var rivets = require('rivets');
var backAction = util.backAction;

rivets.formatters.seqnum = function (value) {
    return value + 1;
};

var self = module.exports = {
    init: function () {
        efte.setTitle('买单通知人');
        efte.action.get(function (query) {
            self.initLayout(query);
            self.initButton();
            util.ajax({
                url: 'shopNotifiersController/get_shopnotifiers',
                data: {shopId: query.shopId,
                    customerId: query.customerId},
                success: function (data) {
                    if (data && data.code && data.code === 200) {
                        self.model.notifiers.splice(0, 10);
                        for (var i = 0; i < 10; i++) {
                            if (i < data.msg.notifiers.length) {
                                self.model.notifiers.push(data.msg.notifiers[i]);
                            } else {
                                self.model.notifiers.push({});
                            }
                        }
                    } else {
                        alert('获取门店通知人出错');
                        efte.action.back(true);
                    }
                },
                error: function () {
                    alert('获取门店通知人失败');
                    efte.action.back(true);
                }
            });
        });
    },
    initLayout: function (query) {
        this.model = {
            shopId: query.shopId,
            customerId: query.customerId,
            notifiers: [{},{},{},{},{},{},{},{},{},{}]
        };
        this.view = rivets.bind($('#container').get(0), {
            shopName: query.shopName,
            model: this.model,
            clear: function (evt, data) {
                self.model.notifiers[data.index].mobile = '';
            }
        });
    },
    initButton: function () {
        backAction(function (back) {
            if (self.validate() && confirm('确认保存联系人信息吗？')) {
                util.toast.show('保存中', true);
                util.ajax({
                    url: 'shopNotifiersController/save_shopnotifiers',
                    data: {
                        shopId: self.model.shopId,
                        customerId: self.model.customerId,
                        notifiers: _.compact(_.map(self.model.notifiers, function (val) {
                            if (val.mobile) return val;
                        }))
                    },
                    method: 'post',
                    success: function () {
                        back();
                    },
                    error: function (msg) {
                        util.toast.hide();
                        alert(msg.message || '保存失败');
                    }
                })
            }
        });
    },
    validate: function () {
        if (this.model.notifiers.every(function(val){
            return !val.mobile 
        })){
            if (confirm(env.confirm_invalid_with_title({msg: '至少填写一个手机号'}))) {
                    efte.action.back(true);
                }
            return false;
        }
        return this.model.notifiers.every(function (val) {
            if (val.mobile && !/^\d{11}$/.test(val.mobile)) {
                if (confirm(env.confirm_invalid_with_title({msg: '手机号格式不正确'}))) {
                    efte.action.back(true);
                }
                return false;
            }
            return true;
        });
    }
};