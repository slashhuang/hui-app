'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var PluginError = gutil.PluginError;

var PLUGIN_NAME = 'gulp-cortex-handlebars-test-compiler';

function compiler (file) {
    var html = file.contents.toString();
    return html.replace(/\{\{\{\s*static\s+['"](.*)['"]\s*}}}/, '$1')
        .replace(/\{\{\{\s*facade\s+['"](.*)['"]\s*}}}/, '<script src="/neurons/neuron.js"></script><script src="/neurons/config.js"></script><script>neuron.config({path: "/neurons"});</script><script>facade({entry: "$1.js"})</script>');
}

module.exports = function () {

    return through.obj(function (file, enc, callback) {

        if (file.isNull()) {
            this.push(file);
            return callback();
        }

        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return callback();
        }

        var filePath = file.path;

        try {
            var compiled = compiler(file);

            file.contents = new Buffer(compiled);
        } catch (err) {
            this.emit('error', new PluginError(PLUGIN_NAME, err, {fileName: filePath}));
            return callback();
        }

        this.push(file);
        callback();
    });
};