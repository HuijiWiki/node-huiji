module.exports = (function() {
  var _ = require('lodash');
  var MWAPI = require('./mwapi.js');
  var mwapi = new MWAPI();
  var self = null; // point to API itself
  
  /*
   * *url*, url of wiki queried, optional, e.g., 'http://lotr.huiji.wiki'
   */
  var API = function(url) {
    this.url = url;
    self = this;
  };
  
  API.prototype = {
    /*
     * Get detail information about pages with the given titles
     *
     * Will call MWAPI.query(), prop, extracts|pageimages.
     *
     * Parameter *o*, required, defined as {
     *   titles, required, array of titles of pages queried, should not be 
     *   longer than 20 because prop=extracts does not support,
     *   abstracts, optional, length of abstracts returned. If not set, will 
     *   return intro information of the pages (using exintro in prop=extracts)
     *   size, optional, size of thumbnails, 200 by default
     * }
     *
     * *callback*(err, data)
     *
     * Return array of such objects, {
     *   pageid, 
     *   title,
     *   extract,
     *   thumbnail {
     *     source, url of thumbnail,
     *     width,
     *     height
     *   },
     *   pageimage, filename of thumbnail,
     * }
     */
    details: function(o, callback) {
      if (!o) callback('details(): parameter o NOT FOUND.');
      if (!o.titles) callback('details(): o.titles NOT FOUND.');
      var p = {};
      var len = o.titles.length;
      p.titles = (len > 20) ? _.dropRight(o.titles, len - 20) : o.titles;
      len = p.titles.length;
      p.prop = {
        extracts: {
          exlimit: len,
          exchars: (o.abstracts ? o.abstracts : undefined)
        },
        pageimages: {
          pilimit: len,
          pithumbsize: (o.size || 200)
        }
      };
      var url = self.url;
      if (!url || !callback) return mwapi.query(p);
      mwapi.query(p, url, function(err, data) {
        if (err) callback(err);
        var pageids = data.query.pageids;
        if (_.isEqual(pageids, [ '-1' ])) {
          callback('', []);
        } else {
          var ret = _.map(pageids, function(id) {
            return data.query.pages[id];
          });
          callback('', ret);
        }
      });
    },
    /*
     * Search with a given keyword
     *
     * Will call MWAPI.query(), list, search.
     *
     * Parameter *o*, required, defined as {
     *   key, string, required, the keyword to search,
     *   limit, int, optional, length of searching results, 10 by default, no 
     *   more than 50,
     *   target, string, optional, the target to search, available values are: 
     *     title, pages matched if their titles contain the keyword,
     *     text, pages matched if their text contain the keyword,
     *     default, first match title then match text until *limit* results 
     *     are collected.
     *   TODO:
     *   sort,
     *   quality
     * }
     *
     * *callback*(err, data)
     *
     * Return array of titles of result pages, 
     */
    search: function(o, callback) {
      if (!o) callback('search(): parameter o NOT FOUND.');
      if (!o.key) callback('search(): parameter o.key NOT FOUND.');
      var limit = o.limit || 10;
      limit = (limit > 50) ? 50 : (limit < 1 ? 1 : limit);
      var target = o.target || 'default';
      if (['title', 'text', 'default'].indexOf(target) < 0) target = 'default';
      var p = {};
      p.list = {
        search: {
          srsearch: o.key,
          srwhat: (target == 'text' ? 'text': 'title'),
          srlimit: limit
        }
      };
      var url = self.url;
      if (!url || !callback) return mwapi.query(p);
      mwapi.query(p, url, function(err, data) {
        if (err) callback(err);
        var res = _.pluck(data.query.search, 'title');  //  TODO: sort
        if (target != 'default') return callback('', res);
        // Handle target == 'default' case
        var lenTitle = res.length;
        if (lenTitle >= limit) return callback('', res);
        // Do another search with target == 'text', try best to get up to 
        // *limit* results.
        p.list.search.srwhat = 'text';
        mwapi.query(p, url, function(err, data) {
          if (err) callback(err);
          var resText = _.pluck(data.query.search, 'title');  //  TODO: sort
          res = _.union(res, resText);
          callback('', res);
        });
      });
    }
  };
  
  return API;
}());
