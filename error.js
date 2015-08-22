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

/*
var ParameterError = function(msg) {
  ParameterError.super_.call(this, msg, this.constructor);
};
util.inherits(ParameterError, BaseError);
ParameterError.prototype.message = 'Parameter Error';
*/

module.exports = {
  Parameter: customized('Parameter Error'),
  Request: customized('Request Error')
};
