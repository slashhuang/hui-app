var util = require('hui-apollo-util');
var env = require('./env');

module.exports = util({
    ajaxBaseUrl: env.baseUrl,
    build: env.build
});