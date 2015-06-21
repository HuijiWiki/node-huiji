module.exports = (function() {
  var request = require('request');
  var _ = require('lodash');
  var self = null; // point to MWAPI itself
  
  var MWAPI = function() {
    self = this;
  };
  
  MWAPI.prototype = {
    /*******************************Query: prop*******************************/
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
     * However, one is still able to use exchars or exsentences by overriding 
     * them in *o*.
     *
     * For more details, check https://www.mediawiki.org/wiki/Extension:TextExtracts#API
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
      var raw = {
        'exlimit': exlimit,
        'exintro': (exintro ? '' : undefined),
        'exsentences': exsentences,
        'exchars': exchars,
        'explaintext': (explaintext ? '' : undefined),
        'exsectionformat': exsectionformat
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
     * For more details, check http://home.huiji.wiki/api.php prop=pageimages 
     * section
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
    /*******************************Query: list*******************************/
    /*
     * Generate part of url to search using parameters in *o*
     *
     * Parameter *o*, required, defined as {
     *   srsearch, required, keyword to search,
     *   srwhat, optional, 3 available values: 
     *     'title', search in title,
     *     'text', search in text,
     *     'nearmatch', search in title via exact matching,
     *     'title' by default
     *   srlimit, optinal, numbers of searching result, no more than 50, 10 
     *   by default
     * }
     *
     * Will generate api GET url for list=search, using following parameters:
     *   srsearch, required,
     *   srnamespace, no use,
     *   srwhat, 'title' by default,
     *   srinfo, no use,
     *   srprop, no use,
     *   sroffset, no use,
     *   srlimit, no more than 50, 10 by default,
     *   srinterwiki, no use.
     * }
     *
     * For more details, check https://www.mediawiki.org/wiki/API:Search
     *
     * Return query string used by list=search, e.g., 
     *   &srsearch=巴金斯&srwhat=text&srlimit=10
     */
    search: function(o) {
      if (_.isEmpty(o)) return '';
      if (!o.srsearch) return '';
      var srwhat = o.srwhat || 'title';
      if (_.indexOf(['title', 'text', 'nearmatch'], srwhat) < 0) 
        srwhat = 'title';
      var srlimit = o.srlimit || 10;
      srlimit = (srlimit > 50) ? 50 : (srlimit < 1 ? 1 : srlimit);
      return '&srsearch=' + o.srsearch + '&srwhat=' + srwhat 
        + '&srlimit=' + srlimit;
    },
    /*
     * Generate query string for prop, list and meta
     *
     * *type* is the type of the query. The only 3 valid values are prop, 
     * list and meta.
     * *o* is a dict where key is a valid module and value is 
     * parameters for such module.
     */
    _query: function(type, o) {
      if (!type || _.indexOf(['prop', 'list', 'meta'], type) < 0) return '';
      if (_.isEmpty(o)) return '';
      var qs = '&' + type + '=' + _.keysIn(o).join('|');
      return _.reduce(o, function(res, v, k) {
        var func = self[k];
        if (func) res += func(v);
        return res;
      }, qs);
    },
    /*
     * Generate query string for Query: prop
     *
     * *o* is a dict where key is a valid module and value is 
     * parameters for such module.
     */
    prop: function(o) {
      return self._query('prop', o);
    },
    /*
     * Generate query string for Query: list
     *
     * *o* is a dict where key is a valid module and value is 
     * parameters for such module.
     */
    list: function(o) {
      return self._query('list', o);
    },
    /*
     * Call action=query mediawiki api. 
     *
     * Parameter *o*, required, defined as {
     *   titles, array of titles of pages queried, be careful of its length, 
     *   pageids, array of pageids of pages queried, be careful of its length,
     *   (priority: titles > pageids, only one of them will be used)
     *
     *   prop, a dict where key is a valid property module and value is its 
     *   parameters,
     *
     *   list, a dict where key is a valid list module and value is its 
     *   parameters,
     *
     *   generator, a dict where key is a valid generator and value is its 
     *   parameters,
     *
     *   generator could be used along with prop, but list could only be used 
     *   alone. So you should set either list or prop, not both. list is prior.
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
     *   redirects, 
     *   indexpageids, 
     *   format, json
     *
     */
    query: function(o, url, callback) {
      if (_.isEmpty(o)) return '';
      var qs = '';
      if (o.list) {
        // list
        qs += self.list(o.list);
      } else {
        // prop, TODO: generator
        var titles = o.titles || [];
        var pageids = o.pageids || [];
        if (!_.isEmpty(titles)) {
          qs += '&titles=' + titles.join('|');
        } else if (!_.isEmpty(pageids)) {
          qs += '&pageids=' + pageids.join('|');
        }
        // Currently, prop() only
        if (!_.isEmpty(o.prop)) {
          qs += self.prop(o.prop);
        }
      }
      if (!url || !callback) return qs;
      
      var redirects = (o.redirects == undefined) ? true : o.redirects;
      url += '/api.php?action=query&format=json&indexpageids' + 
        (redirects ? '&redirects' : '') + qs;
      self.send(url, callback);
    },
    /*
     * Do request to *url*, e.g., 
     * http://lotr.huiji.wiki/api.php?action=query&prop=extracts&exlimit=
     */
    send: function(url, callback) {
      if (!url) callback('send(): url is empty.');
      console.log('send(): ' + url);
      request.get(url, function(err, res, body) {
        if (err) callback(err);
        body = JSON.parse(body);
        if (body && body.query) {
          callback('', body);
        } else {
          callback('send(): No results returned.');
        }
      });
    }
  };

  return MWAPI;
}());

