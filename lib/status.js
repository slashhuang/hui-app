'use strict';
// var statusMap = {
//     add: [-1],
//     offline: [0],
//     update: [10, 40, 60],
//     online: [30, 70],
//     modified: [110],
//     'modify-verifying': [150],
//     'modify-submitted': [140, 160],
//     'can-offline': [30, 70, 110, 140, 150, 160],
//     'can-modify-again': [110, 140, 160],
//     'pre-modify': [30, 70, 110, 140, 160],  // online + can-modify-again
//     'customer-reviewing': [50, 150]
// };
var statusMap = {
    add: [-1],
    uncommitted: [1,6],
    drawback:[2],
    revoke: [5],
    offline: [3],
    online: [30, 70],
    modify: [4,7],
    withdraw: [8,9],
    'modify-verifying': [150],
    'modify-submitted': [140, 160],
    'pre-modify': [30, 70, 110, 140, 160],  // online + can-modify-again
    'customer-reviewing': [50, 150]
};
/**
 * @param {number=0} status
 * @constructor
 */
var Status = function (status) {
    if (arguments.length) {
        this.status = status;
    } else {
        this.status = -1;
    }
    this.attrs = {};
};
/**
 * @param {string} name
 * @returns {boolean}
 */
Status.prototype.is = function (name) {
    return statusMap.hasOwnProperty(name) &&
        statusMap[name].indexOf(this.status) >= 0 ||
        this.attrs[name];
};
/**
 * @param {string} name
 * @returns {boolean}
 */
Status.prototype.not = function (name) {
    return !this.is(name);
};
/**
 * @param {string} key
 * @param {boolean} val
 */
Status.prototype.set = function (key, val) {
    this.attrs[key] = val;
};
/**
 * @param {number} [status]
 * @returns {Status}
 */
module.exports = function (status) {
    return new Status(status);
};
