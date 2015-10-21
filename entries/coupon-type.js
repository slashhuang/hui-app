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

var self = module.exports = {
    model: {
        isNormal: false,
        isVoucher: false,
        isRation: false,
        goNormal: function () {
            var query = self.query;
            if (self.model.isVoucher ) {
                if (confirm('您已经添加过“送券”，重新添加“满减折扣赠品”会覆盖之前的优惠内容，是否继续添加？')) {
                    query = _.extend({}, query, {couponOffers: []})
                } else return;
            }else if(self.model.isRation ){
                if (confirm('您已经添加过“定额优惠”，重新添加“满减折扣赠品”会覆盖之前的优惠内容，是否继续添加？')) {
                    query = _.extend({}, query, {couponOffers: []})
                } else return;
            }
            efte.action.open('unit-m-hui', 'pages/scheme-coupon.html', query);
        },
        goVoucher: function () {
            var query = self.query;
            if (self.model.isNormal){
                if (confirm('您已经添加过“满减折扣赠品”，重新添加“送券”会覆盖之前的优惠内容，是否继续添加？')) {
                    query = _.extend({}, query, {couponOffers: []})
                } else return;
            }else if(self.model.isRation){
                if (confirm('您已经添加过“定额优惠”，重新添加“送券”会覆盖之前的优惠内容，是否继续添加？')) {
                    query = _.extend({}, query, {couponOffers: []})
                } else return;
            }
            efte.action.open('unit-m-hui', 'pages/scheme-coupon-2.html', query);
        },
        goRation: function () {
            var query = self.query;
            if (self.model.isVoucher){
                if (confirm('您已经添加过“送券”，重新添加“定额优惠”会覆盖之前的优惠内容，是否继续添加？')) {
                    query = _.extend({}, query, {couponOffers: []})
                } else return;
            }else if(self.model.isNormal){
                if (confirm('您已经添加过“满减折扣赠品”，重新添加“定额优惠”会覆盖之前的优惠内容，是否继续添加？')) {
                    query = _.extend({}, query, {couponOffers: []})
                } else return;
            }
            efte.action.open('unit-m-hui', 'pages/scheme-coupon-3.html', query);
        }
    },
    init: function () {
        this.view = rivets.bind($('#container').get(0), this.model);
        efte.action.get(function (query) {
            self.query = query;
            if (query.couponOffers.length) {
                if(query.couponOffers[0].type == 4){
                    self.model.isVoucher = true;
                }else if(query.couponOffers[0].type == 6){
                    self.model.isRation = true;
                }else{
                    self.model.isNormal = true;
                }

            }
            efte.subscribe(query.topic, function (res) {
                self.query.couponOffers = res;
                efte.action.back();
            });
        });
        efte.setTitle('选择类型');
    },
    cleanQuery: function () {
        var query = _.extend({}, this.query, {couponOffers: []})
    }
};