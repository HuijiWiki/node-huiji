var _ = require('lodash');

var defaults = _.partialRight(_.assign, function(vdst, vsrc) {
  if (typeof(vdst) == 'object') {
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
   * defaults() is a utility function to fill missing fields from *src* to 
   * *dst*. Unlike _.defaults in lodash, this defaults() uses deep-copy like 
   * method to handle default values.
   *
   * For example, let 
   *   dst be { 'o': { 'foo': 1 } }, 
   *   src be { 'bar': 2, 'o': { 'foo': 3, 'bar': 4 } },
   *   _.defaults(dst, src) will be { 'bar': 2, 'o': { 'foo': 1 } },
   *   defaults(dst, src) will be { 'bar': 2, 'o': { 'foo': 1, 'bar': 4 } }
   */
  defaults: defaults
};
