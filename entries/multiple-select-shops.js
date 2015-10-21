'use strict';
var efte = require('efte');
var $ = require('zepto-fix-issue');
var _ = require('underscore');
var util = require('../lib/util');
var templateFactory = require('../util/template-factory');
var env = require('../lib/env');
var ajax = util.ajax;
var toast = util.toast;
var backAction = util.backAction;

var cacheShops = [];


module.exports = {
    init: function() {
        var self = this;
        this.pageSize = 10;

        this.itemList = $('#list');
        this.templates = templateFactory('item');

        this.resetPage();

        efte.action.get(function(query) {

            efte.setTitle(query.title);
            self.schemeId = query.schemeId;
            self.readOnly = query.readOnly;
            self.data = query.data.shops ? query.data : {shops: query.data};
            self.customerID = query.customerID;
            self.topic = query.topic;
            self.couponOfferShopIds = query.couponOfferShopIds || [];

            //如果是只读的，则展示已经有的门店，如果可编辑的，则展示对应客户下面的门店信息
            if (!self.readOnly) {
                self.fetchData();
                self.itemList.on("tap", 'li', function() {
                    self.toggle(this);
                });
                // self.bindScroll();
            }else{
                self.data.shops = self.data && self.data.shops ? self.data.shops : [];
                self.data.shops.forEach(function(shop) {
                    shop.selected = true;
                    shop.isChoose = true;
                    shop.conflictMsg = shop.conflictMsg ? shop.conflictMsg : "";
                });
                self.renderItems(self.data.shops);
            }
            self.setButton();
        });


    },
    setButton: function() {
        var self = this;
        backAction(function(back) {
            var shops = self.readOnly == false ? self.getSelectedShops() : self.data.shops;
            if (!shops || !shops.length){
               if (confirm(env.confirm_invalid_with_title({msg: '请至少选择一个门店'}))) {
                    efte.action.back(true);
                } 
                return;
            }
            efte.publish(self.topic, shops);
            back();
        });
    },
    toggle: function(el) {
        var input = $(el).find('input.enable');
        var shopId = $(el).data().shopId;
        if (this.checkShopCouponoffers(shopId)){
            if(!confirm('该门店已经存在于本方案的优惠中，在此删除该门店，也就将删除优惠中的门店。确认删除操作吗？')) return;
            this.couponOfferShopIds = _.without(this.couponOfferShopIds, shopId);
        }

        input.prop('checked', !input.prop('checked'));
    },
    checkShopCouponoffers: function(shopId){
        return this.couponOfferShopIds.indexOf(shopId) >= 0;
    },
    renderItems: function(items) {
        this.itemList.append(items.map(this.templates.item).join(''));
    },

    getSelectedShops: function() {
        var self = this;
        var ret = [];
        this.itemList.find('li').each(function() {
            var el = $(this);
            if (el.find('input').prop('checked')) {
                ret.push(el.data());
            }
        });
        return ret.map(function(item) {
            item.shopId = item.shopId - 0;
            item = _.findWhere(self.cacheShops, {shopID: item.shopId});
            return item;
        });
    },

    resetPage: function() {
        this.itemList.empty();
        this.pageIndex = 1;
        this.pageIsEnd = false;
    },

    fetchData: function(callback) {
        var self = this;
        var data = {};
        if (this.loading) {
            return;
        }


        if (this.pageIsEnd) {
            return;
        }

        this.loading = true;

        toast.show();
        this.hideNoRecord();

        data = self.schemeId ? {
                customerID: self.customerID,
                schemeId: self.schemeId
            }: {
                customerID: self.customerID
            };
        ajax({
            url: 'schemeController/get_shops',
            data: data,
            success: function(data) {
                self.loading = false;
                data.message = data.msg;
                self.cacheShops = data.msg;

                var selected = {};
                self.data.shops = self.data && self.data.shops &&  Object.prototype.toString.call(self.data.shops) === '[object Array]'? self.data.shops : [];
                self.data.shops.forEach(function(shop) {
                    selected[shop.shopID] = true;
                });

                data.message.forEach(function(it) {
                    it.selected = !!selected[it.shopID];
                });


                self.renderItems(data.message);

                if (data.message.length < self.pageSize) {
                    self.pageIsEnd = true;
                    if (!data.message.length && self.pageIndex === 1) {
                        self.showNoRecord();
                    }
                }

                self.pageIndex++;

                if (callback) {
                    callback();
                }
                
                toast.hide();
            },

            error: function(message) {
                self.loading = false;
                alert(message);
                efte.stopRefresh();
                toast.hide();
            }
        })
    },

    bindScroll: function() {
        var self = this;
        var win = $(window);
        var doc = $(document);
        win.on('scroll', function() {
            if (win.scrollTop() + win.height() > doc.height() - 100) {
                self.fetchData();
            }
        });
    },

    showNoRecord: function() {
        $('<div id="no_record"/>').addClass('empty-list').text('没有搜到相关门店').appendTo(document.body);
    },

    hideNoRecord: function() {
        $('#no_record').remove();
    }
}