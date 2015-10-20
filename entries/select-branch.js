'use strict';
var $ = require('zepto-fix-issue');
var _ = require('underscore');
var env = require('../lib/env');
var util = require('../lib/util');
var ajax = util.ajax;
var efte = require('efte');
var backAction = util.backAction;

module.exports = {
    init: function() {
        this.template = _.template($('.template').html());
        window.template = this.template;
        this.container = $('.list');
        var _this = this;
        efte.setTitle('门店联系人');
        efte.action.get(function(data) {
            _this.topic = data.topic;
            _this.data = data;
            _this.branchList = _this.data.branchList;
            _this.customerId = _this.data.customerId;
            if (_this.branchList.length === 0) {
                alert('请先去优惠信息中添加门店');
                efte.action.back();
                return;
            }
            for (var i = 0; i < _this.data.branchList.length; i++) {
                var item = _this.render(_.extend(_this.data.branchList[i], {readOnly: _this.data.readOnly}));
                _this.container.append(item);
                if (_this.data.branchList[i].selected) {
                    item.find('.dropdown').removeClass('hide');
                }
            }
            _this.bind();
            if (_this.data.readOnly) {
                $('.contactName').prop('readonly', true);
                $('.contactPhone').prop('readonly', true);
            }
            !_this.data.readOnly && _this.setButton();
        });
    },
    render: function(data) {
        data.selected = true;
        return $(this.template(data));
    },
    bind: function() {
        var _this = this;
        this.container.on(env.CLICK, '.js-edit-notifiee', function () {
            var shopLi = $(this).parents('.cp-shop-list');
            efte.action.open('unit-m-hui', 'pages/shop-notifiee', {
                shopId: shopLi.data('shopid'),
                customerId: _this.customerId,
                shopName: shopLi.data('shopname')
            });
        }).on(env.CLICK, '.dropdown', function(e) {
            e.stopImmediatePropagation();
        }).on(env.CLICK, '.cp-shop-list', function() {
            if (_this.data.readOnly) {
                return;
            }
            var checkbox = $(this).find('input');
            var infoInput = $(this).find('.dropdown');
            checkbox.prop('checked', !checkbox.prop('checked'));
            infoInput.toggleClass('hide');
        });
    },
    setButton: function() {
        var _this = this;
        backAction(function(back) {
            var tmpBranchList = [];
            var selectedShops = [];
            var num = 0;
            var dataComplete = true;
            var unfinishedShops = []; //未完成信息的门店编号
            _this.container.find('.cp-shop-list').each(function() {
                var it = $(this);
                // var selected = !!$(this).find('.checkbox input').prop('checked');
                //add by zq
                var selected = true; //由于门店转入优惠中选择，现在买单信息都是必填的


                selected && num++;
                var branchData = {
                    shopID: it.data('shopid'),
                    // shopName: decodeURIComponent(it.data('shopName')),
                    shopName: it.data('shopname'),
                    contactName: it.find('.contactName').val().trim(),
                    contactPhone: it.find('.contactPhone').val().trim(),
                    selected: selected
                };
                tmpBranchList.push(branchData);
                if (branchData.selected) {
                    if (!branchData.contactName || !/^\d{11}$/.test(branchData.contactPhone)) {
                        dataComplete = false;
                        unfinishedShops.push(num);
                    }
                    selectedShops.push(branchData);
                }
            });
            if (!dataComplete) {
                var msg = '请填写第' + unfinishedShops.join(",") + '个分店联系人姓名及正确的手机号码';
                if (confirm(env.confirm_invalid_with_title({msg: msg}))) {
                    efte.action.back(true);
                }
                return;
            }

            efte.publish(_this.topic, {
                branchList: tmpBranchList,
                num: num
            });
            back();
            /*// check notifiee
            var params = selectedShops.map(function (shop) {
                return 'shopId=' + shop.shopID;
            }).join('&');
            util.toast.show('保存中', true);
            util.ajax({
                url: 'shopNotifiersController/get_shopnotifiers_byshopids?' + params,
                method: 'get',
                success: function (res) {
                    var diffIds = _.difference(_.pluck(selectedShops, 'shopID'), _.pluck(res.msg, 'shopId'));
                    if (diffIds.length) {
                        util.toast.hide();
                        var shopNames = _.pluck(_.filter(selectedShops, function (shop) {
                            return diffIds.indexOf(shop.shopID) >= 0;
                        }), 'shopName').join(', ');
                        alert('以下门店未填写买单通知人：' + shopNames);
                    } else {
                        efte.publish(_this.topic, {
                            branchList: tmpBranchList,
                            num: num
                        });
                        back();
                    }
                },
                error: function () {
                    util.toast.hide();
                    alert('获取数据失败，请重试');
                }
            });*/

        });
    }
};