module.exports = (function() {
  var wechat = require('wechat');
  var express = require('express');
  var _ = require('lodash');

  var API = require('./api.js');
  var api = new API();

  /*
   * Base class for all WeChat server-side applications serving wikis on huiji
   *
   * Parameter *config* is required, defined as {
   *   name, required, name of your wiki site. More precisely, name is the 
   *   first part of the url of your wiki site. E.g., 'lotr' is the name for 
   *   http://lotr.huiji.wiki
   *
   *   wechat, a dict, required, credential for your wechat app, defined as {
   *     token, required,
   *     appid, required,
   *     encodingAESKey, required
   *   }
   *   For more information, please check out Wechat's official document: 
   *   http://mp.weixin.qq.com/wiki/home/index.html
   *   
   *   port, int, optional, indicates which port to be listened. You can pass 
   *   it into start() instead when calling to start the server or just ignore 
   *   it and a default port 80 will be used instead.
   *
   *   hack, a dict or function, optional, will be used to hack user's inputs 
   *   for various reasons. A simple dictionary is ok and a customized 
   *   function is also allowed.
   * }
   */
  var WeChat = function(config) {
    // this.conf
    if (!config) return;
    if (!config.name || !config.wechat) return;
    var wechat_required = _.every(['token', 'appid', 'encodingAESKey'], function(n) {
      return _.has(config.wechat, n);
    });
    if (!wechat_required) return;

    this.conf = config;
    this.url = this._url();

    // init this._keywords_key && this._keywords_func
    this._keywords_key = [];
    this._keywords_func = [];

    this.app = express();
    this.app.use('', wechat(config.wechat)
      .text(this.handlerText)
      .image(this.handlerImage)
      .voice(this.handlerVoice)
      .video(this.handlerVideo)
      .location(this.handlerLocation)
      .link(this.handlerLink)
      .event(this.handlerEvent)
      .middlewarify());
  };
  
  WeChat.prototype = {
    /*
     * Get url of the wiki site
     */
    _url: function() {
      return 'http://' + this.conf.name + '.huiji.wiki';
    },
    /*
     * Start wechat server
     *
     * *port*, which port to listen to, optinal. If not set, will look up 
     * conf.port and if still not set 80 by default.
     */
    start: function(port) {
      var port = port || this.conf.port || 80;
      var server = app.listen(port, function() {
        // TODO: log
      });
      server.on('error', function(err) {
        // TODO: log
      });
    },
    /*************************************************************************
     * Handle different type of requests and give response                   *
     *************************************************************************/
    /*
     * Handle text message
     *
     * Default behavior of handlerText() will be as followed, 
     *   1. hack(), translate user's input in order to , e.g., avoid typo, 
     *      support new keywords without failing legacy ones, etc.
     *   2. keyword(), handle special keywords returning specific responses. 
     *      Users can call addKeyword() to add special cases.
     *      NOTICE: All intercepted keywords will not be passed into post-
     *              process.
     *   3. Return detail information of the page queried if user's input get 
     *      a precise hit; Otherwise, list of search results will be returned.
     */
    handlerText: function(msg, req, res, next) {
      // 1. hack()
      msg = this.hack(msg);
      // 2. keyword()
      var handled = this.keyword(msg);
      if (handled !== false) {
        res.reply(handled);
      } else {
        var hit = api.details({
          titles: [ msg ]
        }, this.url, function(err, data) {
          if (err) {
            // TODO: HOW TO HANDLE ERROR
            console.log(err);
          } else {
            if (data.length == 0) {
              // TODO: NO RESULTS, goto SEARCH
            } else {
              // TODO: Format a wechat response object
            }
          }
        });
      }
    },
    handlerImage: function(msg, req, res, next) {
    },
    handlerVoice: function(msg, req, res, next) {
    },
    handlerVideo: function(msg, req, res, next) {
    },
    handlerLocation: function(msg, req, res, next) {
    },
    handlerLink: function(msg, req, res, next) {
    },
    handlerEvent: function(msg, req, res, next) {
    },
    /*
     * Hack the input for various reasons, e.g. user's typo, redirection, ...
     *
     * hack() will use this.conf.hack which by default is a dictionary  
     * to simply translate *msg* to hacked message. One can inherit WeChat and 
     * override this hack() or just pass a hack() function into configuration.
     *
     * hack() will be called at the beginning of handlerText().
     */
    hack: function(msg) {
      var raw = msg;
      if (msg == undefined || msg == '') msg = '';
      else msg = '' + msg;
      var hackInConf = this.conf.hack;
      if (!hackInConf) return msg;
      // use *raw* as input instead of processed *msg*, let user define its 
      // behavior
      if (typeof hackInConf == 'function') return hackInConf(raw);  
      if (typeof hackInConf == 'object') {
        var hacked = hackInConf[msg];
        if (!hacked) return msg;
        else return '' + hacked;
      }
    },
    /*
     * Handle special keyword cases
     *
     * *msg*, user's input, required

     * Such special keyword cases will be handled only in functions added by 
     * addKeyword() and will not be passed to following process. 
     *
     * Return response if handled; false otherwise.
     */
    keyword: function(msg) {
      if (!msg && msg != 0) return false;
      var handled = false;
      var res = undefined;
      _.forEach(this._keywords_key, function(key, index) {
        var func = this._keywords_func[index];
        if (typeof(key) == 'string') {
          if (msg == key) {
            res = func(msg);
            handled = true;
            return false;
          }
        } else if (key instanceof RegExp) {
          if (key.test(msg)) {
            res = func(msg);
            handled = true;
            return false;
          }
        } else if (typeof(key) == 'function') {
          if (key(msg)) {
            res = func(msg);
            handled = true;
            return false;
          }
        }
      }, this);
      if (handled) return res;
      else return false;
    },
    /*
     * Add keyword listener
     *
     * handlerText() will handle special cases of user's input after hack(). 
     * *key* could be: 
     * 1. a string, input will be accepted if it equals the string exactly,
     * 2. a RegExp object, input will be acecepted if it matches the regular 
     *    expression,
     * 3. a function, input will be accepted if the function return true using 
     *    input as its only parameter.
     * 4. an array, will iterate the array and do addKeyword() for every 
     *    elements.
     * *func* is a function which accepts the only parameter, the input message
     *
     * Such special keyword cases will be handled only in *func* and will not 
     * be passed to following process. 
     */
    addKeyword: function(key, func) {
      if (key == undefined || key == null || _.isNaN(key) || _.isEqual(key, {})
        || key == [] || key == '')
        return;
      if (key instanceof RegExp || typeof(key) == 'function') {
        this._keywords_key.push(key);
        this._keywords_func.push(func);
      } else if (_.isArray(key)) {
        var self = this;
        _.forEach(key, function(k) {
          self.addKeyword(k, func);
        });
      } else {
        key = '' + key;
        this._keywords_key.push(key);
        this._keywords_func.push(func);
      }
    }
  };
  
  return WeChat;
}());