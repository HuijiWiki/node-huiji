module.exports = (function() {
  var request = require('request');
  var _ = require('lodash');
  
  var Huiji = function() {
  };
  
  Huiji.prototype = {
    /*
     * Get extracts of pages with given titles
     *
     * Parameter *o*, defined as {
     *   exlimit, int, required, not bigger than 20, 1 by default,
     *   exintro, true or false, optional, true by default,
     *   exsentences, int, optinal, not used by default,
     *   exchars, int, optional, not used by default,
     *   exsectionformat, string ([plain|wiki]), optional, 'plain' by default,
     *   exvariant, string, not used by default.
     * }
     *
     * Will generate api GET url for prop-extracts, using following default
     * parameters:
     *   exintro, not using exchars or exsentences,
     *   explaintext,
     *   exsectionformat: plain,
     *   exlimit, length of *o*.titles,
     *   excontinue, no use,
     *   exvariant, no use.
     * }
     *
     * Return query string used by prop=extracts, e.g.,
     *   &exintro&exlimit=10
     */
    extracts: function(o) {
      if (!o) return '';
      var exlimit = o.exlimit || 1;
      exlimit = (exlimit > 20) ? 20 : exlimit;
      var exintro = (o.exintro == undefined) ? true : o.exintro;
      var exsentences = exintro ? undefined : o.exsentences;
      var exchars = (!exintro && !exsentences) ? o.exchars : undefined; 
      var exsectionformat = o.exsectionformat || 'plain';
      var exvariant = o.exvariant;
      var raw = {
        'exintro': (exintro ? '' : undefined),
        'exsentences': exsentences,
        'exchars': exchars,
        'exsectionformat': exsectionformat,
        'exvariant': exvariant
      };
      var params = _.reduce(raw, function(res, v, k) {
        v && (res[k] = v);
        return res;
      }, {});
      return _.reduce(params, function(res, v, k) {
        res += '&' + k + '=' + v;
        return res;
      }, '');
    },
    /*
     * Get extracts result from *result*
     */
    _extracts_result: function(result, callback) {
    },
    /*
     * Call action=query mediawiki api
     *
     * Parameter *o*, defined as {
     *   titles, array of titles of pages queried, be careful of its length
     *   prop, a dict where key is a valid property and value is an array of 
     *   parameters for the key prop,
     *   list, a dict where key is a valid list and value is an array of 
     *   parameters for the key list,
     *   generator, a dict where key is a valid generator and value is an 
     *   array of parameters for the key generator,
     *   meta, indexpageids, export, exportnowrap, iwurl, continue, 
     *   rawcontinue, pageids, revids, converttitles, no use,
     * }
     *
     * 
     */
    query: function(o, callback) {
      
    }
  };
}());
