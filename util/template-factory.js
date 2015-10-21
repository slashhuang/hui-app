var ejs = require('ejs');
var _ = require('underscore');

module.exports = function() {
    return _.reduce(arguments, function(ret, id) {
        var element =  document.getElementById(id);
        var html = element.innerHTML;
        ret[id] = ejs.compile(html);
        return ret;
    }, {})
};