'use strict';
var efte = require('efte');
var env = require('../lib/env');
var util = require('../lib/util');
var ajax = util.ajax;
var $ = require('zepto-fix-issue');
var templateFactory = util.templateFactory;

// var initData = {
//     "code": 200,
//     "msg": [
//         {
//             "status": [
//                 0,
//                 20,
//                 10,
//                 40,
//                 30
//             ],
//             "show": "全部",
//             "sum": ""
//         },
//         {
//             "status": [
//                 20,
//                 10
//             ],
//             "show": "审核中",
//             "sum": ""
//         },
//         {
//             "status": [
//                 0
//             ],
//             "show": "离线",
//             "sum": ""
//         },
//         {
//             "status": [
//                 30
//             ],
//             "show": "在线",
//             "sum": ""
//         },
//         {
//             "status": [
//                 40
//             ],
//             "show": "驳回",
//             "sum": ""
//         }
//     ]
// };

var initData = {
    "code": 200,
    "msg": [
        {
            "status": [
                1,2,3,4,5,6,7,8,9
            ],
            "show": '全部',
            "sum": ""
        },
        {
            "status": [
                3
            ],
            "show": '优惠已过期',
            "sum": ""
        },
        {
            "status": [
                3
            ],
            "show": "优惠即将过期（3天内）",
            "sum": ""
        },
        {
            "status": [
                1,6
            ],
            "show": '待提交或被驳',
            "sum": ""
        },
        {
            "status": [
                2
            ],
            "show": "审批中",
            "sum": ""
        },
        {
            "status": [
                8
            ],
            "show": "待商户确认",
            "sum": ""
        },
        {
            "status": [
                3
            ],
            "show": "审核通过",
            "sum": ""
        },
        {
            "status": [
                4,7
            ],
            "show": "变更待提交或变更被驳",
            "sum": ""
        },
        {
            "status": [
                5
            ],
            "show": "变更审批中",
            "sum": ""
        },
        {
            "status": [
                9
            ],
            "show": "变更待商户确认",
            "sum": ""
        }
    ]
};
var topic = {
    selectCustomer: 'unit-m-hui-index-select-customer',
    selectContract: 'unit-m-hui-index-select-contract',
    scheme: 'unit-m-hui-index-create-scheme',
    schemeList: 'unit-m-hui-index-scheme-list'
};
efte.enableRefresh();
module.exports = {
    init: function() {
        var self = this;
        efte.setTitle('闪惠方案');
        this.itemList = $('#list');
        this.templates = templateFactory('item');
        this.data = initData.msg;
        this.renderItems(initData.msg);
        efte.onAppear = function() {
            self.fetch();
        };
        this.bind();
    },
    renderItems: function(items) {
        this.itemList.empty();
        items.map(this.templates.item).join('');
        for (var i = 0; i < items.length; i++) {
            var li = $(this.templates.item(items[i]));
            li.data('index', i);
            this.itemList.append(li);
        }
        efte.stopRefresh();
    },
    fetch: function() {
        var self = this;
        ajax({
            url: 'schemeController/get_scheme_count',
            success: function(data) {
                if(data && data.code && data.code === 200) {
                    self.data = data.msg;
                    self.renderItems(data.msg);
                    efte.stopRefresh();
                }
            },
            error: function(res) {
                if (typeof res === 'string') {
                    alert(res);
                } else alert(res.message || JSON.stringify(res));
                efte.stopRefresh();
            }
        });
    },
    selectContract: function(customerId){
        efte.action.open('unit-m-select-agreement', 'src/index', {
            topic: topic.selectContract,
            customerId: customerId,
            title: '选择协议',
            bizType: '1,7',
            animated: false
        });
    },
    showScheme: function(data) {
        efte.action.open('unit-m-hui', 'pages/scheme', data);
    },
    bind: function() {
        var self = this;
        efte.startRefresh = function(){
            self.fetch();
        };
        efte.subscribe(topic.selectCustomer, function(customer){
            self.selectContract(customer.customerId);
        });
        efte.subscribe(topic.selectContract, function(data){
            self.showScheme({
                topic: topic.scheme,
                newScheme: true,
                title: data.customerName,
                customerID: data.customerId,
                customerName: data.customerName,
                contractID: data.contractId,
                contractNo: data.contractNo
            });
        });
        efte.subscribe(topic.scheme, function(){
            efte.startRefresh();
        });
        efte.subscribe(topic.schemeList, function(data){
            if (data.scheme) {
                data.scheme.topic = topic.scheme;
                self.showScheme(data.scheme);
            } else {
                alert('数据错误');
            }
        });
        $('#add').on(env.CLICK, function() {
            efte.action.open('unit-m-customer', 'src/customer-list', {
                topic: topic.selectCustomer,
                title: '选择客户',
                animated: false,
                ownerPower:1
            });
        });
        this.itemList.on(env.CLICK, 'li', function() {
            var item = self.data[$(this).data('index')];
            efte.action.open('unit-m-hui', 'pages/scheme-list', {
                topic: topic.schemeList,
                title: item.show + '闪惠',
                status: item.status,
                show: item.show
            });
        });
    }
};
