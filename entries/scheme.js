'use strict';
var efte = require('efte');
var env = require('../lib/env');
var $ = require('zepto-fix-issue');
var moment = require('moment');
window.$ = null;
var _ = require('underscore');
var nut = require('nut-hui');
var neo = require('hui-neo');
var util = require('../lib/util');
var Status = require('../lib/status');
var toast = util.toast;
var deep = util.deep;
var ajax = util.ajax;
var validator = require("../util/validator");
var backAction = util.backAction;

var submitUrl = {
    uncommitted: 'schemeController/add_scheme',
    add:                'schemeController/add_scheme',
    modify:             'schemeController/add_scheme',
    drawback:           'schemeController/add_scheme',
    revoke:             'schemeController/add_scheme',
    withdraw:             'schemeController/add_scheme',
    update:             'schemeController/update_scheme',
    online:             'schemeController/add_online_mod_scheme',
    offline:            'schemeController/add_online_mod_scheme',
    modified:           'schemeController/update_online_mod_scheme',
    'modify-submitted':  'schemeController/update_online_mod_scheme'
};

function format(time) {
    if (!time) return '';
    if (time.toString().split('-').length === 3) return time;
    var day = new Date(time);
    return day.getFullYear() + "-" + parseInt(day.getMonth() + 1) + "-" + day.getDate();
}

var self = module.exports = {
    init: function() {
        this.branchList = []; //所有商户列表，包含选择及填写的商户信息
        this.couponOfferShopIds = [];  //所有优惠门店Id集合
        this.resetDateRegion();
        this.schemeDateRegion = {
            beginDate: '4000-12-30',
            endDate: '1000-01-01'
        };
        this.schemeShopsList = [];
        this.defaultBankcard = null;
        // this.title = '添加闪惠';
        // efte.setTitle('添加闪惠');
        toast.show('载入中…');
        efte.action.get(function(params) {
            console.log(JSON.stringify(params));
            self.fetch(params);
        });
    },
    resetDateRegion: function(){
        this.couponOfferDateRegion = {
            beginDate: '4000-12-30',
            endDate: '1000-01-01'
        };
    },
    fetch: function(params) {
        /**
         * params是{"schemeId":977911,"status":9,"topic":"unit-m-hui-index-create-scheme"}
         */
        self.schemeId = params.schemeId || null;
        if (!params.newScheme) {
            ajax({
                url: 'schemeController/schemeInfo',
                data: {
                    schemeId: params.schemeId,
                    status: params.status
                },
                success: function(data) {
                    console.log(JSON.stringify(data));
                    var beginDate = data.msg.schemeBaseVO.beginDate;
                    var endDate = data.msg.schemeBaseVO.endDate;
                    data.msg.schemeBaseVO.dateInterval = {
                        beginDate: beginDate?format(beginDate):beginDate,
                        endDate: endDate?format(endDate):endDate
                    };
                    self.schemeDateRegion = {
                        beginDate:data.msg.schemeBaseVO.dateInterval.beginDate, 
                        endDate:data.msg.schemeBaseVO.dateInterval.endDate
                    };
                    self.schemeShopsList = data.msg && data.msg.shops ? data.msg.shops : [];

                    self.data = self.generateData(params, data.msg);
                    self.branchList = data.msg && data.msg.shops ? data.msg.shops : [];
                    self.data.couponOffers = self.data.couponOffers ? self.data.couponOffers.map(function(couponOffer){
                        couponOffer.shops = couponOffer.shops ?couponOffer.shops.reduce(function(result,shop){
                            var obj = _.findWhere(self.schemeShopsList, {shopID: shop.shopID});
                            obj && result.push(obj);

                            obj && self.couponOfferShopIds.indexOf(shop.shopID) < 0 && self.couponOfferShopIds.push(shop.shopID);

                            return result;
                        },[]): [];
                        self.setDateRegion(format(couponOffer.beginDate), format(couponOffer.endDate));
                        return couponOffer;
                    }) : [];
                    self.fetchBaseInfo();
                    self.setBackAction();
                },
                error: function(message) {
                    alert(message.message);
                }
            });
        } else {
            self.data = self.generateData(params);
            self.fetchBaseInfo();
            self.setBackAction();
        }
    },
    setDateRegion: function(beginDate, endDate){
        if (!this.model){
            return;
        }
        var self = this;
        var dateInterval = this.model.dateInterval.value();


        this.schemeDateRegion = {
            beginDate:moment(beginDate, 'YYYY-M-D').isBefore(moment(self.schemeDateRegion.beginDate, 'YYYY-M-D')) ? beginDate : self.schemeDateRegion.beginDate,
            endDate: moment(endDate, 'YYYY-M-D').isAfter(moment(self.schemeDateRegion.endDate, 'YYYY-M-D')) ? endDate : self.schemeDateRegion.endDate
        }

        this.couponOfferDateRegion = {
            beginDate:moment(beginDate, 'YYYY-M-D').isBefore(moment(self.couponOfferDateRegion.beginDate, 'YYYY-M-D')) ? beginDate : self.couponOfferDateRegion.beginDate,
            endDate: moment(endDate, 'YYYY-M-D').isAfter(moment(self.couponOfferDateRegion.endDate, 'YYYY-M-D')) ? endDate : self.couponOfferDateRegion.endDate
        }
        this.model.dateInterval.setValue(self.schemeDateRegion);
    },
    setBackAction: function() {
        backAction(function(back){
            var msg = '';
            if (self.showStatus === 'add') {
                msg = '返回将不保存当前内容！确定返回？';
            } else if (self.showStatus === 'update' || self.showStatus === 'uncommitted') {
                msg = '返回将不保存当前修改的内容！确定返回？';
            } else if (self.showStatus === 'modify') {
                msg = '返回将不提交这次变更内容！确定返回？';
            }
            if (!msg || window.confirm(msg)) {
                back();
            }
        });
    },
    fetchBaseInfo: function() {
        this.submitUrl = submitUrl[this.showStatus];
        var customerID = this.data.customerID;
        if (this.showStatus === 'modified' || this.showStatus === 'modify-submitted') {
            var shops = {
                url: 'schemeController/get_shops_by_schemeId',
                data: {
                    schemeId: this.data.schemeBaseVO.id
                }
            };
        } else {
            shops = {
                url: 'schemeController/get_shops',
                data: {
                    customerID: customerID
                }
            }
        }

        toast.hide();
        self.render();
        efte.stopRefresh();
        self.bind();


        ajax({
            url: 'schemeController/get_bankCards',
            data: {
                customerID: customerID
            },
            success: function(data) {
                self.bankcardList = data.msg || [];
                if((self.showStatus === 'add' || self.showStatus === 'update') && !self.bankcardList.length) {
                    window.alert('请前往客户模块添加银行卡');
                    efte.action.back(true);
                }
            },
            error: function(message) {
                alert(message.message);
            }
        });
        ajax({
            url: 'schemeController/get_default_bankAccount',
            data: {
                customerID: customerID
            },
            success: function(data) {
                if (data.msg) {
                    self.defaultBankcard = data.msg;
                }
            },
            error: function(msg) {
                alert(msg.message);
            }
        });
    },
    render: function() {
        this.model = new(nut.property.Composite.extend({
            mapping: {
                id: nut.control.Hidden,
                schemeId: nut.control.Textbox.extend({
                    label: '方案ID',
                    placeholder: ''
                }),
                title: nut.control.Textbox.extend({
                    label: '方案名',
                    placeholder: ''
                }),
                customerID: nut.control.Hidden,
                customerName: nut.control.StaticInput.extend({
                    label: '客户'
                }),
                contractID: nut.control.Hidden,
                contractNo: nut.control.StaticInput.extend({
                    label: '协议'
                }),
                /*freeDate: nut.control.Numberbox.extend(
                    function() {
                        this.addValidator(function() {
                            var value = this.input.val();
                            var num = Number(value);
                            if (isNaN(num)) {
                                return '必须填写数字';
                            } else if (num < 0 || num > 180) {
                                return '请填写0-180之间的数字';
                            }
                        });
                    }, {
                        label: '免费期',
                        placeholder: '0-180天',
                        attrs: {
                            min: 0,
                            max: 180,
                            pattern: '\\d*',
                            step: 1
                        },
                        required: true
                    }),
                }),*/
                freeDate: nut.property.Abstract.extend({
                    getValue: function() {
                        return 0;
                    },
                    setValue: function() {},
                    enable: function() {},
                    disable: function() {}
                }),
                // coupon中的折扣也是如此
                // 赠送不现实折扣
                //
                // validate
                // modify
                promCommission: nut.control.Numberbox.extend(
                    function() {
                        this.addValidator(function() {
                            var value = this.input.val();
                            var val = Number(value);
                            if (isNaN(val)) {
                                return '必须填写数字';
                            } else if (val < 0) {
                                return '请填写不小于0的值';
                            } else if (val > 20) {
                                return '不能超过20%';
                            } else if (!/^\d*(\.\d{0,2})?$/.test(value)) {
                                return '最多填写2位小数';
                            }
                        });
                    }, {
                        label: '初始费率 (%)',
                        attrs: {
                            min: 0,
                            max: 15,
                            step: 0.1
                        },
                        required: true,
                        getValue: function() {
                            var value = this.input.val();
                            if (value === '') {
                                return null;
                            }
                            var iv = value - 0;
                            if (isNaN(iv)) {
                                return null
                            }
                            return iv / 100;
                        },
                        setValue: function(v) {
                            var str = Math.round(v * 10000) / 100 + '';
                            str = /^(\d*(?:\.\d{0,2})?)/.exec(str)[1];
                            this.input.val(str);
                        }
                    }),
                dateInterval: nut.control.AbstractLink.extend(
                    function() {
                        this.addValidator(function() {
                            var dateInterval = this.value();
                            if (!dateInterval || !dateInterval.beginDate || !dateInterval.endDate) {
                                return '必选';
                            }
                        });
                    }, {
                        label: '方案有效期',
                        required: true,
                        onTap: function() {
                            this.open(
                                'unit-m-hui',
                                'pages/date-interval', {
                                    title: '优惠有效期',
                                    readOnly: self.readOnly,
                                    dateInterval: this.value(),
                                    dateRegions: self.couponOfferDateRegion
                                },
                                function(obj) {
                                    this.value(obj);
                                }
                            );
                        },
                        setValue: function(val) {
                            if (!val) return;
                            this.data = val;
                            this.setText(format(val.beginDate) + ' ' + format(val.endDate));
                        },
                        getValue: function() {
                            return this.data;
                        },
                        disable: function() {}
                    }),
                schemeShops: nut.control.AbstractLink.extend(function (argument) {
                    this.addValidator(function(){
                        var value = this.value();
                        if (value && value.length) return;
                        return '门店不能为空';
                    });
                },{
                    label: '适用门店',
                    required: true,
                    onTap: function(){
                        this.open(
                            'unit-m-hui',
                            'pages/multiple-select-shops',
                            {
                                title: "选择门店",
                                readOnly: self.showStatus !== 'add'  && self.showStatus !== 'modify' && self.showStatus !== 'uncommitted',
                                required: true,
                                customerID: self.data.customerID,
                                data: this.data,
                                schemeId: self.schemeId || null,
                                couponOfferShopIds: self.couponOfferShopIds || []
                            }, function(data){
                                this.value(data);
                            }
                        )
                    },
                    getValue: function(){
                        return this.data.shops;
                    },
                    setValue: function(data){
                        this.setText(data && data.length || '未设置');
                        this.data = {
                            shops: data?data:[]
                        }
                        var tempShop = {};

                        // 当修改了门店信息，则更新branchList
                        self.schemeShopsList = this.data.shops.length ? _.reduce(this.data.shops, function(ret, shop){
                                tempShop = _.findWhere(self.schemeShopsList, {shopID: shop.shopID});
                                ret.push(tempShop ? tempShop : shop);
                                return ret;
                        },[]): [];

                        self.synchronizeShops.call(self);

                    }
                }),
                couponOffers: nut.control.AbstractLink.extend({
                    label: '优惠信息',
                    onTap: function () {
                        var couponType = this.couponType();
                        var query = {
                            title: '优惠信息',
                            readOnly: self.showStatus !== 'add' && self.showStatus !== 'uncommitted'  && self.showStatus !== 'modify',
                            couponOffers: this.value(),
                            customerID: self.data.customerID,
                            branchList: self.schemeShopsList
                        };
                        var path;
                        if (self.showStatus === 'add' || self.showStatus === 'update' || self.showStatus === 'uncommitted' || self.showStatus === 'modify') {
                            path = 'pages/coupon-type';
                        }
                        else if (couponType === 'voucher') {
                            path = 'pages/scheme-coupon-2';
                        } else if (couponType === 'normal') {
                            path = 'pages/scheme-coupon';
                        } else if(couponType === 'quota'){
                            path = 'pages/scheme-coupon-3';
                        }else {
                            alert('优惠数据为空或者有误');
                            return;
                        }
                        this.open(
                            'unit-m-hui',
                            path,
                            query,
                            function (data) {
                                var tempShop = {};
                                this.value(data);
                                this.setCouponFilled();

                                self.couponOfferShopIds = []; //reset

                                self.resetDateRegion();

                                //当优惠修改优惠中，改了门店信息，则更新branchList
                                self.branchList = data.length ? data.reduce(function(result, coupon){
                                    coupon.shops = coupon.shops ? _.reduce(coupon.shops, function(ret, shop){
                                        tempShop = _.findWhere(self.schemeShops, {shopID: shop.shopID});
                                        ret.push(tempShop ? tempShop : _.findWhere(self.schemeShopsList, {shopID: shop.shopID}));

                                        self.couponOfferShopIds.indexOf(shop.shopID) < 0 && self.couponOfferShopIds.push(shop.shopID);

                                        return ret;
                                    },[]) : [];
                                    self.setDateRegion(format(coupon.beginDate), format(coupon.endDate));
                                    result = coupon.shops ? result.concat(coupon.shops): result;
                                    return result;
                                },[]): [];
                                var selected = {};

                                self.data.shops.forEach(function(shop) {
                                    selected[shop.shopID] = true;
                                });

                                self.branchList.forEach(function(it) {
                                    it.selected = !!selected[it.shopID];
                                });

                                //更新门店联系人信息
                                // self.model.shops.setValue(self.branchList);

                            }
                        );
                    },
                    couponType: function () {
                        //优惠信息
                        var couponOffers = this.value();
                        //alert(couponOffers[0].type);
                        if (couponOffers && couponOffers.length > 0) {
                            if (couponOffers[0].type == 4) {
                                return 'voucher';
                            } else if (couponOffers[0].type == 6){
                                return 'quota';
                            }else{
                                return 'normal';
                            }
                        }
                        return '';
                    },
                    setValue: function(val) {
                        if (!val) val = [];
                        this.data = val;
                        var type = this.couponType();
                        if (type == 'voucher') {
                            this.setText('送券');
                        } else if(type == 'quota'){
                            this.setText('定额优惠');
                        }else if (type) {
                            this.setText('满减/折扣/赠品');
                        } else {
                            this.setText('');
                        }
                    },
                    getValue: function() {
                        return this.data || [];
                    },
                    getData: function(){
                        var tempData = _.extend([], this.data) || [];
                        tempData = tempData.map(function(coupon){
                            if (coupon.shops && coupon.shops.length > 0){
                                coupon.shops = coupon.shops.reduce(function(result, shop){
                                                                result.push({
                                                                    shopID: shop.shopID,
                                                                    shopName: shop.shopName
                                                                });
                                                                return result;
                                                            }, []);
                            }

                            return coupon;
                        }) || [];
                        return tempData || [];
                    },
                    disable: function() {
                        // 不能disabled这个控件，因为需要点击进入分店详情
                    },
                    setCouponFilled: function () {
                        this.couponFilled = true;
                    },
                    validator: function(val){
                        if (!val.length) return;
                        var shops = self.model.shops.value();
                        var msg = '';
                        this.value().forEach(function(coupon){
                            if (!coupon.shops.length) {
                                msg = '部分优惠没有选择适用门店';
                            }
                        });
                        return msg;
                    }
                }),
                shops: nut.control.AbstractLink.extend({
                    label: '门店联系人',
                    onTap: function() {
                        this.open(
                            'unit-m-hui',
                            'pages/select-branch', {
                                readOnly: self.showStatus !== 'add'  && self.showStatus !== 'modify' && self.showStatus !== 'uncommitted',
                                branchList: self.schemeShopsList,
                                branchEdit: true,
                                customerId: self.data.customerID
                            },
                            function(data) {
                                var shops = {};
                                data.branchList.forEach(function(val) {
                                    shops[val.shopID] = val;
                                });
                                self.schemeShopsList.forEach(function(val) {
                                    _.extend(val, shops[val.shopID]);
                                });
                                this.setText(data.num);
                            }
                        );
                    },
                    getValue: function() {
                        return _.compact(self.schemeShopsList.map(function(val) {
                            return _.pick(val, 'shopID', 'shopName', 'bankAccountVO', 'contactName', 'contactPhone');
                        }));
                    },
                    setValue: function(data) {
                        data.forEach(function(shop) {
                            self.schemeShopsList.some(function(shopObj) {
                                if (shop.shopID === shopObj.shopID) {
                                    _.extend(shopObj, shop);
                                    shopObj.isChoose = true;
                                    shopObj.selected = true;
                                    return true;
                                }
                            })
                        });
                        if (data && data.length) {
                            this.setText(data.length);
                        }else{
                            this.setText('未设置');
                        }
                    },
                    disable: function() {},
                    validator: function(){
                        if (!self.schemeShopsList.length){
                            return '没有选择适用门店';
                        }
                        if (self.schemeShopsList.filter(function(branch){
                            return branch.contactName && branch.contactPhone;
                        }).length !== self.schemeShopsList.length) {
                            return '买单信息人添加不完整';
                        }
                    }
                }),
                settle: nut.control.AbstractLink.extend({
                    label: '结算',
                    onTap: function() {
                        this.open(
                            'unit-m-hui',
                            'pages/scheme-settle', {
                                readOnly: self.showStatus === 'modify' ? 'partial' : (self.showStatus !== 'update' &&  self.showStatus !== 'add' &&  self.showStatus !== 'uncommitted'),
                                type: this.data.type,
                                bankcardList: self.bankcardList,
                                shops: self.schemeShopsList,
                                unifiedBankcard: self.defaultBankcard ? self.defaultBankcard.accountID : this.data ? this.data.unifiedBankcard : null,
                                hasDefaultBankcard: !!self.defaultBankcard
                            },
                            function(data) {
                                this.value(data);
                                self.schemeShopsList.forEach(function(branch) {
                                    var bankcard = data.shops[branch.shopID];
                                    if (bankcard) {
                                        branch.bankAccountVO = {
                                            accountID: bankcard
                                        };
                                    }
                                });
                            }
                        );
                    },
                    setValue: function(val) {
                        if (!val) val = {};
                        this.data = val;
                        this.setText(val.typeName);
                        self.model.guaranteeBillStatus.syncState();
                    },
                    getValue: function() {
                        return this.data || {};
                    },
                    disable: function() {
                        // 不能disabled这个控件，因为需要点击进入分店详情
                    },
                    validator: function(val){
                        if (!val.hasOwnProperty('type')) {
                            return '必须选择结算方式';
                        } else if (val.type == 10 && self.model.shops.value().some(function(shop){
                                return !shop.bankAccountVO;
                            })) {
                            return '请为每个门店选择银行卡';
                        }
                    }
                }),
                guaranteeBillStatus: nut.control.SingleSelectInline.extend({
                    label: '关联保底单',
                    options: [{
                        value: 1,
                        text: '是'
                    },{
                        value: 0,
                        text: '否'
                    }],
                    syncState: function() {
                        if (this.permDisabled) this.disable();

                        if (["add", 'update', 'uncommitted'].indexOf(self.showStatus) > -1 || ([2,8].indexOf(self.statusCode) > -1 && self.showStatus == 'modify')) {
                            if (self.model.settle.value().type == 10) {
                                this.value(0);
                                this.disable();
                            } else {
                                this.enable();
                            }
                        }

                        //在线可以并且为否的时候可以修改保底
                        if ([3,4,5,7,9].indexOf(self.statusCode) > -1){
                            this[self.showStatus == 'modify' && this.value() == 0 && self.model.settle.value().type != 10 ? "enable" : "disable"]();

                            //在线，如果首次为是的时候，不可以修改保底，所以加了disGuaranteeBillRealId这个字段
                            this.disGuaranteeBillRealId = self.showStatus == 'modify' && this.value() == 1 ? true : false;
                        }
                    },
                    setDisabled: function () {
                        this.permDisabled = true;
                    }
                }),
                guaranteeBillRealId: nut.control.AbstractLink.extend({
                    label: '选择保底单',
                    onTap: function () {
                        if (this.permDisabled) return;
                        else if (([2,3,4,5,7,8,9].indexOf(self.statusCode) > -1 && self.showStatus != 'modify')) return;
                        else if (self.model.guaranteeBillStatus.disGuaranteeBillRealId == true) return;

                        this.open(
                            'unit-m-hui',
                            'pages/select-guarantee-bill',
                            {
                                customerId: self.data.customerID,
                                useQuotaApplyId: this.value()
                            },
                            function (data) {
                                this.value(data);
                            }
                        );
                    },
                    setValue: function (billRealId) {
                        this.data = billRealId;
                        this.setText(billRealId ? '已绑定' : '');
                    },
                    getValue: function () {
                        return this.data || 0;
                    },
                    setDisabled: function () {
                        this.el.addClass('no-icon-next');
                        this.permDisabled = true;
                    },
                    validator: function (val) {
                        if (self.model.guaranteeBillStatus.value() && !val) {
                            return '请选择保底单';
                        }
                    }
                })
            }
        }));
        this.model.guaranteeBillStatus.on('change', function () {
            if (this.value() == 1) {
                self.model.guaranteeBillRealId.show();
            } else {
                self.model.guaranteeBillRealId.hide();
            }
        });
        if ((this.status.is('update') || this.status.is('pre-modify')) && this.data.guaranteeBillStatus == 1) {
            this.model.guaranteeBillStatus.setDisabled();
            this.model.guaranteeBillRealId.setDisabled();
        }
        this.updateControlState();
        nut.generate(this.model, [{
            children: ['id', 'schemeId','title', 'customerName', 'contractNo']
        }, {
            children: ['promCommission']
        }, {
            title: '方案内容',
            children: ['schemeShops','shops', 'couponOffers', 'dateInterval', 'settle', 'guaranteeBillStatus', 'guaranteeBillRealId']
        }], '.container');
        $('.static').removeClass('hide');
        this.data.schemeId = self.schemeId;
        !self.schemeId && this.model.schemeId.hide();
        this.model.value(this.data);
        this.model.guaranteeBillStatus.syncState();
    },
    bind: function() {
        $('#J_update,#J_submit').on(env.CLICK, function() {
            self.submit();
        });
        $('#J_delete').on(env.CLICK, function(){
            self.deleteScheme();
        });
        $('#J_enable_modify').on(env.CLICK, function(){
            self.showStatus = 'modify';
            self.status.set('modify', true);
            self.preModifyData = deep.copy(self.generateAjaxData());
            self.updateControlState();
        });
        $('#J_submit_modify, #J_modify_modify').on(env.CLICK, function(){
            self.preModifyData = deep.copy(self.generateAjaxData());
            self.submitModify();
        });
        $('#J_offline').on(env.CLICK, function() {
            if (!confirm('确认下线方案吗？')) return;
            ajax({
                url: 'schemeController/offline_scheme_all',
                data: {
                    schemeID: self.data.schemeBaseVO.id,
                    status: self.statusCode
                },
                // method: 'post',
                success: function() {
                    efte.publish(self.data.topic, {});
                    efte.action.back(true);
                },
                error: function(message) {
                    alert(message.message);
                }
            });
        });
        $('#J_drawback_submit').on(env.CLICK, function () {

            if (!confirm('确认撤销提交吗？')) return;
            ajax({
                url: 'schemeController/drawback',
                data: {
                    schemeID: self.data.schemeBaseVO.id
                },
                success: function() {
                    // efte.publish(self.data.topic, {});
                    // efte.action.back(true);
                    self.showStatus = 'modify';
                    self.status.set('modify', true);
                    self.preModifyData = deep.copy(self.generateAjaxData());
                    self.updateControlState();
                },
                error: function(message) {
                    alert(message.message);
                }
            })
        });
        $('#J_revoke_modify').on(env.CLICK, function () {
            if (!confirm('确认撤销变更吗？')) return;
            ajax({
                url: 'schemeController/drawback',
                data: {
                    schemeID: self.data.schemeBaseVO.id
                },
                success: function() {
                    self.showStatus = 'modify';
                    self.status.set('modify', true);
                    self.preModifyData = deep.copy(self.generateAjaxData());
                    self.updateControlState();
                },
                error: function(message) {
                    alert(message.message);
                }
            })
        });
        $('#J_withdraw_merchant').on(env.CLICK, function () {
            var text = self.statusCode == 8 ? "提交": "变更";
            if (!confirm('确认撤销' + text +'吗？')) return;
            ajax({
                url: 'schemeController/drawback',
                data: {
                    schemeID: self.data.schemeBaseVO.id
                },
                success: function() {
                    // efte.publish(self.data.topic, {});
                    // efte.action.back(true);
                    self.showStatus = 'modify';
                    self.status.set('modify', true);
                    self.preModifyData = deep.copy(self.generateAjaxData());
                    self.updateControlState();
                },
                error: function(message) {
                    alert(message.message);
                }
            })
        });
        $('#J_send_message').on(env.CLICK, function () {
            var btn = $(this);
            if (btn.hasClass('disabled')) return;
            toast.show('正在发送', true);
            ajax({
                url: 'schemeController/resendMerchantCheckSMS',
                data: {
                    schemeId: self.data.schemeBaseVO.id,
                    status: self.statusCode
                },
                success: function (res) {
                    if (res.msg) {
                        toast.show('发送成功', 1000);
                    } else {
                        toast.show('发送失败', 1000);
                    }
                },
                error: function () {
                    toast.show('发送失败', 1000);
                }
            })
        });
    },
    updateControlState: function(){
        var baseCtrlState = (this.showStatus === 'add' || this.showStatus === 'update' || this.showStatus == 'uncommitted') ? 'enable' : 'disable';
        this.model.forEach(function(control) {
            control[baseCtrlState]();
        });
        if (this.showStatus === 'modify') {
            this.model.guaranteeBillRealId.enable();
        }

        if (['update','uncommitted', 'modify','add'].indexOf(this.showStatus)>=0) {
            this.model.promCommission.enable();
        }
        this.model.guaranteeBillStatus.syncState();
        var buttons = [{
            id: 'J_offline',
            show: ['offline','!modify']
        }, {
            id: 'J_update',
            show: ['update']
        }, {
            id: 'J_delete',
            show: ['uncommitted']
        }, {
            id: 'J_submit',
            show: ['add', 'uncommitted']
        }, {
            id: 'J_enable_modify',
            show: ['offline', '!modify']
        }, {
            id: 'J_modify_modify',
            show: ['can-modify-again', '!modify']
        }, {
            id: 'J_submit_modify',
            show: ['modify']
        }, {
            id: 'J_drawback_submit',
            show: ['drawback', '!modify']
        },{
            id: 'J_revoke_modify',
            show: ['revoke', '!modify']
        },{
            id: 'J_withdraw_merchant',
            show: ['withdraw', '!modify']
        },{
            id: 'J_send_message',
          show: ['withdraw', '!modify']
        }];
        buttons.forEach(function(b){
            var pass = false;
            b.show.some(function (st) {
                if (st.charAt(0) === '!' && self.status.is(st.slice(1))) {
                    pass = false;
                    return true;
                } else if (self.status.is(st)) {
                    pass = true;
                }
            });
            if (pass) {
                $('#' + b.id).show();
            } else {
                $('#' + b.id).hide();
            }
        });
    },
    synchronizeShops: function(){
        var self = this;
        var data = {};
        var tempShop = {};
        $.extend(true, data, this.model.value());
        var couponOffers = data.couponOffers ? data.couponOffers.map(function(offer) {
                    offer.shops = offer.shops ? offer.shops.reduce(function(ret, shop){
                        if (_.findWhere(self.schemeShopsList, {shopID:shop.shopID})){
                            ret.push(shop);
                        }
                        return ret;
                    }, []) : [];

                    return offer;
                }):[];

        self.model.couponOffers.setValue(couponOffers);

        //更新门店联系人信息
        self.model.shops.setValue(self.schemeShopsList);
    },
    submit: function() {
        if (this.submitting) return;
        if (!validator(this.model, null, true)) return;
        this.submitting = true;
        toast.show('提交中…', true);
        var sendData = this.generateAjaxData();
        ajax({
            url: self.submitUrl,
            data: sendData,
            method: 'post',
            success: function() {
                efte.publish(self.data.topic, {});
                efte.action.back(true);
            },
            error: function(message) {
                alert(message.message);
                self.submitting = false;
                toast.hide();
            }
        });
    },
    submitModify: function(){
        var data = this.generateAjaxData();
        // if (deep.formCompare(this.preModifyData, data, {
        //         couponOffers:[{desc: true}]
        //     })) {
        //     window.alert('你还未做任何修改，请修改后再提交');
        //     return;
        // }
        var couponShops = _.flatten(data.couponOffers.map(function(e){
            return e.shops;
        }));
        var existShopIds = _.intersection(this.preModifyData.shops.map(function(e){
            return e.shopID;
        }), data.shops.map(function(e){
            return e.shopID;
        }));
        var existShops = existShopIds.reduce(function(result, shopID){
            var shop = _.findWhere(data.shops, {shopID: shopID});
            shop && result.push(shop);
            return result;
        }, []);
        var diffShops = existShops.reduce(function(result, shop){
            var shop = _.findWhere(couponShops, {shopID: shop.shopID});
            !shop && result.push(shop);
            return result;
        }, []);
        // if (diffShops.length) {
        //     if (!window.confirm('在优惠中有门店被移除，是否也在方案中删除？')) return;
        //     data.shops = _.filter(data.shops, function(e) {
        //         return diffShops.indexOf(e.shopID) >= 0;
        //     });
        // }
        this.submit();
    },
    deleteScheme: function(){
        if (this.deleting) return;
        if (!window.confirm('确认删除方案吗？')) return;
        this.deleting = true;
        toast.show('正在删除…', true);
        ajax({
            url: 'schemeController/delete_scheme',
            data: {
                schemeID: self.data.schemeBaseVO.id
            },
            // method: 'post',
            success: function(data) {
                efte.publish(self.data.topic, {});
                efte.action.back(true);
            },
            error: function(message) {
                alert(message.message);
            }
        });
    },
    // ajax data -> local data
    generateData: function(initParam, schemeData) {
        var res = _.extend({
            shops: [],
            guaranteeBillStatus: 0
        }, initParam);
        if (schemeData) {
            _.extend(res, schemeData.schemeBaseVO, schemeData);
            self.statusCode = schemeData.schemeBaseVO.status;
            self.status = Status(self.statusCode);
            self.showStatus = self.getShowStatus(self.statusCode);
            if (res.hasOwnProperty('type')) {
                res.settle = {
                    type: res.type,
                    typeName: env.settleType.list[env.settleType.index[res.type]].text,
                    unifiedBankcard: res.bankAccountVO ? res.bankAccountVO.accountID : null
                };
            }
            if (schemeData.schemeBaseVO.rejectMessage) {
                $('#reject-reason').text(schemeData.schemeBaseVO.rejectMessage).removeClass('hide');
            }
        } else {
            self.showStatus = 'add';
            self.status = Status();
            self.status.set('add', true);
            _.extend(res, initParam.preFillData);
        }
        efte.setTitle(self.showStatus === 'update' ? '重新提交闪惠方案' : (self.showStatus === 'add' ? '添加闪惠' : '查看闪惠'));
        return res;
    },
    getShowStatus: function(statusCode) {
        // if (statusCode === 40 || statusCode === 10 || statusCode === 60) return 'update';
        // if (statusCode === 30 || statusCode === 70) return 'online';
        // if (statusCode === 110) return 'modified';
        // if (statusCode === 150) return 'modify-verifying';
        // if (statusCode === 160 || statusCode === 140) return 'modify-submitted';
        // return 'view';


        if (statusCode === 1 || statusCode ===6) return 'uncommitted';
        if (statusCode === 2) return 'drawback';
        if (statusCode === 3) return 'offline';
        if (statusCode === 4 || statusCode ===7) return 'modify';
        if (statusCode === 5) return 'revoke';
        if (statusCode === 8 || statusCode === 9) return 'withdraw';

        return 'view';
    },
    // local data -> ajax data
    generateAjaxData: function() {
        var data = {};
        $.extend(true, data, this.model.value());

        var status = this.showStatus;
        if (data.dateInterval && data.dateInterval.beginDate && data.dateInterval.endDate) {
            data.beginDate = moment.utc(data.dateInterval.beginDate + " 00:00:00", 'YYYY-MM-DD HH:mm:ss').unix() * 1000 - 28800000;
            data.endDate = moment.utc(data.dateInterval.endDate + " 23:59:59", 'YYYY-MM-DD HH:mm:ss').unix() * 1000 - 28800000;
        }
        var res = {
            schemeBaseVO: _.pick(data, 'customerID', 'contractID', 'title', 'freeDate', 'promCommission', 'guaranteeBillStatus', 'guaranteeBillRealId','beginDate','endDate','schemeShops'),
            shops: data.shops,
            couponOffers: data.couponOffers ? data.couponOffers.map(function(offer) {
                offer.shops = offer.shops.reduce(function(result, shop){
                    shop.shopID && result.push({
                        shopID: shop.shopID,
                        shopName: shop.shopName
                    });
                    return result;
                }, []);
                return _.pick(offer,
                    'couponOfferId',
                    'onlineCouponOfferId',
                    'type',
                    'title',
                    'desc',
                    'full',
                    'cut',
                    'limitCount',
                    'detailDescs',
                    'beginDate',
                    'endDate',
                    'autoDelay',
                    'newTimePeriods',
                    'maxInventory',
                    'inventoryStatus',
                    'rules',
                    'shops',
                    'effectiveInHolidays',
                    'exceptTimePeriods',
                    'ticketIssueThreshold',
                    'ticketValidPeriod',
                    'quotaType',
                    'retailPrice',
                    'salePrice',
                    'businessAttribute'
                );
            }) : []
        };
        if (res.couponOffers.length && res.couponOffers[0].type == 4) {
            res.couponOffers = res.couponOffers ? res.couponOffers.map(function(couponOffer){
                couponOffer.shops = couponOffer.shops ? couponOffer.shops.reduce(function(result,shop){
                    var obj = _.findWhere(self.schemeShopsList, {shopID: shop.shopID});
                    obj = obj ? _.pick(obj, "shopID", "shopName") : null;
                    obj && result.push(obj);
                    return result;
                },[]): [];
                return couponOffer;
            }) : [];
        }

        res.schemeBaseVO.schemeShops = res.schemeBaseVO.schemeShops ? res.schemeBaseVO.schemeShops.map(function(shop){
            return _.pick(shop, "shopID", "shopName");
        }) : [];

        res.schemeBaseVO.type = data.settle.type;
        res.schemeBaseVO.bankAccountVO = {
            accountID: (this.defaultBankcard && this.defaultBankcard.accountID) || data.settle.unifiedBankcard
        };
        if (['update','uncommitted', 'modify', 'offline', 'drawback', 'revoke', 'withdraw'].indexOf(status) >=0){
            res.schemeBaseVO.id = this.data.id;
        }
        return res;
    }
};
