'use strict';
var efte = require('efte');
var _ = require('underscore');
var $ = require('zepto-fix-issue');
var nut = require('nut-hui');
var moment = require('moment');
var util = require('../lib/util');
var backAction = util.backAction;
var env = require('../lib/env');

module.exports = {
    init: function() {
        var self = this;
        this.dateContainer = $('#couponDescContainer');

        efte.action.get(function(query) {
            efte.setTitle(query.templateWindowData.title || "优惠描述");
            //目前逻辑只是适用于单选框，多选框可以的根据契约字段处理
            var _items = query.templateWindowData.valueOptions;
            for(var i = 0, l = _items.length; i < l; i++){
                self.dateContainer.append($(self.itemHtmlTemplate(query, _items[i])));
            }
            if(!query.readOnly) {
                self.setButton(query);
                self.bindEvent();
            }
        });
    },
    itemHtmlTemplate: function(query, data){
        var _html = "",
            _checked,
            _disabled = "";
        if(query.businessAttribute == data.rawValue){
            _checked = true;
        }else{
            _checked = data.isDefault || false;
        }
        if(query.readOnly){
            _disabled = "disabled=true";
        }else{
            _disabled="";
        }
        _html += '<div class="control">';
        _html += '<div class="title">' + data.rawValue + '</div>';
        _html += '<label class="ip-switch">';
        _html += '<input name="item" class="mui-switch" value="' + data.rawValue + '" type="checkbox"';
        if(_checked){
            _html += 'checked="' + _checked.toString() + '"';
        }
        _html += _disabled+'></label>';
        _html += '</div>';
        return _html;
    },
    bindEvent: function(){
        var _self = this;
        var _checkboxList = this.dateContainer.find("input");
        _checkboxList.bind("change", function(){
            var _index = _checkboxList.index(this);
            _self.dateContainer.find("input").each(function(i, item){
                if(_index != i){
                    $(item).prop("checked", null);
                }
            });
            //if($(this).prop("checked")){
            //    $(this).attr("checked", true);
            //}else{
            //    $(this).attr("checked", false);
            //}

        });
    },
    setButton: function(query) {
        var self = this;
        backAction(function(back) {
            efte.publish("unit-m-hui-template-window", self.publishData(query));
            back();
        });
    },
    publishData: function(query){

        return {
            coupon_des: this.dateContainer.find("input:checked").val(),
            index: query.index,
            busAttr: query.busAttr
        }
    },
    validate: function(){
        if (this.selectPeriods.prop('checked') && !this.exceptTimePeriods.length) {
            if (confirm(env.confirm_invalid_with_title({msg: "请选择除外日期"}))) {
                efte.action.back(true);
                return true;
            }else{
                return false;
            }
        }
        return true;
    }
};