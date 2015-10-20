'use strict';
var efte = require('efte');
var moment = require('moment');
var env = require('../lib/env');
var $ = require('zepto-fix-issue');
var nut = require('nut-hui');
var util = require('../lib/util');
var _ = require('underscore');
var validator = require("../util/validator");
var ajax = util.ajax;
var backAction = util.backAction;
var toast = util.toast;

var defaultCoupon = {
    couponOfferId: 0,
    onlineCouponOfferId: 0,
    type: 3,
    inventoryStatus: 0,
    newTimePeriods: [],
    dateInterval: {
        beginDate: '',
        endDate: ''
    },
    autoDelay: 1,
    shops: []
};

var weekMap = {
    '1': '周日',
    '2': '周一',
    '3': '周二',
    '4': '周三',
    '5': '周四',
    '6': '周五',
    '7': '周六'
};

var TypeConfig = {
    all: ['rules', 'full', 'cut', 'limitCount'],
    '1': ['rules'],
    '2': [],
    '3': ['full', 'cut', 'limitCount']
};

function format(time) {
    if (!time) return '';
    if (time.toString().split('-').length === 3) return time;
    var day = new Date(time);
    return day.getFullYear() + "-" + parseInt(day.getMonth() + 1) + "-" + day.getDate();
}

module.exports = {
    init: function() {
        var self = this;
        this.models = [];
        efte.setTitle('优惠类型');
        efte.action.get(function(query) {
            self.customerID = query.customerID;
            self.topic = query.topic;
            self.readOnly = query.readOnly;
            self.couponOffers = query.couponOffers || [];

            self.branchList = query.branchList;

            if (!self.readOnly && !self.branchList.length) {
                window.alert('请先选择适用门店');
                efte.action.back();
                return;
            }

            if (!self.couponOffers.length) {
                self.addCoupon();
            } else {
                self.couponOffers.forEach(function(it) {
                    self.addCoupon(self.genShowData(it));
                });
            }
            self.bind();
            !self.readOnly && self.setButton();
        });
    },
    addCoupon: function(showCoupon) {
        var self = this;
        var i = this.models.length;
        showCoupon = showCoupon || defaultCoupon;
        var container = $('<div class="group-container"></div>').insertBefore('.J_add_item');
        var model = new(nut.property.Composite.extend({
            mapping: {
                onlineCouponOfferId: nut.control.Abstract.extend({
                    setValue: function(val){
                        this.data = val || 0;
                    },
                    getValue: function(){
                        return this.data;
                    }
                }),
                couponOfferId: nut.control.Abstract.extend({
                    setValue: function(val){
                        this.data = val || 0;
                    },
                    getValue: function(){
                        return this.data;
                    }
                }),
                type: nut.control.SingleSelectInline.extend(
                    function() {
                        this.el.addClass('cp-switch-coupon');
                    }, {
                        label: '优惠类型',
                        options: [{
                            "value": 3,
                            "text": '满减'
                        },{
                            "value": 1,
                            "text": "折扣"
                        }, {
                            "value": 2,
                            "text": "赠送"
                        }]
                    }),
                title: nut.control.Textbox.extend(function(){
                    this.input.attr('maxlength', 13);
                }, {
                    label: '优惠标题',
                    required: true
                }),
                /*desc: nut.control.Textbox.extend(
                    function() {
                        this.addValidator(function() {
                            var value = this.input.val();
                            if (value.length > 13) {
                                return '最多填写13个汉字';
                            }
                        });
                    }, {
                        label: '描述',
                        required: true,
                        placeholder: '这里是详细描述，最多13字'
                    }),*/
                desc: nut.property.Abstract.extend({
                    getValue: function() {
                        return '未填写';
                    },
                    setValue: function() {},
                    enable: function() {},
                    disable: function() {}
                }),
                rules: nut.control.Numberbox.extend(
                    function() {
                        this.addValidator(function() {
                            var value = this.input.val();
                            var val = Number(value);
                            if (isNaN(val)) {
                                return '必须填写数字';
                            } else if (!/^\d+$/.test(value)) {
                                return '请填写整数';
                            } else if (val <= 0 || val >= 100) {
                                return '请填写1至99的值';
                            }
                        });
                    }, {
                        label: '折扣%',
                        required: true,
                        attrs: {
                            pattern: '\\d*'
                        },
                        placeholder: '8折请填写80',
                        getValue: function() {
                            var value = this.input.val();
                            if (value === '') {
                                return null;
                            }
                            var iv = value - 0;
                            if (isNaN(iv)) {
                                return null;
                            }
                            return iv / 100;
                        },
                        setValue: function(val) {
                            val = Number(val);
                            if (isNaN(val)) {
                                val = '';
                            } else {
                                val = val * 100;
                            }
                            this.input.val(val);
                        }
                    }
                ),
                full: nut.control.Numberbox.extend(function(){
                    this.el.addClass('control-half');
                    this.addValidator(function() {
                        var value = this.input.val();
                        var val = Number(value);
                        if (isNaN(val)) {
                            return '必须填写数字';
                        } else if (!/^\d+(?:\.\d*)?$/.test(value)) {
                            return '请填写数字';
                        }
                    });
                },{
                    label: '每满',
                    required: true,
                    getValue: function() {
                        return this.input.val();
                    }
                }),
                cut: nut.control.Numberbox.extend(function(){
                    this.el.addClass('control-half control-half-end');
                    this.addValidator(function() {
                        var value = this.input.val();
                        var val = Number(value);
                        if (isNaN(val) || !/^\d+(?:\.\d*)?$/.test(value)) {
                            return '必须填写数字';
                        }
                    });
                },{
                    label: '立减',
                    required: true,
                    getValue: function() {
                        return this.input.val();
                    }
                }),
                limitCount: nut.control.Textbox.extend(function(){
                    this.input.attr('placeholder', '不填则无限制');
                    this.addValidator(function(){
                        var value = this.input.val();
                        if (value === '') return;
                        var val = Number(value);
                        if (isNaN(val) || !/^\d+$/.test(value)) {
                            return '必须填写大于等于0的数字';
                        }
                    });
                }, {
                    label: '最高减几次',
                    getValue: function(){
                        return Number(this.input.val());
                    },
                    setValue: function(val){
                        if (!val) {
                            this.input.val('');
                        } else {
                            this.input.val(val);
                        }
                    }
                }),
                detailDescs: nut.control.AbstractLink.extend({
                    label: '限制条件',
                    onTap: function(){
                        this.open('unit-m-hui',
                            'pages/detail-descs',
                            {
                                readOnly: self.readOnly,
                                value: this.value()
                            },
                            function(data){
                                this.value(data);
                        });
                    },
                    getValue: function(){
                        return this.data || [];
                    },
                    setValue: function(data){
                        this.data = data || [];
                        this.setText(this.data.length + '条');
                    }
                }),
                inventoryStatus: nut.control.SingleSelectInline.extend(
                    function() {
                        this.el.addClass('cp-switch-amount');
                    }, {
                        label: "库存",
                        required: true,
                        options: [{
                            "value": 0,
                            "text": "不限量"
                        }, {
                            "value": 1,
                            "text": "限量"
                        }]
                    }),
                maxInventory: nut.control.Numberbox.extend(
                    function() {
                        this.el.addClass('cp-amount-ipt hide');
                        this.addValidator(function() {
                            var value = this.input.val();
                            var val = Number(value);
                            if (isNaN(val)) {
                                return '必须填写数字';
                            } else if (!/^\d+$/.test(value)) {
                                return '请填写整数';
                            }
                        });
                    }, {
                        label: '库存量',
                        required: true,
                        placeholder: '输入库存量'
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
                        label: '优惠有效期',
                        required: true,
                        onTap: function() {
                            this.open(
                                'unit-m-hui',
                                'pages/date-interval', {
                                    title: '优惠有效期',
                                    readOnly: self.readOnly,
                                    dateInterval: self.models[i].dateInterval.value()
                                },
                                function(obj) {
                                    this.value(obj);
                                }
                            );
                        },
                        setValue: function(val) {
                            this.data = val;
                            this.setText(format(val.beginDate) + ' ' + format(val.endDate));
                        },
                        getValue: function() {
                            return this.data;
                        },
                        disable: function() {}
                    }),
                autoDelay: nut.control.SingleSelectInline.extend({
                    label: '是否自动延期30天',
                    required: true,
                    options: [{
                        value: 1,
                        text: '是'
                    },{
                        value: 0,
                        text: '否'
                    }]
                }),
                newTimePeriods: nut.control.AbstractLink.extend(
                    function() {
                        this.addValidator(function() {
                            var timePeriods = this.value();
                            if (!timePeriods.length) {
                                return '必选';
                            }
                        });
                    }, {
                        label: '使用时间',
                        required: true,
                        onTap: function() {
                            var control = this;
                            this.open(
                                'unit-m-hui',
                                'pages/time-period', {
                                    title: '使用时间',
                                    readOnly: self.readOnly,
                                    data: control.value() || []
                                },
                                function(obj) {
                                    this.value(obj);
                                }
                            );
                        },
                        setValue: function(data) {
                            this.data = data;
                            this.setText(data.length > 0 ? '已设置' : '');
                        },
                        getValue: function() {
                            return this.data;
                        },
                        disable: function() {}
                    }),
                dateExcept: nut.control.AbstractLink.extend({
                    label: '不可用日期',
                    onTap: function(){
                        this.open(
                            'unit-m-hui',
                            'pages/date-except',
                            {
                                readOnly: self.readOnly,
                                data: this.data
                            }, function(data){
                                this.value(data);
                            }
                        )
                    },
                    getValue: function(){
                        return this.data;
                    },
                    setValue: function(data){
                        this.data = data || {effectiveInHolidays: true};
                        var text = [];
                        if (!this.data.effectiveInHolidays) {
                            text.push('节假日');
                        }
                        if (this.data.exceptTimePeriods && this.data.exceptTimePeriods.length) {
                            text.push(this.data.exceptTimePeriods.length + '个自定义日期');
                        }
                        this.setText(text.join('+') || '无');
                    }
                }),
                shops: nut.control.AbstractLink.extend(function (argument) {
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
                            'pages/select-shops',
                            {
                                title: "选择门店",
                                readOnly: self.readOnly,
                                required: true,
                                customerID: self.customerID,
                                data: this.data,
                                branchList: self.branchList
                            }, function(data){
                                this.value(data);
                            }
                        )
                    },
                    getValue: function(){
                        return this.data.shops;
                    },
                    setValue: function(data){
                        data && data.shops && this.setText(data.shops.length || '未设置');
                        this.data = data?data:{shops: []};
                    }
                }),
                deleteCoupon: nut.control.AbstractLink.extend(function(){
                    this.el.addClass('no-icon-next text-center');
                }, {
                    label: '删除本组优惠',
                    onTap: function(){
                        if (!window.confirm('确定删除该组优惠吗？')) return;
                        self.deleteCoupon(model);
                    },
                    getValue: function(){},
                    setValue: function(){}
                })
            }
        }));
        this.models.push(model);
        nut.generate(model, [{
            title: '优惠',
            children: ['type', 'title', 'desc', 'rules', 'full', 'cut', 'limitCount', 'detailDescs', 'inventoryStatus', 'maxInventory', 'dateInterval', 'autoDelay', 'newTimePeriods', 'dateExcept', 'shops'].concat(this.readOnly ? [] : 'deleteCoupon')
        }], container);
        model.container = container;
        model.value(showCoupon);
        this.initSwitch(model);
        model.forEach(function(control) {
            control[self.readOnly ? 'disable' : 'enable']();
        });
        model.addValidator(function(){
            if (this._properties.type.value() == 3) {
                if (+this._properties.full.value() <= +this._properties.cut.value()) {
                    return '“每满”金额必须大于“立减”金额';
                }
            }
        });
        model.title.el[model.type.value() == 2 ? "show" : "hide"]();
    },
    setTitleView: function(model){
        model.title.el[model.type.value() == 2 ? "show" : "hide"]();
    },
    initSwitch: function(model) {
        var _this = this;
        model.type.on("change", function() {
            _this.selectType(model, true);
        });
        model.inventoryStatus.on("change", function() {
            model.maxInventory[model.inventoryStatus.value() ? "show" : "hide"]();
        });
        this.selectType(model);
        model.maxInventory[model.inventoryStatus.value() ? "show" : "hide"]();
    },
    generateTitle: function(data){
        var type = data.type,
            title = "";
        switch (type) {
            case 1:
                title = "";
                title += data.rules ? (data.rules*10 + "折") : "";
                break;
            case 2: 
                title = "";
                title = data.title;
                break;
            case 3:
                title = ""
                title += (data.full ? "满" : "") + data.full;
                title += (data.cut ? "减" : "") + data.cut;
                break;
        }

        return title;
    },
    selectType: function(model, autoTitle) {
        autoTitle && this.setTitleView(model);
        var show = TypeConfig[model.type.value()],
            all = TypeConfig.all;
        if (!show) return;
        for (var i = 0; i < all.length; i++) {
            if (show.indexOf(all[i]) >= 0) {
                model[all[i]].show();
            } else {
                model[all[i]].hide();
            }
        }
    },
    deleteCoupon: function(model){
        if (this.readOnly) return;
        var index = this.models.indexOf(model);
        if (index < 0) return;
        model.container.remove();
        this.models.splice(index, 1);
        if (this.models.length === 0) {
            window.scrollTo(0, 0);
        }
    },
    bind: function() {
        var self = this;
        $('.J_add_item').on(env.CLICK, function() {
            self.addCoupon();
        });
    },
    // ajax data -> local data
    genShowData: function(data) {
        var showCoupon = _.extend({}, defaultCoupon, data);
        showCoupon.dateInterval = {
            beginDate: format(data.beginDate) || '',
            endDate: format(data.endDate) || ''
        };
        showCoupon.dateExcept = {
            effectiveInHolidays: data.effectiveInHolidays,
            exceptTimePeriods: data.exceptTimePeriods || []
        };

        showCoupon.shops = {shops: data.shops};

        return showCoupon;
    },
    // local data -> ajax data
    genAjaxData: function(data) {
        data.title = this.generateTitle(data);
        var thisCoupon = _.extend({}, _.pick(data, 'onlineCouponOfferId', 'couponOfferId', 'type', 'title', 'desc', 'rules', 'full', 'cut', 'limitCount', 'detailDescs', 'shops','inventoryStatus', 'autoDelay','maxInventory', 'newTimePeriods'));
        if (data.dateInterval && data.dateInterval.beginDate && data.dateInterval.endDate) {
            thisCoupon.beginDate = moment.utc(data.dateInterval.beginDate + " 00:00:00", 'YYYY-MM-DD HH:mm:ss').unix() * 1000 - 28800000;
            thisCoupon.endDate = moment.utc(data.dateInterval.endDate + " 23:59:59", 'YYYY-MM-DD HH:mm:ss').unix() * 1000 - 28800000;
        }
        //处理一下门店数据，因为只关心门店的shopId和shopName
        thisCoupon.shops = data.shops ? data.shops.reduce(function(result, shop){
            result.push({
                shopID: shop.shopID,
                shopName: shop.shopName
            });
            return result;
        }, []):[];
        _.extend(thisCoupon, data.dateExcept);
        return thisCoupon;
    },
    bindEvent: function(){
        model.type.on("change", function() {
            _this.selectType(model, true);
        });
    },
    setButton: function() {
        var self = this;
        $('.J_add_item').show();
        backAction(function(back) {
            if (self.models.length === 0) {
                back(true);
                efte.publish(self.topic, []);
                return;
            } 
            var couponList = [];
            var publishCouponList = [];
            for (var j = 0; j < self.models.length; j++) {
                var thisModel = self.models[j];
                if (!validator(thisModel, '优惠' + (j + 1) + ' ')) return;
                var data = thisModel.value();
                var coup = self.genAjaxData(data);
                var publishCoup = {};
                
                couponList.push(coup);
                $.extend(true, publishCoup, coup);

                publishCoup.shops = data.shops;
                publishCouponList.push(publishCoup);
            }
            toast.show('保存中', true);
            ajax({
                url: 'schemeController/validate_couponOffer',
                data: couponList,
                method: 'post',
                success: function() {
                    efte.publish(self.topic, publishCouponList);
                    back(false);
                },
                error: function(message) {
                    toast.hide();
                    alert(message.message);
                }
            });
        });
    }
};
