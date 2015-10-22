'use strict';
var efte = require('efte');
var moment = require('moment');
var _ = require('underscore');
var rivets = require('rivets');
/**
 * 点评内部app弹窗组件
 * @param 'hui-neo'源码扩展封装了rivets的binders方法
 */
var neo = require('hui-neo');
var $ = require('zepto-fix-issue');
window.$ = null;
var env = require('../lib/env');
var util = require('../lib/util');
var ajax = util.ajax;
var backAction = util.backAction;
var toast = util.toast;
/**
 * 模拟景区的数据
 * @type {*[]}
 */
var defaultSceneryCoupon = function () {
    var _now = moment().valueOf();
    return {
        "type": 6,
        "title": "",
        "unit":"份",
        "beginDate": _now,
        "endDate": _now,
        "timePeriods": null,
        "effectiveInHolidays": true,
        "shops": [

        ],
        "detailDescs": [],
        "exceptTimePeriods": [],
        "newTimePeriods": [
            {
                "beginDay": 2,
                "endDay": 3,
                "beginTime": "11:30",
                "endTime": "14:00",
                "timePeriod": "午市"
            }
        ],
        "autoDelay": 1,
        "quotaType": 2,
        "retailPrice": "",
        "salePrice": "",
        "template": {

        },
        "businessAttribute": {
            "ticket_type": "",
            "fit_people_desc": "",
            "other_rules": "",
        }
    }
};

/**
 * 设置默认页面数据【增加数据单位】
 * @returns 默认的页面数据
 */
var defaultCoupon = function () {
    var _now = moment().valueOf();
    return {
        "type": 6,
        "title": "",
        "unit":"位",
        "beginDate": _now,
        "endDate": _now,
        "timePeriods": null,
        "effectiveInHolidays": true,
        "shops": [

        ],
        "detailDescs": [],
        "exceptTimePeriods": [],
        "newTimePeriods": [
            {
                "beginDay": 2,
                "endDay": 3,
                "beginTime": "11:30",
                "endTime": "14:00",
                "timePeriod": "午市"
            }
        ],
        "autoDelay": 1,
        "quotaType": 1,
        "retailPrice": "",
        "salePrice": "",
        "template": {

        },
        "businessAttribute": {
            "fit_people": "",
            "dinner_time_limit": "",
            "detail_description": "",
            "coupon_des": ""
        }
    }
};

var self = module.exports = {
    init: function () {
        var _self = this;
        this.templateWindowData = [];
        this.initHandlers();
        /**
         * @type(存储页面的所有数据)
         * 默认情况下readonly和页面总的readonly保持一致
         */
        this.model = {
            couponOffers: [],
            readOnly: this.readOnly
        };
        /**
         * readonly :this.readOnly
         * @type {{model: *, readOnly: boolean}}
         */
        this.rvModel = {
            model: this.model,
            readOnly: this.readOnly
        };
        /**
         * 模板中的数据采用rivets,页面初始化的时候就双向绑定,对dom的删除只要剥离对应数据即可
         */
        this.view = rivets.bind($('#container').get(0), this.rvModel);
        efte.action.get(function (query) {
            self.requestData(query);
            self.branchList = query.branchList;//门店信息
            //if(query.readOnly){@TODO 之后要改过来
            if(false){//测试环境设置为false
                //如果是只读的，直接设置所有input和textarea标签只读
                $('input').prop('disabled','true');
                $('textarea').prop('disabled','true');
            }
        });
        efte.setTitle('定额优惠详情');
    },
    requestData: function(query) {
        self.topic = query.topic;
        self.customerID = query.customerID;
        self.readOnly = query.readOnly;
        self.rvModel.readOnly = query.readOnly;
        self.readOnly = false; //（测试非只读的情况）@TODO之后要改过来
        //self.readOnly = query.readOnly;


        //过滤出闪惠方案数据
        var _dataMsg = query;
        /**
         * 如果页面没有数据，则add模板，有数据则删选数据进行渲染
         */
        if(_dataMsg.couponOffers.length == 0){
            self.addCouponModel();
        }
        else{
            /**
             * 删选和存储闪惠数据，存入module.model.couponOffers
             */
            self.filterShanHuiData(_dataMsg);
            //console.log(JSON.stringify(self.model.couponOffers[0]));
            /**
             * 选取存储的数据,渲染模板
             */
            self.model.couponOffers.map(function (couponOffer, index) {
                //在模板里面添加data-index
                $($(".js-template-container").get(index)).attr("data-index", index);
                //渲染模板
                self.renderTemplate(couponOffer, index, false);
            });
        }
        //绑定模版组件的冒泡事件
        self.bindTemplateUnitsEvent();
        //接收模版弹窗页发送过来的消息 @TODO  HTML里面并没有体现这一点
        efte.subscribe("unit-m-hui-template-window", function (query) {
            $($(".js-coupon-window").get(query.index)).find(".input").html(query.coupon_des);
            self.model.couponOffers[query.index].businessAttribute[query.busAttr] = query.coupon_des;
        });
        //if(!query.readOnly) {//@TODO 真实环境下执行这个
        if(true) {
            self.setButton();
        }
    },
    filterShanHuiData: function(data){
        var _data= data.couponOffers || [];
        /**
         * 选取couponOffers删选type=6(定额类型)的数据
         */
        var couponOffers=[];
        if(_data && _data.length){
            couponOffers = _.map(_data,function(value){
                if(value.type == 6){
                    return value;
                }
            });
        }
        /**
         * 定义map删选的function
         */
        var mapCouponOffers = function(couponOffer){
            //每一项优惠单位的显示
            switch(couponOffer.quotaType) {
                case 1:
                    couponOffer.unit = '位';
                    break;
                case 2:
                    couponOffer.unit = '份';

            }

            couponOffer.dateExcept = {
                effectiveInHolidays: couponOffer.effectiveInHolidays,
                exceptTimePeriods: couponOffer.exceptTimePeriods || [],
                autoDelay: couponOffer.autoDelay,
                beginDate: moment(new Date(couponOffer.beginDate)).format('YYYY-MM-DD'),
                endDate: moment(new Date(couponOffer.endDate)).format('YYYY-MM-DD')
            };
            return couponOffer;
        };
        /**
         * 将删选的数据存入主模块的model.couponOffers
         */
        self.model.couponOffers = couponOffers.length ? couponOffers.map(mapCouponOffers) : [];
    },
    renderTemplate: function(couponOffer, index,isFirst){
        var  _templateDom;//存储模板根据不同的viewType渲染出来的dom模板
        var  _templateData = couponOffer.template.attributes;//获取属性数组(渲染页面)
        var  _first = isFirst;//新增时候设置默认勾选属性
        var _readOnly = false;//测试使用  @TODO 之后不要忘了改
        //var  _readOnly = self.readOnly;//设置可读性

        for(var j = 0, l = _templateData.length; j < l; j++){
            if(_templateData[j]['viewType']){
                _templateDom = self.templateOfViewType(_templateData[j], couponOffer.businessAttribute, index, _readOnly, _first);
                if(_templateDom){
                    /**
                     * 在每个repeat_container上append对应viewType权限的dom数据
                     */
                    $($(".js-template-container").get(index)).append(_templateDom);
                }
            }
        };
        /**
         * 勾选初始页面的头部input框,采用闭包直接执行的方式
         */
        var _itemInputType=function(couponType){
            switch(couponType){
                case 1 :
                    return 0;
                    break;
                case 2:
                    return 1;
                    break;
                default :
                    return 0;
                    break;
            }
        }(couponOffer.quotaType);
        //利用上面的结果，渲染头部input框
        $($(".js-repeat-template").get(index)).find('input[name="couponType"]').eq(_itemInputType).attr('checked',true);

    },
    /**
     * 对应的是attributes数组里面的一项，进行viewTtype匹配渲染
     * @param templateItem 对应页面列表的每一行(json对象中的attributes里面的属性值)
     * @param _readOnly 设置模板内容是否只读
     * @param _first 指定是否增加模板
     * @returns {*}
     */
    templateOfViewType: function(templateItem, businessAttribute, templateIndex, _readOnly, _first){
        //私有方法返回对应模版，模版对应下发字段viewtype,null预留模版
        var _template = [v1, null, v2, null, null, null, v7, null];
        var _disabled = "";
        /**
         * 设置是否只读
         */
        if(_readOnly){
            _disabled = "disabled='true'";
        }else{
            _disabled = "";
        }
        /**
         * viewType说明viewtype说明
         * 1对应radio选框
         * 3对应textarea
         * 7对应浮层单选框
         * @returns {Element}
         */
        function v1(){
             var _fragment = document.createElement("DIV"),
                 _templateDom = "",
                 _viewOptions = templateItem.valueOptions,
                 _required = "",
                 _defaultShowText = "";

            _templateDom += '<div class="sc-control-row">';
            if(templateItem.isRequired){
                _required = "required";
            }
            _templateDom += '<div class="control  required releaseFlex" >';
            _templateDom += '<div class="title" style="width:33%;">' + templateItem.title + '</div>';
            /**
             * 统一换成form标签
             */
            _templateDom += '<form  data-key="' + templateItem.attributeKey + '" data-viewType="' + templateItem.viewType + '">';

            //遍历过滤出和服务下发数据匹配的选中项
            for(var i = 0, l = _viewOptions.length; i < l; i++){
                var _activedClass = "";
                var _default = _viewOptions[i].default;
                //删选和businessAttr保持一致的attr，执行操作
                self.getBusinessAttr(templateItem, templateIndex, function(businessAttribute, busAttr){
                    /**
                     * 仅仅是取出businessAttr中的数字部分(实际上都是空，先不改动)
                     */
                    _defaultShowText = businessAttribute[busAttr].match(/(\d+)(\.\d+)?/g) || "";
                    //valueType == 1时判断下发值和模版值相等判定选中
                    if(_viewOptions[i].valueType == 1){
                        if(_first){
                            if(_default) {
                                _activedClass = " checked='checked'";
                            }
                        }else{
                            if(businessAttribute[busAttr] == _viewOptions[i].rawValue){
                                _activedClass = " checked='checked'";
                            }
                        }
                    //valueType == 2时判断valueType符合正则规则number判定选中

                    }else if(_viewOptions[i].valueType == 2){
                        var _match = _viewOptions[i].rawValue.match(/\[+\w+\]+/g);
                        if(_match == "[number]"){
                            if(businessAttribute[busAttr].match(/(\d+)(\.\d+)?/)){
                                _activedClass = " checked='checked'";

                            }
                        }
                    }
                });
                //valueType == 1直接渲染

                if(_viewOptions[i].valueType == 1){
                    _templateDom += '<label>' +
                                        '<input type="radio" name="radioList" ' +_activedClass+' data-val="' + _viewOptions[i].rawValue +'">'+
                                        '<b></b>' +
                                        _viewOptions[i].rawValue +
                                '</label>';
                }
                else if(_viewOptions[i].valueType == 2){
                    //valueType == 2渲染附加控件
                    /**
                     * 数据保留，关于viewtype为1的HTML要修改
                     */
                    var _rawValue = _viewOptions[i].rawValue,
                        //将rawValue正则分界
                        _rawValue1 = _rawValue.substring(0, _rawValue.indexOf("[")),
                        _rawValue2 = _rawValue.substring(_rawValue.lastIndexOf("]") + 1, _rawValue.length),
                        _rawValue3 = _rawValue.match(/\[+\w+\]+/g);
                        _templateDom += '<label>' +
                                        '<input data-valuetype="2" type="radio" name="radioList"'+ _activedClass+' data-val="' + _viewOptions[i].rawValue +'">'+
                                        '<b></b>' +
                                        _rawValue1 +
                                        '</label>';

                    //匹配valueType的规则
                    if(_rawValue3 == "[number]"){
                        if(!_activedClass){
                            _disabled = "disabled='disabled'";
                        }
                        _templateDom += '<input type="tel"'+_disabled+' value="' + _defaultShowText + '"' + ' />';
                    }
                    _templateDom += _rawValue2;
                    _templateDom += '</form>';
                }

            }
            _templateDom += '</div>';
            _templateDom += '</div>';
            _templateDom += '</div>';
            _fragment.innerHTML = _templateDom;
            return _fragment;
        }

        function v2(){
            var _fragment = document.createElement("DIV"),
                _templateDom = "",
                _required = "",
                _defaultShowText = "";
            _templateDom += '<div class="sc-control-row">';
            if(templateItem.isRequired){
                _required = "required";
            }
            _templateDom += '<div class="control">';
            _templateDom += '<div class="title">' + templateItem.title + '</div>';
            _templateDom += '</div>';
            _templateDom += '<div class="control relative" data-key="' + templateItem.attributeKey + '" data-viewType="' + templateItem.viewType + '">';

            self.getBusinessAttr(templateItem, templateIndex, function(businessAttribute, busAttr){
                _defaultShowText = businessAttribute[busAttr];
            }.bind(this));
            /**
             * 后端要求增加 "restriction":{"lengthLE":[10]}字段，进行提交校验，这个先写下
             * 有数据就加，没数据就以40为默认值
             * @type {boolean}
             */
            var lengthBool = templateItem['restriction'] && templateItem['restriction']['lengthLE'];
            var textMaxLength = lengthBool?  templateItem.restriction['lengthLE'][0] : 40;

            _templateDom += '<textarea maxlength='+ textMaxLength +'  class="textarea js-detail-description"'+_disabled+'placeholder="' + templateItem.tip + '">' + _defaultShowText;
            _templateDom += '</textarea>';

            _templateDom += '<div class="text-count-content"><span class="js-textarea-count">' + _defaultShowText.length + '</span>/'+textMaxLength +'</div>';
            _templateDom += '</div>';
            _templateDom += '</div>';
            _fragment.innerHTML = _templateDom;
            return _fragment;
        }

        function v7(){
            var _fragment = document.createElement("DIV"),
                _templateDom = "",
                _required = "",
                _defaultShowText = "无";
            _templateDom += '<div class="sc-control-row js-coupon-window" rv-neounit-desc="coupon.desc">';
            if(templateItem.isRequired){
                _required = "required";
            }
            //保存模版弹层页需要的数据
            self.templateWindowData.push(templateItem);
            _templateDom += '<div class="control">';
            _templateDom += '<div class="title">' + templateItem.title + '</div>';

            self.getBusinessAttr(templateItem, templateIndex, function(businessAttribute, busAttr){
                _defaultShowText = businessAttribute[busAttr];
            }.bind(this));

            //valueType == 1直接渲染
            _templateDom += '<div class="input" placeholder="无" data-key="' + templateItem.attributeKey + '" data-viewType="' + templateItem.viewType + '">' + _defaultShowText + '</div>';
            //valueType == 2渲染附加控件
            _templateDom += '<div class="arrow"></div>';
            _templateDom += '</div>';
            _templateDom += '</div>';

            _fragment.innerHTML = _templateDom;
            return _fragment;
        }
        var _fragment = _template[templateItem.viewType - 1];
        if(_fragment){
            return _fragment();
        }else{
            return null;
        }

    },
    bindTemplateUnitsEvent: function(){
        /**
         * 增加功能【景区票】都采用冒泡的写法
         * 修改页头input单选框，重新渲染模板
         */
        // @TODO 冒泡也会有大问题，alert重复执行【之后优化】
        var formEle= '.js-repeat-template form.selectType';
        $(document).on(env.CLICK,formEle, function(e){
            e.preventDefault();
            //如果只读就什么都不做
            if(self.readOnly){

            }else {
                var Form = this;
                //获取要改变的dom序列号
                var eleIndex= $(formEle).index(this);
                /**
                 * 由于dom样式采用label标签操作，因此需要在document冒泡的基础上在添加change事件
                 * 检测的change事件
                 */
                $(Form).change(function(e){
                    //点击选择
                    var selectTypeName = $(e.target).parent().find('input[name="couponType"]:checked').val();
                    /**
                     * 后端还没数据，暂时本地模拟，这段function和Ajax请求是一样的
                     * domInfo为一个对象，存储input框点击的domType数值和对应的dom序列
                     */
                    var domInfo = {
                        typeName:selectTypeName,
                        index:eleIndex
                    };
                    //alert(JSON.stringify(domInfo));
                    switch(selectTypeName){
                        case 'buffet':
                            self.addCouponModel(domInfo);
                            break;
                        case 'scenery':
                            //alert('景点门票功能暂时没有开放');
                            self.addCouponModel(domInfo);
                            break;
                    }
                });
            }
        });
        /**
         * 计算textArea输入文字个数
         */
        $(document).on("input", ".js-detail-description", function(){
            var _descTextarea = $(".js-detail-description");
            var _index = _descTextarea.index(this);
            $($(".js-textarea-count").get(_index)).html(this.value.length);
        });
        /**
         * 绑定优惠描述事件 @TODO 点击跳转新页面，功能相对独立
         */
        $(document).on(env.CLICK, ".js-coupon-window", function(e){
            var _templateIndex = $(this).parents(".js-template-container").attr("data-index");
            e.preventDefault();
            var _index = $(".js-coupon-window").index(this);
            var query = {
                templateWindowData: self.templateWindowData[_index],
                index: _index,
                readOnly: self.readOnly
            };
            self.getBusinessAttr(query.templateWindowData, _templateIndex, function(businessAttribute, busAttr){
                query.businessAttribute = businessAttribute[busAttr];
                query.busAttr = busAttr;
            }.bind(this));
            efte.action.open('unit-m-hui', 'pages/scheme-description.html', query);
        });
        /**
         * 绑定删除优惠事件
         */
        $(document).on(env.CLICK, ".js-delete-coupon", function(e){
            if(self.readOnly){

            }else {
                var _templateIndex = $(".js-delete-coupon").index(this);
                if (!window.confirm('确定删除该组优惠吗？')) return;
                //删除model模版中数据
                self.deleteCouponModel(_templateIndex);
                //删除当前优惠的html的节点
            }
        });
        /**
         * 绑定添加优惠事件
         */
        $(".js-add-coupon").on(env.CLICK, function(e){
            if(self.readOnly){

            }else {
                self.addCouponModel();
            }
        });
    },
    /**
     * @param domInfo 对象存入对应dom的index和选中值，默认为空()
     * 参数的作用是执行切换模板or增加模板
     */
    addCouponModel: function(domInfo){
        var initialData ={
            keyMap: "{redeemType:'6',quotaType:'1'}",
            dimensionType: 1};
        var param = initialData;//默认情况下执行增加模板
        /**
         * 选取Ajax参数,bool值决定是切换景区和自助餐的模板，还是新增模板
         */
        if(domInfo && domInfo.typeName){
            switch(domInfo.typeName){
                case 'buffet':
                    param = initialData;
                    break;
                case 'scenery':
                    param = {keyMap:"{redeemType:'6',quotaType:'2'}", dimensionType:1};
                    break;
            }
        }
         ajax({
            url: 'schemeController/get_template',
            data: param,
            success: function (data) {
                if(data.code == 200){
                    //console.log('ajaxdata',JSON.stringify(data));
                    var _data = data.msg;
                    /**
                     * 将获得的数据按照coupon的统一形式给出(默认为获取自助餐)
                     * genshowData，第一个参数是Ajax请求的模板数据，第二个为选择默认模板名字
                     */
                    var _newCoupon = self.genShowData({template:_data});

                    if(domInfo && domInfo.typeName=='scenery')  {
                        _newCoupon = self.genShowData({template:_data},'scenery');
                    }
                    /**
                     * 向rivets模板里面push数据，自动会在view层更新
                     * 根据不同的类型执行不一样的挂载dom方式
                     */
                    if(domInfo && domInfo.typeName){//替换数据，重新渲染模板
                        //console.log(JSON.stringify(_data));
                        /**
                         * 这里是个大坑，rivets 双向模板执行
                         * self.model.couponOffers.splice(domInfo.index,1,_newCoupon)会报typeError，
                         * 查阅源码debug文档后，将版本号升级至0.8以上，解决问题
                         */
                        self.model.couponOffers.splice(domInfo.index,1,_newCoupon);
                        //template-container不属于rivets管辖的数据范围，执行手动删除
                        $($(".js-template-container").get(domInfo.index)).empty();
                        self.renderTemplate(_newCoupon, domInfo.index,true);
                    }
                    else{//增加模板
                        self.model.couponOffers.push(_newCoupon);
                        var _lastIndex = self.model.couponOffers.length - 1;
                        self.renderTemplate(_newCoupon, _lastIndex,true);
                        $($(".js-template-container").get(_lastIndex)).attr("data-index", _lastIndex);
                    }

                }else{
                    alert("服务器累趴了!");
                }
            },
             error:function(err){
                 alert('抱歉，服务器出错了');
             }
        });

    },
    deleteCouponModel: function(index){
        this.model.couponOffers.splice(index, 1);
        if (this.model.couponOffers.length === 0) {
            window.scrollTo(0, 0);
        }
    },
    /**
     * 把商业部分的单独提取出来
     * @param templateItem
     * @param templateIndex
     * @param callback
     */

    getBusinessAttr: function(templateItem, templateIndex, callback){
        var _businessAttribute = self.model.couponOffers[templateIndex].businessAttribute;
        for(var busAttr in _businessAttribute){
            //如果属性值和后端给的一致，则执行勾选
            if(busAttr == templateItem["attributeKey"]){
                callback(_businessAttribute, busAttr);
            }
        }
    },
    transfromDay: function(newTimePeriods){
        var _days = [ "", "周日", "周一",  "周二",  "周三",  "周四",  "周五",  "周六"],
            _showDay = _days[newTimePeriods.beginDay] + "至" + _days[newTimePeriods.endDay],
            _showTime = newTimePeriods.beginTime + "-" + newTimePeriods.endTime;
        return _showDay + " " + _showTime;
    },
    initHandlers: function () {
        /**
         * addUnitHandler函数的参数说明
         * @param {string} name
         * @param {object} opt
         */
        neo.binder.addUnitHandler('timeperiod', {
            unit: 'unit-m-hui',
            path: 'pages/time-period-new',
            data: function (val) {//来自path的data传输过来，执行双向绑定
                /**
                 * 增加quotaType字段，用于判断页面如何渲染数据
                 * @type {number}
                 */
                var eleNum = Math.round(arguments['1']['_zid']/4)-1;
                var quotaName = $($('.js-repeat-template').get(eleNum)).find('input[name="couponType"]:checked').val();
                var quotaNum = function(val) {
                    switch (val) {
                        case 'buffet':
                            return 1;
                            break;
                        case 'scenery':
                            return 2;
                            break;
                        default :
                            return 1;
                    }
                }(quotaName);
                return {
                    title: '优惠时段',
                    readOnly: self.readOnly,
                    data: val || [],
                    quotaType:quotaNum
                }
            },
            value: function (val, el) {//来自rivets的数据
                if (!val) return val;
                    $(el).find('.input').text(self.transfromDay(val[0]));
                //alert($(el).parents('.js-repeat-template').find('input[name="couponType"]').val());
                return val;
            }
        });

        //点击优惠有效期进入有效期选择页
        neo.binder.addUnitHandler('dateexcept', {
            unit: 'unit-m-hui',
            path: 'pages/valid-period',
            data: function (val) {
                return {
                    title: '优惠有效期',
                    readOnly: self.readOnly,
                    data: val || []
                }
            },
            value: function (val, el) {
                if (!val) return val;
                var _beginDate = moment(val.beginDate).format("YYYY-MM-DD"),
                    _endDate = moment(val.endDate).format("YYYY-MM-DD");
                $(el).find('.input').text(_beginDate + "至" + _endDate);
                //val.beginDate = moment();
                return val;
            }
        });

        neo.binder.addUnitHandler('shops', {
            unit: 'unit-m-hui',
            path: 'pages/select-shops',
            data: function (val) {
                return {
                    title: "选择门店",
                    readOnly: self.readOnly,
                    required: true,
                    customerID: self.customerID,
                    branchList: self.branchList,
                    data: val
                }
            },
            value: function (data, el) {
                data = data.shops ? data : {shops: data ? data : []};
                var _text = data.shops && data.shops.length > 0 ? "已选择" + data.shops.length + "门店" : "";
                $(el).find('.input').text(_text);
                return data;
            }
        });


    },
    validate: neo.validator({
        'couponOffers[]': neo.validator.defaults.delegate({
            shops: neo.validator.defaults.required('必须选择适用门店'),
            newTimePeriods: neo.validator.defaults.required('必须选择使用时段'),
            retailPrice: [function (val) {
                if (!/(^\d+\.\d{1,2}|^\d+)$/.test(+val)) return '必须填写正确金额';
                if (!val > 0) return '原价必须大于0';
            }, neo.validator.defaults.required('必须填写金额')],
            salePrice: [function (val) {
                if (!/(^\d+\.\d{1,2}|^\d+)$/.test(+val)) return '必须填写正确金额';
                if (!val > 0) return '售价必须大于0';
            }, neo.validator.defaults.required('必须填写金额')],
            businessAttribute : function(val){
                if(val.dinner_time_limit == '不限'){

                }else{
                    var str = val.dinner_time_limit;
                    if (!/(\d+)(\.\d+)?/g.test(str)) return '必须填写正确小时';
                }
            },
            'retailPrice,salePrice': function (retailPrice, salePrice) {
                if (~~retailPrice <= ~~salePrice) return '“原价”金额必须大于“售价”金额';
            },
            'beginDate,endDate': function (begin, end) {
                if (moment(begin).isAfter(end, 'day')) return '开始时间必须早于结束时间';
            }

        })
    }),
    setButton: function () {
        //var self = this;
        backAction(function (back) {
            //向后端传递数据的参数
            var couponOffers = self.transAjaxCouponOffers();
            //这个公开化数据【不太清楚啥意思】
            var couponOffersPublish = self.transPublishCouponOffers();
            //数据校验
            var invalid = self.validate({couponOffers: couponOffers});
            if (invalid) {
                if (confirm(env.back_invalid_with_title({msg: invalid.join('\n')}))) {
                    efte.action.back(true);
                    return;
                }
                return;
            }
            toast.show('保存中', true);
            //console.log(JSON.stringify(couponOffers));
            ajax({
                url: 'schemeController/validate_couponOffer',
                data: couponOffers,
                method: 'post',
                success: function () {
                    efte.publish(self.topic, couponOffersPublish);
                    back(false);
                },
                error: function (message) {
                    toast.hide();
                    alert(message.message);
                }
            });
        });
    },
    transAjaxCouponOffers: function () {
        var self = this;
        return this.model.couponOffers.reduce(function (result, coupon, index) {
            //删除数据
            delete coupon.unit;
            result.push(self.genAjaxData(coupon, true, index));
            return result;
        }, []);
    },
    transPublishCouponOffers: function () {
        var self = this;
        return this.model.couponOffers.reduce(function (result, coupon, index) {
            //删除unit数据
            delete coupon.unit;
            result.push(self.genAjaxData(coupon, false, index));
            return result;
        }, []);
    },
    /**
     * 对Ajax的请求数据进行处理封装，统一存入model.couponOffers
     */
    genShowData: function (couponOffer,typeName) {
        /**
         * 默认情况下选取defaultCoupon作为模板,var在作用域这块真是不太好=_=
         */
        var showCoupon =_.extend(defaultCoupon(), couponOffer);
        if(typeName=='scenery'){
            showCoupon =_.extend(defaultSceneryCoupon(), couponOffer);
        }
        showCoupon.dateExcept = {
            effectiveInHolidays: couponOffer.effectiveInHolidays,
            exceptTimePeriods: couponOffer.exceptTimePeriods || [],
            //此处用于替换
            autoDelay: showCoupon.autoDelay,
            beginDate: moment(new Date(showCoupon.beginDate)),
            endDate: moment(new Date(showCoupon.endDate))
        };
        return showCoupon;
    },
    /**
     * 从dom中搜寻数据
     * @param coupon
     * @param flag 在transAjax时为true,publishData时是false。并且这两个function只有这个参数不同
     */
    genAjaxData: function (coupon, flag, index) {
        /**
         * 数据结构上存在重复，因此才有了下面几步，将dateExcept单独拿出来作为属性
         */
        var data = _.extend({}, coupon, coupon.dateExcept);
        delete data.dateExcept;
        //转换数据格式【此处不涉及dom】
        data.beginDate = moment(data.beginDate).valueOf();
        data.endDate = moment(data.endDate).valueOf();

        //转化商店存储结构【此处也不涉及dom操作】把所有的商店数据都变成(总店和分店的结构形式)
        data.shops = data.shops && data.shops.shops ? data.shops : {shops: data.shops};
        data.shops = flag ? data.shops.shops.reduce(function (result, shop) {
            //对AJAX请求的数据，挑选属性为shopID和shopName的进行Ajax存储
            shop && result.push(_.pick(shop, 'shopID', 'shopName'));
            return result
        }, []) : data.shops.shops;

        //填充模版数据(找到页面里面的businessAttribute填充)
        $.each(data.template.attributes, function(key, val){
            /**
             * 寻找模板数据中的data-key进行数据查找，填充进businessAttr
             */
            var _datakey = "[data-key='" + val.attributeKey + "']";//选取需要的商业元素的属性特征
            var _controller = $($(".js-template-container").get(index)).find(_datakey);//找到对应的dom元素
            if(_controller.attr("data-key") == val.attributeKey){//如果属性值匹配
                var _viewType = _controller.attr("data-viewType");//找到viewType类型，选取数据
                if(_viewType == "1"){
                    /**
                     *  这里就直接拿form元素的数据，css操作就是坑
                     */
                    //找到对应的选中元素
                    var _extendControl = _controller.find('input[name="radioList"]:checked');
                    data.businessAttribute[val.attributeKey] = _controller.find('input[name="radioList"]:checked').attr("data-val");
                    //如果选中元素带着输入框valueType=2的情况下
                    if(_extendControl.attr("data-valuetype")){
                        var _radioList = _extendControl.parent().parent().find('input[type="tel"]');
                        var _extendVal = _radioList.val();
                        data.businessAttribute[val.attributeKey] = _extendVal;
                    }
                }else if(_viewType == "3"){
                    data.businessAttribute[val.attributeKey] = _controller.find(".textarea").val();
                }else if(_viewType == "7"){
                    data.businessAttribute[val.attributeKey] = _controller.html();
                }
            }
        });
        return data;
    }
};

