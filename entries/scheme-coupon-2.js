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

var defaultCoupon = function(){
    return {
        type: 4,
        desc: '未填写',
        inventoryStatus: 0,
        maxInventory: 0,
        effectiveInHolidays: true,
        shops: [],
        detailDescs: [],
        exceptTimePeriods: [],
        newTimePeriods: [],
        beginDate: Date.now(),
        endDate: Date.now(),
        autoDelay: 1,
        ticketValidPeriod: 30,
        limitCount: 0
    };
};

var self = module.exports = {
    init: function () {
        this.initHandlers();
        this.model = {
            couponOffers: []
        };
        this.rvModel = {
            model: this.model,
            readOnly: this.readOnly
        };
        this.view = rivets.bind($('#container').get(0), this.rvModel);
        efte.action.get(function (query) {
            self.topic = query.topic;
            self.customerID = query.customerID;
            self.readOnly = query.readOnly;
            self.rvModel.readOnly = query.readOnly;
            if (query.couponOffers && query.couponOffers.length > 0) {
                self.soldQuantity = query.couponOffers[0].soldQuantity;
                query.couponOffers.forEach(function (coupon) {
                    self.model.couponOffers.push(self.genShowData(coupon));
                });
            } else if (!self.readOnly) {
                self.model.couponOffers.push(self.genShowData(defaultCoupon()));
            }

            self.branchList = query.branchList;
            // self.branchList = query.branchList.map(function(branch){
            //     return {
            //         text: branch.shopName,
            //         value: branch.shopID
            //     };
            // });
            !self.readOnly && self.setButton();
        });
        efte.setTitle('送券');
    },
    initHandlers: function () {
        var self = this;
        neo.binder.addUnitHandler('detaildesc', {
            unit: 'unit-m-hui',
            path: 'pages/detail-descs',
            data: function (val) {
                return {
                    readOnly: self.readOnly,
                    value: val
                }
            }
        });
        neo.binder.addUnitHandler('timeperiod', {
            unit: 'unit-m-hui',
            path: 'pages/time-period',
            data: function (val) {
                return {
                    title: '使用时间',
                    readOnly: self.readOnly,
                    data: val || []
                }
            }
        });
        neo.binder.addUnitHandler('dateexcept', {
            unit: 'unit-m-hui',
            path: 'pages/date-except',
            data: function (val) {
                return {
                    readOnly: self.readOnly,
                    data: val
                }
            },
            value: function (val, el) {
                if (!val) return val;
                var text = [];
                if (!val.effectiveInHolidays) {
                    text.push('节假日');
                }
                if (val.exceptTimePeriods && val.exceptTimePeriods.length) {
                    text.push(val.exceptTimePeriods.length + '个自定义日期');
                }
                $(el).find('.input').text(text.join('+') || '无');
                return val;
            }
        });
        neo.binder.addUnitHandler('shops', {
            unit: 'unit-m-hui',
            path: 'pages/select-shops',
            data: function (val) {
                return {
                    title: "选择门店",
                    readOnly: self.readOnly,
                    required: true,
                    customerID: self.customerID,
                    branchList: self.branchList,
                    data: val
                }
            },
            value: function (data, el) {
                data = data.shops ? data : {shops: data ? data : []};
                $(el).find('.input').text(data.shops ? data.shops.length : '未设置');
                return data;
            }
        });
    },
    validate: neo.validator({
        'couponOffers[]': neo.validator.defaults.delegate({
            // title: neo.validator.defaults.required('必须填写标题'),
            full: [function (val) {
                    if (isNaN(+val)) return '"每满"必须填写数字';
                }, neo.validator.defaults.required('必须填写"每满"')],
            cut: [function (val) {
                    if (isNaN(+val)) return '"赠送"必须填写数字';
                    if (+val < 10) return '送券金额至少为10元';
                }, neo.validator.defaults.required('必须填写"赠送"')],
            'full,cut': function (full, cut) {
                    if (~~full <= ~~cut) return '“每满”金额必须大于“可用”金额';
                },
            'ticketIssueThreshold,cut': function (full, cut) {
                    if (~~full <= ~~cut) return '“满”金额必须大于“赠送”金额';
                },
            'inventoryStatus,maxInventory': function (status, val) {
                    if (status == 1) {
                        if (!val) return '必须填写库存量';
                        if (isNaN(+val)) return '库存量填写格式错误';
                        if (+val % 1 > 0) return '库存量必须为整数';
                        if (+val === 0) return '库存量必须大于0';
                        if (self.soldQuantity && +val <= self.soldQuantity) return '库存量必须大于已发券数' + self.soldQuantity + '张';
                    }
                },
            shops: neo.validator.defaults.required('必须选择适用门店'),
            newTimePeriods: neo.validator.defaults.required('必须选择使用时段'),
            ticketIssueThreshold: [function (val) {
                    if (isNaN(+val)) return '必须填写整数';
                }, neo.validator.defaults.required('必须填写满赠金额')],
            'beginDate,endDate': function (begin, end) {
                    if (!moment(begin).isBefore(end, 'day')) return '开始时间必须早于结束时间';
                }
        })
    }),
    setButton: function () {
        var self = this;
        backAction(function(back) {
            var couponOffers = self.transAjaxCouponOffers();
            var couponOffersPublish = self.transPublishCouponOffers();
            var invalid = self.validate({couponOffers:couponOffers});
            if (invalid) {
                if (confirm(env.back_invalid_with_title({msg: invalid.join('\n')}))) {
                    efte.action.back(true);
                    return;
                }
                return;
            }
            toast.show('保存中', true);
            ajax({
                url: 'schemeController/validate_couponOffer',
                data: couponOffers,
                method: 'post',
                success: function() {
                    efte.publish(self.topic, couponOffersPublish);
                    back(false);
                },
                error: function(message) {
                    toast.hide();
                    alert(message.message);
                }
            });
        });
    },
    transAjaxCouponOffers: function(){
        var self = this;
        return this.model.couponOffers.reduce(function(result, coupon){
            result.push(self.genAjaxData(coupon, true));
            return result;
        },[]);
    },
    transPublishCouponOffers: function(){
        var self = this;
        return this.model.couponOffers.reduce(function(result, coupon){
            result.push(self.genAjaxData(coupon, false));
            return result;
        },[]);
    },
    genShowData: function (coupon) {
        var showCoupon = _.extend(defaultCoupon(), coupon);
        showCoupon.dateExcept = {
            effectiveInHolidays: coupon.effectiveInHolidays,
            exceptTimePeriods: coupon.exceptTimePeriods || []
        };
        return showCoupon;
    },
    genAjaxData: function (coupon, flag) {
        var data = _.extend({}, coupon, coupon.dateExcept);
        delete data.dateExcept;

        //自动生成标题
        data.title = "满" + data.ticketIssueThreshold + "元赠送" + data.cut + "元尊享劵";
        data.shops = data.shops && data.shops.shops ? data.shops : {shops: data.shops}
        data.shops = flag ? data.shops.shops.reduce(function(result, shop){
            shop && result.push(_.pick(shop, 'shopID','shopName'));
            return result
        }, []): data.shops.shops;


        return data;
    }
};