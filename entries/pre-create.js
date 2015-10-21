'use strict';
var $ = require('zepto-fix-issue');
var efte = require('efte');
var util = require('../lib/util');
var keygen = require('uniq-keygen');
var self = module.exports = {
    init: function () {
        efte.action.get(
            /**
             * @param {object} params
             * @param {string} params.customerId
             * @param {string} params.contractId
             * @param {string} params.price
             * @param {string} params.marketPrice
             */
            function (params) {
                util.ajax({
                    url: 'schemeController/for_voucher_to_hui',
                    data: {
                        customerId: params.customerId,
                        contractId: params.contractId
                    },
                    success: function (data) {
                        var topic = keygen();
                        efte.action.open('unit-m-hui', 'pages/scheme', {
                            topic: topic,
                            newScheme: true,
                            title: data.msg.customerName,
                            customerID: params.customerId,
                            customerName: data.msg.customerName,
                            contractID: params.contractId,
                            contractNo: data.msg.contractNo,
                            preFillData: {
                                couponOffers: [{
                                    type: 3,
                                    full: params.marketPrice || 0,
                                    cut: params.marketPrice - params.price || 0
                                }]
                            }
                        }, false, false);
                        efte.subscribe(topic, function () {
                            $('.J-remark').text('方案已提交');
                            efte.action.back();
                        });
                        $('.J-remark').text('方案未提交,请按左上角按钮返回');
                    },
                    error: function (res) {
                        alert(res);
                        efte.action.back();
                    }
                })
        });
    }
};