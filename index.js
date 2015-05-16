module.exports = (function() {
  var request = require('request');
  var _ = require('lodash');
  
  var Huiji = function() {
  };
  
  Huiji.prototype = {
    /*
     * Generate part of url to get extracts of pages using parameters in *o*
     *
     * Parameter *o*, required, defined as {
     *   exlimit, int, required, not bigger than 20, 1 by default,
     *   exintro, true or false, optional, true by default,
     *   exsentences, int, optinal, not used by default,
     *   exchars, int, optional, not used by default,
     *   explaintext, true or false, optional, true by default,
     *   exsectionformat, string ([plain|wiki]), optional, 'plain' by default,
     *   exvariant, string, optional, not used by default.
     * }
     *
     * Will generate api GET url for prop=extracts, using following default
     * parameters:
     *   exlimit, no more than 20,
     *   exintro, not using exchars or exsentences,
     *   explaintext,
     *   exsectionformat: plain,
     *   excontinue, no use,
     *   exvariant, no use.
     * }
     *
     * However, one can override these parameters by passing different values 
     * into *o*.
     *
     * Return query string used by prop=extracts, e.g.,
     *   &exlimit=10&exintro=&explaintext=&exsectionformat=plain
     */
    extracts: function(o) {
      if (_.isEmpty(o)) return '';
      var exlimit = o.exlimit || 1;
      exlimit = (exlimit > 20) ? 20 : (exlimit < 1 ? 1 : exlimit);
      var exintro = (o.exintro == undefined) ? true : o.exintro;
      var exsentences = exintro ? undefined : o.exsentences;
      var exchars = (!exintro && !exsentences) ? o.exchars : undefined; 
      var explaintext = (o.explaintext == undefined) ? true : o.explaintext;
      var exsectionformat = o.exsectionformat || 'plain';
      var exvariant = o.exvariant;
      var raw = {
        'exlimit': exlimit,
        'exintro': (exintro ? '' : undefined),
        'exsentences': exsentences,
        'exchars': exchars,
        'explaintext': (explaintext ? '' : undefined),
        'exsectionformat': exsectionformat,
        'exvariant': exvariant
      };
      var params = _.reduce(raw, function(res, v, k) {
        if (v != undefined) res[k] = v;
        return res;
      }, {});
      return _.reduce(params, function(res, v, k) {
        res += '&' + k + '=' + v;
        return res;
      }, '');
    },
    /*
     * Generate part of url to get thumbnails of pages using parameters in *o*
     *
     * Parameter *o*, required, defined as {
     *   pilimit, int, required, not bigger than 50, 1 by default,
     *   pithumbsize, int, required, 50 by default,
     * }
     *
     * Will generate api GET url for prop=pageimages, using following default
     * parameters:
     *   pilimit, no more than 50,
     *   pithumbsize, 50 by default,
     *   piprop, no use,
     *   picontinue, no use.
     * }
     *
     * However, one can override these parameters by passing different values 
     * into *o*.
     *
     * Return query string used by prop=pageimages, e.g.,
     *   &pilimit=20&pithumbsize=320
     */
    pageimages: function(o) {
      if (_.isEmpty(o)) return '';
      var pilimit = o.pilimit || 1;
      pilimit = (pilimit > 50) ? 50 : (pilimit < 1 ? 1 : pilimit);
      var pithumbsize = o.pithumbsize || 50;
      return '&pilimit=' + pilimit + '&pithumbsize=' + pithumbsize;
    },
    /*
     * Generate query string for prop
     *
     * Parameter *o*, a dict where key is a valid property and value is an 
     *   array of parameters for the key 
     */
    prop: function(o) {
      if (_.isEmpty(o)) return '';
      var qs = '&prop=' + _.keysIn(o).join('|');
      var that = this;
      return _.reduce(o, function(res, v, k) {
        var func = that[k];
        if (func) res += func(v);
        return res;
      }, qs);
    },
    /*
     * Call action=query mediawiki api. 
     *
     * Parameter *o*, required, defined as {
     *   titles, array of titles of pages queried, be careful of its length, 
     *   pageids, array of pageids of pages queried, be careful of its length,
     *   (priority: titles > pageids, only one of them will be used)
     *
     *   prop, a dict where key is a valid property and value is an array of 
     *   parameters for the key prop,
     *
     *   list, a dict where key is a valid list and value is an array of 
     *   parameters for the key list,
     *
     *   generator, a dict where key is a valid generator and value is an 
     *   array of parameters for the key generator,
     *
     *   redirects, true or false, optional, true by default,
     *
     *   meta, indexpageids, export, exportnowrap, iwurl, continue, 
     *   rawcontinue, pageids, revids, converttitles, no use,
     * }
     *
     * *url*, url of wiki queried, optional, e.g., 'http://lotr.huiji.wiki'
     *
     * *callback*, callback function to be called after sending request. If
     * not provided, return query string instead. E.g., 
     * '&prop=extracts|pageimages&exlimit=2&exintro=&explaintext=&exsectionformat=plain&pilimit=2&pithumbsize=320'
     *
     * Will use following default parameters:
     *   redirects, true,
     *   format, json
     *
     */
    query: function(o, url, callback) {
      if (_.isEmpty(o)) return '';
      var titles = o.titles || [];
      var pageids = o.pageids || [];
      var qs = '';
      if (!_.isEmpty(titles)) {
        qs += '&titles=' + titles.join('|');
      } else if (!_.isEmpty(pageids)) {
        qs += '&pageids=' + pageids.join('|');
      }
      // Currently, prop() only
      // var url = wikiUrl + '/api.php?action=query';
      if (!_.isEmpty(o.prop)) {
        qs += this.prop(o.prop);
      }
      if (!url || !callback) return qs;
      
      var redirects = (o.redirects == undefined) ? true : o.redirects;
      url += '/api.php?action=query&format=json' + 
        (redirects ? redirects : '');
      this.send(url, callback);
    },
    /*
     * Do request to *url*, e.g., 
     * http://lotr.huiji.wiki/api.php?action=query&prop=extracts&exlimit=
     */
    send: function(url, callback) {
      /*
      request.get(url, function(err, res, body) {
        
      });
      */
      callback('');
    }
  };

  return Huiji;
}());

