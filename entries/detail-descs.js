'use strict';
var efte = require('efte');
var $ = require('zepto-fix-issue');
var _ = require('underscore');
var nut = require('nut-hui');
var util = require('../lib/util');
var validator = require("../util/validator");
var backAction = util.backAction;
/* 数字，英文字符和符号（'#'除外），CJK标点符号，CJK最初期统一汉字，CJK扩展A区 */
var cjkReg = /^[ -"\$-~\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uFF00-\uFFEF]*$/;

module.exports = {
    init: function() {
        var self = this;
        efte.action.get(function(query) {
            self.topic = query.topic;
            self.readOnly = query.readOnly;
            efte.setTitle('限制条件');
            var desc = function(index){
                return nut.control.Textarea.extend(function(){
                    var input = this.input;
                    var empty = $('<div class="empty"></div>')
                        .on('touchstart', function(e){
                            e.preventDefault();
                            input.val('');
                        }).insertAfter(input);
                    input.attr('maxlength', 30)
                        .attr('pattern', cjkReg.source);
                    this.addValidator(function(value){
                        if (!cjkReg.test(value)) {
                            return '输入非法字符，请修改';
                        }
                    });
                },{
                    label: '限制条件'
                });
            };
            self.model = new(nut.property.Composite.extend({
                mapping: {
                    desc1: desc(1)
                }
            }));
            nut.generate(self.model, [{
                children: ['desc1']
            }]);
            !self.readOnly && self.setButton();
            self.model.value(self.parseData(query.value));
            self.model.forEach(function(control) {
                control[self.readOnly ? 'disable' : 'enable']();
            });
        });
    },
    setButton: function() {
        var self = this;
        backAction(function(back) {
            if (!validator(self.model)) return;
            efte.publish(self.topic, self.generateData(self.model.value()));
            back();
        });
    },
    parseData: function(data) {
        return {
            desc1: data[0] || ''
        }
    },
    generateData: function(value) {
        return _.compact([value.desc1]);
    }
};