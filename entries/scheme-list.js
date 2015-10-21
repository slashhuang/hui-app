// 点击跳转某状态方案列表「hui/schemeController/get_scheme_by_status」
// params: { "status": [ 0, 20, 10, 40, 30 ], "show": "全部", "sum": "" }

'use strict';

var $ = require('zepto-fix-issue');
var _ = require('underscore');
var efte = require('efte');
var env = require('../lib/env');
var util = require('../lib/util');
var ajax = util.ajax;
var $searchBtn = $('[data-id="search-btn"]');
var $searchInput = $('[data-id="search-input"]');
var $emptyContainer = $('[data-id="empty-list-container"]');
var emptyTpl = _.template($('[data-id="empty-tpl"]').html());

module.exports = {
    init: function(){
        var _this = this;
        this.template = _.template($('.template').html());
        this.container = $('.list');
        _this.resetPaging();
        efte.action.get(function(data){
            efte.setTitle(data.title);
            _this.topic = data.topic;
            _this.status = data.status;
            _this.show = data.show;
            _this.resetPaging();
            _this.fresh();
            _this.bindEvent();

        });
    },
    fresh: function(){
        var _this = this;
        var keyword = $searchInput.val() || "";
        $emptyContainer.empty();  
        ajax({
            url: 'schemeController/get_scheme_by_status',
            data:  {
                status: _this.status,
                keyword:keyword,
                show:_this.show,
                pageIndex:_this.pageIndex,
                pageSize:_this.pageSize
            },
            success: function(res){
                var data = res.msg;
                _this.render(data);
                if (!data || !data.length) {
                  $emptyContainer.html(emptyTpl({
                    tip: '没有更多数据了'
                  }));
                  return;
                }
            },
            error: function(res) {

            },
            method: 'post'
        });
    },
    render: function(data) {
        var _this = this;
        _this.isRefresh && this.container.empty();
        if (!data) return;
        data.forEach(function(value){
            var item = $(_this.template(value));
            _this.container.append(item);
        });
    },
    resetPaging: function(){
        this.isRefresh = true;
        this.pageIndex = 1;
        this.pageSize = 10;
    },
    bindScroll: function() {
        var _this = this;
        var win = $(window);
        var doc = $(document);
        win.on('scroll', function() {
            if (win.scrollTop() + win.height() > doc.height() - 100) {
                _this.pageIndex += 1;
                _this.isRefresh = false;
                _this.fresh();
            }
        });
    },
    bindEvent: function() {
        var _this = this;
        $('.J_scheme_list').on('click', ".J_scheme", function() {
            efte.publish(_this.topic, {scheme: {
                schemeId: $(this).data('id'),
                status: + $(this).data('status')
            }});
            efte.action.back(false);
        });


          $searchBtn.on('tap', function () {
            _this.resetPaging();
            _this.fresh();
          });

          $('form').submit(function() {
            _this.resetPaging();
            _this.fresh();
            return false;
          });
          _this.bindScroll();
    }
};
