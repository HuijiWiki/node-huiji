var _ = require('lodash');

var defaults = _.partialRight(_.assign, function(vdst, vsrc) {
  if (typeof(vdst) == 'object' && typeof(vsrc) == 'object') {
    return defaults(vdst, vsrc);
  } else {
    return _.isUndefined(vdst) ? vsrc : vdst;
  }
});

module.exports = {
  /*
   * hackFunc() is a utility function to return a helper function for users. 
   *
   * *include* is defined as, {
   *   all, array of string, users' input will be hacked if the input contains 
   *   all of these elements.
   *   one, array of string, users' input will be hacked if the input contains 
   *   any of these elements.
   * }
   * *exclude* is defined as, {
   *   all, array of string, users' input will not be hacked if the input 
   *   contains all of these elements.
   *   one, array of string, users' input will not be hacked if the input 
   *   contains any of these elements.
   * }
   */
  hackFunc: function(include, exclude) {
    var include_all = include.all || [];
    var include_one = include.one || [];
    var exclude_all = exclude.all || [];
    var exclude_one = exclude.one || [];
    return function(msg) {
      var res_include_all = _.every(include_all, function(n) {
        return (msg.indexOf(n) < 0) ? false : true;
      });
      var res_include_one = _.some(include_one, function(n) {
        return (msg.indexOf(n) < 0) ? false : true;
      }) || _.isEmpty(include_one);
      var res_exclude_all = !_.every(exclude_all, function(n) {
        return (msg.indexOf(n) < 0) ? false : true;
      }) || _.isEmpty(exclude_all);
      var res_exclude_one = !_.some(exclude_one, function(n) {
        return (msg.indexOf(n) < 0) ? false : true;
      });
      return res_include_all && res_include_one 
        && res_exclude_all && res_exclude_one;
    };
  },
  /*
   * Fill missing fields from *src* to *dst*. Unlike _.defaults in lodash, 
   * this defaults() uses deep-copy like method to handle default values.
   *
   * For example, let 
   *   dst be { 'o': { 'foo': 1 } }, 
   *   src be { 'bar': 2, 'o': { 'foo': 3, 'bar': 4 } },
   *   _.defaults(dst, src) will be { 'bar': 2, 'o': { 'foo': 1 } },
   *   defaults(dst, src) will be { 'bar': 2, 'o': { 'foo': 1, 'bar': 4 } }
   */
  defaults: defaults,
  /*
   * Copy data from *src* to *dst* only for those fields that exist in *dst*
   * if a certain field does not exist in *src*, remove such field from *dst*
   */
  fill: function(dst, src) {
    _.each(dst, function(v, k) {
      v = src[k]
      if (v === undefined)
        delete dst[k];
      else
        dst[k] = v;
    });
    return dst;
  },
  /*
   * Return *value* if it is between *min* and *max*. Otherwise, 
   *   return *min* if *value* is smaller than *min*, or 
   *   return *max* if *value* is bigger than *max*.
   *
   * Set *value* to *defaultValue* if it is undefined.
   */
  limit: function(value, min, max, defaultValue) {
    return (value > max) ? max : (value < min ? min : value);
  },
  /*
   * Return *defaultValue* if *value* is undefined. Otherwise,
   * return *value* itself.
   */
  option: function(value, defaultValue) {
    return (value === undefined) ? defaultValue : value;
  }
};
