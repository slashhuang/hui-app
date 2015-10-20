'use strict';
var $ = require('zepto-fix-issue');
var _ = require('underscore');
var efte = require('efte');
var env = require('../env');
var defaultOpt = {
    readOnly: false,
    container: '.image-list',
    btnAdd: '.item.add.more',
    btnReplace: '.item.add.replace',
    templateData: '.template.image-item-data',
    templateUrl: '.template.image-item-url',
    images: []
};
var ImageList = module.exports = function(opt){
    this.options = _.extend({}, defaultOpt, opt);
    this.uploadFiles = [];
    this.deleteAttachmentIds = [];
    this.uploadId = 0;
};

ImageList.prototype = {
    constructor: ImageList,
    init: function(){
        this.el = $(this.options.container);
        this.templateDataItem = _.template($(this.options.templateData).html());
        this.templateUrlItem = _.template($(this.options.templateUrl).html());
        this.btnAdd = this.el.find(this.options.btnAdd);
        this.btnReplace = this.el.find(this.options.btnReplace);
        this.preservedSize = this.btnReplace.length;
        if (this.options.readOnly) {
            this.btnAdd.hide();
            this.btnReplace.hide();
            if (this.options.images.length === 0) {
                this.el.hide();
            }
        }
        this.bind();
        this.initImages(this.options.images);
    },
    bind: function(){
        var _this = this;
        this.btnAdd.on(env.CLICK, function(){
            _this.uploadImage(function(id, type, image){
                _this.btnAdd.before(_this.templateDataItem({
                    id: _this.uploadId,
                    type: type,
                    data: image.thumb,
                    name: image.name
                }));
            });
        });
        this.btnReplace.on(env.CLICK, function(){
            var btn = $(this);
            _this.uploadImage(function(id, type, image){
                var item = $(_this.templateDataItem({
                    id: _this.uploadId,
                    type: type,
                    data: image.thumb,
                    name: image.name
                }));
                item.addClass('replace');
                btn.addClass('hide').before(item);
            });
        });
        this.el.on(env.CLICK, '.item-img', function(){
            var img = $(this);
            efte.showPhoto({
                editable: !_this.options.readOnly,
                name: img.data('name'),
                url: img.data('full-url')
            }, function(){
                _this.removeImage(img);
            });
        });
    },
    uploadImage: function(callback) {
        var _this = this;
        efte.takePhoto(function(image /* name, thumb, width, height, size */ ) {
            var type;
            var ext = /.*\.(\w+)$/.exec(image.name);
            if (ext) {
                ext = ext[1];
            } else {
                alert('图片格式错误');
            }
            if (ext === 'jpg' || ext === 'jpeg') {
                type = 'image/jpeg';
            } else if (ext === 'png'){
                type = 'image/png';
            } else {
                alert('不支持的图片格式：' + ext);
            }
            efte.takePhotoByName(image.name, function(fullImage /* base64 */ ) {
                _this.uploadFiles.push({
                    id: _this.uploadId,
                    data: fullImage
                });
            });
            callback(_this.uploadId, type, image);
            _this.uploadId++;
            _this.displayAddButton();
        });
    },
    removeImage: function(img){
        if (this.options.readOnly) return;
        var id = parseInt(img.data('id'));
        if (img.hasClass('upload')) {
            var index = null;
            this.uploadFiles.some(function(obj, i){
                if (obj.id === id) {
                    index = i;
                    return true;
                }
            });
            this.uploadFiles.splice(index, 1);
        } else if (img.hasClass('online')) {
            this.deleteAttachmentIds.push(id);
        }
        if (img.hasClass('replace')) {
            img.next().removeClass('hide');
        }
        img.remove();
        this.displayAddButton();
    },
    initImages: function(imgs) {
        var _this = this;
        imgs.forEach(function(img, i) {
            if (i < _this.btnReplace.length) {
                _this.btnReplace.eq(i).addClass('hide')
                    .before($(_this.templateUrlItem(img)).addClass('replace'));
            } else {
                _this.btnAdd.before(_this.templateUrlItem(img));
            }
        });
        this.displayAddButton();
    },
    displayAddButton: function(){
        if (this.options.readOnly) return;
        if (this.btnReplace.not('.hide').length === 0) {
            this.btnAdd.removeClass('hide');
        } else {
            this.btnAdd.addClass('hide');
        }
    },
    getUploadFiles: function(){
        return this.uploadFiles.map(function(obj){
            return {base64: obj.data};
        });
    },
    getDeleteAttachmentIds: function(){
        return this.deleteAttachmentIds;
    },
    total: function(){
        return this.options.images.length + this.uploadFiles.length - this.deleteAttachmentIds.length;
    }
};