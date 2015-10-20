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
            self.readOnly = query.readOnly;
            self.data = query.data.shops ? query.data : {shops: query.data};
            self.customerID = query.customerID;
            self.topic = query.topic;
            self.branchList = query.branchList;
            self.render();


            !self.readOnly && self.itemList.on("tap", 'li', function() {
                self.toggle(this);
            });
            // self.bindScroll();

            self.setButton();
        });


    },
    setButton: function() {
        var self = this;
        backAction(function(back) {
            var shops = self.readOnly == false ? self.getSelectedShops() : self.data.shops;
            efte.publish(self.topic, {
                shops: shops
            });
            if (!shops || !shops.length){
               if (confirm(env.confirm_invalid_with_title({msg: '请至少选择一个门店'}))) {
                    efte.action.back(true);
                } 
                return;
            }

            back();
        });
    },
    toggle: function(el) {
        var input = $(el).find('input');
        input.prop('checked', !input.prop('checked'))
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
            item.shopID = item.shopId - 0;  
            return item;
        });
    },

    resetPage: function() {
        this.itemList.empty();
        this.pageIndex = 1;
        this.pageIsEnd = false;
    },

    render: function(){
        var self = this;
        var selected = {};
        self.data.shops = self.data && self.data.shops &&  Object.prototype.toString.call(self.data.shops) === '[object Array]'? self.data.shops : [];
        self.data.shops.forEach(function(shop) {
            selected[shop.shopID] = true;
        });

        self.branchList.forEach(function(it) {
            it.selected = !!selected[it.shopID];
        });

        self.renderItems(self.branchList);
    },
    fetchData: function(callback) {
        var self = this;

        if (this.loading) {
            return;
        }


        if (this.pageIsEnd) {
            return;
        }

        this.loading = true;

        toast.show();
        this.hideNoRecord();

        ajax({
            url: 'schemeController/get_shops',
            data: {
                customerID: self.customerID
            },
            success: function(data) {
                self.loading = false;
                data.message = data.msg;
                self.cacheShops = data.msg;

                //add by zq
                var selected = {};
                self.data.shops = self.data && self.data.shops &&  Object.prototype.toString.call(self.data.shops) === '[object Array]'? self.data.shops : [];
                self.data.shops.forEach(function(shop) {
                    selected[shop.shopID] = true;
                });

                data.message.forEach(function(it) {
                    it.selected = !!selected[it.shopID];
                });

                //end zq

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