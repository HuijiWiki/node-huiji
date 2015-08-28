/*
 * error.js exports customized Errors thrown out from mwapi.js and api.js.
 * These customized errors are described as follows, 
 *   Parameter: thrown if parameter given is missing or incomplete,
 *   Request: thrown if MediaWiki returns error when calling its api
 */
var util = require('util');

var BaseError = function(msg, constr) {
  Error.captureStackTrace(this, constr || this);
  this.message = msg || 'Error';
};
util.inherits(BaseError, Error);
BaseError.prototype.name = 'Base Error';

function customized(name) {
  var CustomizedError = function(msg) {
    CustomizedError.super_.call(this, msg, this.constructor);
  };
  util.inherits(CustomizedError, BaseError);
  CustomizedError.prototype.message = name;
  return CustomizedError;
}

module.exports = {
  Parameter: customized('Parameter Error'),
  Request: customized('Request Error')
};
