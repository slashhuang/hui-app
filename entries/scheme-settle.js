'use strict';
var efte = require('efte');
var $ = require('zepto-fix-issue');
var _ = require('underscore');
var nut = require('nut-hui');
var env = require('../lib/env');
var util = require('../lib/util');
var toast = util.toast;
var backAction = util.backAction;

var TabbedGroup = nut.collection.TabbedGroup;

var typeList = env.settleType.list;
var typeIndex = env.settleType.index;
var tips = [{
    type:0,
    bExist:false,
    msgs:["未绑定闪惠/闪付的默认银行账号，解决方案：",
        "1.在客户管理中找到对应的客户。",
        "2.选择“银行帐号”，找到正确的银行帐号，点击“设置默认”。",
        "3.勾选业务类型为“闪惠/闪付”。"],
},
{
    type:0,
    bExist:true,
    msgs:["若想修改银行账号，请参考以下操作步骤：",
        "1.在客户管理中找到对应的客户。",
        "2.选择“银行帐号”，找到正确的银行帐号，点击“设置默认”。",
        "3.勾选业务类型为“闪惠/闪付”。"],
},
{
    type:10,
    bExist:true,
    msgs:["若想修改银行账号，请参考以下操作步骤：",
        "1.在客户管理中找到对应的客户。",
        "2.选择“门店”，找到正确的门店，点击“详情”。",
        "3.在闪惠/闪付中点击“绑定银行帐号”。",
        "4.选择正确的银行帐号。"],
},
{
    type:10,
    bExist:false,
    msgs:["未绑定门店的闪惠/闪付银行账号，解决方案：",
        "1.在客户管理中找到对应的客户。",
        "2.选择“门店”，找到正确的门店，点击“详情”。",
        "3.在闪惠/闪付中点击“绑定银行帐号”。",
        "4.选择正确的银行帐号。"],
}];
module.exports = {
    init: function() {
        var _this = this;
        efte.setTitle('结算');
        efte.action.get(function(query){
            _this.topic = query.topic;
            _this.readOnly = query.readOnly;
            _this.type = query.type || 0;
            _this.bankcardList = query.bankcardList || [];
            _this.unifiedBankcard = query.unifiedBankcard || null;
            _this.shops = query.shops || [];
            _this.hasDefaultBankcard = query.hasDefaultBankcard;
            _this.generatePage();
            _this.toggleTips(_this.type, !!_this.unifiedBankcard);
            $(".tips").html(_.findWhere(tips, {type:_this.type,bExist:!!_this.unifiedBankcard}).msgs.join("</br>"));
            if (!_this.readOnly || _this.readOnly === 'partial') {
                _this.setButton();
            }
        });
    },
    toggleTips: function(type, unifiedBankcard){
        $(".tips").html(_.findWhere(tips, {type:type,bExist:!!unifiedBankcard}).msgs.join("</br>"));

    },
    BankcardControl: function(){
        var _this = this;
        return nut.control.AbstractLink.extend(function(){
            this.el.addClass('long-value');
        },{
            label: '银行卡',
            onTap: function(){
                if (this.disabled) return;
                this.open('unit-m-hui',
                    'pages/select-bankcard',
                    {
                        bankcardList: _this.bankcardList,
                        selected: this.accountID
                    },
                    function(data){
                        this.value(data.value);
                    },
                    true
                )
            },
            setValue: function(value) {
                this.accountID = value;
                if (this.accountID) {
                    var bankcard = _this.getBankcard(value);
                    bankcard && this.setText(bankcard.bankAccountName + '(' + bankcard.bankName + ')\n' + bankcard.bankAccountNumber);
                } else {
                    this.setText('');
                }
            },
            getValue: function(){
                return this.accountID;
            }
        });
    },
    getBankcard: function(accountID){
        var res = null;
        this.bankcardList.some(function(item){
            if (item.accountID == accountID) {
                res = item;
                return true;
            }
        });
        return res;
    },
    generateBranchList : function(values){
        var _this = this;
        var mapping = {};
        var layout = [];
        var initData = {};
        values.forEach(function(value, index){
            var name = 'shop_' + index;
            var bankcard = 'bankcard_' + index;
            mapping[name] = nut.control.StaticInput.extend({
                label: value.shopName,
                id: value.shopID,
                getValue: function(){ return this.id; }
            });
            mapping[bankcard] = _this.BankcardControl();
            layout[index] = {children: [name, bankcard]};
            initData[bankcard] = value.bankAccountVO ? value.bankAccountVO.accountID : null;

        });
        return {
            mapping: mapping,
            layout: layout,
            initData: initData
        }
    },
    generateBranchData: function(data){
        var shops = [];
        var res = {};
        var matchShop = /^shop_(\d+)$/;
        var matchBankcard = /^bankcard_(\d+)$/;
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var num, label;
                var r = matchShop.exec(key);
                if (r) {
                    label = 'shopID';
                } else {
                    r = matchBankcard.exec(key);
                    if (r) {
                        label = 'bankcard';
                    } else continue;
                }
                num = parseInt(r[1]);
                if (!shops[num]) {
                    shops[num] = {};
                }
                shops[num][label] = data[key];
            }
        }
        shops.forEach(function(val){
            res[val.shopID] = val.bankcard;
        });
        return res;
    },
    generatePage: function(){
        var _this = this;
        var branchListConfig = this.generateBranchList(this.shops);
        this.model = new (nut.property.Composite.extend({
            mapping: _.extend({
                type: nut.control.SingleSelectInline.extend({
                    label: '类型',
                    options: typeList
                }),
                unifiedBankcard: _this.hasDefaultBankcard && !_this.readOnly ?
                    this.BankcardControl().extend({
                        onTap: function(){
                            // toast.show('同一客户的其他闪惠方案已有统一结算银行卡，此处不能修改');
                            window.setTimeout(function(){
                                toast.hide();
                            }, 2000);
                        }
                    }) : this.BankcardControl()
            }, branchListConfig.mapping)
        }));

        var unifiedLayout = [{children: ['unifiedBankcard']}];
        var seperatedLayout = branchListConfig.layout;
        this.tabs = new TabbedGroup({
            model: this.model,
            config: [unifiedLayout, seperatedLayout],
            selected: typeIndex[this.type]
        });
        nut.generate(this.model, [{
            children: ['type']
        },
            this.tabs
        ]);
        this.model.value(_.extend({
            type: this.type,
            unifiedBankcard: this.unifiedBankcard
        }, branchListConfig.initData));
        this.model.forEach(function(control, name) {
            if (name === 'type' || name === 'unifiedBankcard') {
                if (_this.readOnly) {
                    control.disable();
                }
            } else if (_this.readOnly === true) {
                control.disable();
            }
        });
        this.bindEvents();
    },
    bindEvents: function() {
        var _this = this;
        this.model.type.on('change', function(){
            _this.tabs.setSelected(typeIndex[this.value()]);
            _this.toggleTips(this.value(), !!_this.unifiedBankcard);
        });
    },
    setButton: function() {
        var _this = this;
        backAction(function(back) {
            var value = _this.model.value();
            var result = {
                type: value.type,
                typeName: typeList[typeIndex[value.type]].text,
                unifiedBankcard: value.unifiedBankcard,
                shops: _this.generateBranchData(value)
            };
            if (_this.readOnly !== true && _this.readOnly !== "partial") {
                // validation
                var valid = true;
                var msg = '';
                if (result.type === 0) {    // 统一结算
                    valid = !!result.unifiedBankcard;
                    msg = '请选择银行卡';
                } else if (result.type === 10) {    // 分店结算
                    valid = _.every(result.shops);
                    msg = '请为每家分店选择银行卡';
                }
                if (!valid) {
                    if (confirm(env.confirm_invalid_with_title({msg: msg}))) {
                        efte.action.back(true);
                    }
                    return;
                }
            }
            efte.publish(_this.topic, result);
            back();
        });
    }
};
