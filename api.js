module.exports = (function() {
  var _ = require('lodash');
  var MWAPI = require('./mwapi.js');
  var mwapi = new MWAPI();
  
  var API = function() {
  };
  
  API.prototype = {
    /*
     * Get detail information about pages with the given *titles*
     *
     * Will call MWAPI.query().
     *
     * Parameter *o*, required, defined as {
     *   titles, required, array of titles of pages queried, should not be 
     *   longer than 20 because prop=extracts does not support,
     *   abstracts, optional, length of abstracts returned. If not set, will 
     *   return intro information of the pages (using exintro in prop=extracts)
     *   size, optional, size of thumbnails, 200 by default
     * }
     *
     * *url*, url of wiki queried, optional, e.g., 'http://lotr.huiji.wiki'
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
    details: function(o, url, callback) {
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
      if (!url) return mwapi.query(p);
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
    }
  };
  
  return API;
}());