'use strict';
var $ = require('zepto-fix-issue');
var _ = require('underscore');
var env = require('../lib/env');
var efte = require('efte');

module.exports = {
    init: function(){
        this.template = _.template($('.template').html());
        window.template = this.template;
        this.container = $('.list');
        var _this = this;
        this.container.on(env.CLICK, 'li', function(){
            efte.publish(_this.topic, {
                value: parseInt($(this).attr('data-value'))
            });
            efte.action.dismiss();
        });
        efte.action.get(function(data){
            _this.topic = data.topic;
            _this.data = data;
            var list = _this.data.bankcardList;
            for (var i = 0; i < list.length; i++) {
                var item = _this.render(list[i]);
                _this.container.append(item);
                if (_this.data.selected == list[i].accountID) {
                    item.find('input').prop('checked', true);
                }
            }
        });
    },
    render: function(data){
        return $(this.template(data));
    }
};