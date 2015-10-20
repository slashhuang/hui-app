var userAgent = window.navigator.userAgent.toLowerCase();
var isDevice = /efte\b/.test(userAgent);
var efte = require('efte');
var _ = require('underscore');

module.exports = {
    build: 'debug',
    isDevice: isDevice,
    UNIT: 'unit-m-hui',
    CLICK: isDevice ? 'tap' : 'click',
    baseUrl: 'https://a.dper.com/hui/',
    settleType: {
        list: [
            {
                value: 0,
                text: '统一结算'
            }, {
                value: 10,
                text: '按分店结算'
            }
        ],
        index: {
            '0': 0,
            '10': 1
        }
    },
    confirm_invalid_with_title: _.template('部分信息填写错误：\n <%= msg %> \n 确认返回？\n'),
    back_invalid_with_title: _.template('部分信息填写错误：\n <%= msg %> \n 是否放弃保存并返回？')
};
