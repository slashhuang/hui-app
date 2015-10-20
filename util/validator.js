'use strict';
var env = require('../lib/env');
var efte = require('efte');

module.exports = function(model, subtitle, bConfirm){
    subtitle = subtitle || '以下信息';
    var msgs = [];
    model.validate(msgs);
    if (msgs.length === 0) return true;
    var text = msgs.map(function(msg){
        var label = msg.property ? msg.property.labelEl.text() + '：\n' : '';
        var text = msg.msgs.join('\n');
        return label + text;
    }).join('\n');
    setTimeout(function(){
        if(bConfirm){
           alert(env.confirm_invalid_with_title({msg: text}))
        }else{
            if (confirm(env.back_invalid_with_title({msg: text}))) {
                efte.action.back(true);
            }
        }
    }, 0);
    return false;
};