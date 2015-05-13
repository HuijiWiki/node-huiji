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
     *   titles: array of titles, length should not be bigger than 20
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
     *   &exintro&titles=芬罗德|芬威
     */
    extracts: function(o) {
      if (!o) return '';
      if (!o.titles) return '';
      var titles = o.titles;
      titles = _.slice(titles, 0, 20);
      var exlimit = titles.length;
      var query = titles.join('|');
      return query;
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