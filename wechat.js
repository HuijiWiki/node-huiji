module.exports = (function() {
  var wechat = require('wechat');
  var express = require('express');
  var _ = require('lodash');
  var Q = require('q');
  var LRU = require('lru-cache');

  var util = require('./util.js');
  var API = require('./api.js');
  var api = null;	// API caller
  var cache = null;     // cache
  var self = null;	// point to WeChat itself
  var default_conf = {
    port: 80,
    CONST: {
      MSG_ERR: '啊啦，服务器傲娇啦~~~~(>_<)~~~~ 。请稍后重试~！',
      MSG_NORESULT: '抱歉，暂未找到相关词条，不妨试试其他关键词~？',
      MSG_SUBSCRIBE: '感谢您关注本维基公众号！本维基依托于灰机维基平台。灰机，带你飞！',
      PIC_PLACEHOLDER: 'http://home.huiji.wiki/uploads/8/81/Wechat_placeholder_logo.png',
      EXTRACT_REPLY_LIMIT: 160,
      SEARCH_LIMIT: 7
    },
    cache: {
      max: 10000,
      dispose: function(k, v) {
        console.log('cache drop: %s', k);
      },
      maxAge: 1000 * 60 * 60 * 24
    }
  };

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
   *   it and a default port 80 will be used.
   * }
   */
  var WeChat = function(config) {
    /*
     * To avoid multiple WeChat instances intervene with each other, 
     * let it be Singleton
     */
    if (self != null) return self;
    /*
     * *config* is required, 
     *   config.name,
     *   config.wechat,
     *   config.wechat.token,
     *   config.wechat.appid,
     *   config.wechat.encodingAESKey
     * All of the above are required.
     */
    if (!config) return;
    if (!config.name || !config.wechat) return;
    var wechat_required = 
      _.every(['token', 'appid', 'encodingAESKey'], function(n) {
        return _.has(config.wechat, n);
      });
    if (!wechat_required) return;

    // copy default configurations if they are not set
    this.conf = util.defaults(config, default_conf);
    // check CONST.MSG_X's type, either string or array
    var msg_checked = 
      _.every(['MSG_ERR', 'MSG_NORESULT', 'MSG_SUBSCRIBE'], function(e) {
        var MSG = this.conf.CONST[e];
        return _.isString(MSG) || _.isArray(MSG);
      }, this);
    if (!msg_checked) return;
    
    this.url = this._url();
    api = new API(this.url);

    if (this.conf.cache) cache = LRU(this.conf.cache);

    // used for hack
    this._hack_key = [];
    this._hack_value = [];

    // used for keyword
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
    // Singleton self points to WeChat instance itself
    self = this;
  };
  
  WeChat.prototype = {
    /*
     * Start wechat server
     *
     * *port*, which port to listen to, optinal. If not set, will look up 
     * conf.port and if still not set, 80 by default.
     */
    start: function(port) {
      var port = port || this.conf.port || 80;
      var server = this.app.listen(port, function() {
        console.log("WeChat server for %s starts...", self.url);
      });
      server.on('error', function(err) {
        console.log(err);
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
     *      support new keywords without failing legacy ones, explicitly 
     *      redirection out-of-wiki-site, etc.
     *      Users should call addHack() to add various hack-cases.
     *   2. keyword(), handle special keywords returning specific responses. 
     *      Users should call addKeyword() to add various keyword-cases.
     *      NOTICE: All intercepted keywords will not be passed into post-
     *              process.
     *   3. Into normal text handling process:
     *      1) Try _details() if the text hit a title precisely,
     *      2) do _search() if no such title is hit,
     *      3) do _search_details() to get details of these searching results
     *   4. filter(), filter these qualified results, usually to do an after 
     *      hack
     */
    handlerText: function(msg, req, res, next) {
      var text = msg.Content || '';
      console.log("Text message recv: %s", text);
      // 1. hack()
      text = self.hack(text);
      // 2. cache
      var cached = self._cache_get(text);
      if (cached) return self._reply(text, cached, res);
      // 3. keyword()
      var handled = self.keyword(text);
      /*
       * keyword() supports complicated keyword handlers. Asynchronized logic 
       * is supported but such handler must return a node-style function. 
       * keyword() will transform it into a Promise.
       */
      if (Q.isPromiseAlike(handled)) {
        handled.then(
          function keyword_resolved(ret) {
            self._reply(text, ret, res, true);
          }, 
          function keyword_rejected(err) {
            self._err(err, res);
          }
        );
      } else if (handled !== false) {
        self._reply(text, handled, res, true);
      } else {
        // 4. Into the main process, hit or search
        self._details(text, function(err, data) {
          if (err) return self._err(err, res);
          if (data.length == 0) {
            // Message is not a precise title of any page. Try search.
            self._search(text, function(err, titles) {
              if (err) return self._err(err, res);
              if (titles.length == 0) return self._noresult(res);
              // Get details of these result pages
              self._search_details(titles, function(err, data) {
                if (err) return self._err(err, res);
                // Preserve order of the searching results strictly according 
                // to the order in titles
                var results = [];
                _.forEach(data, function(detail) {
                  var index = titles.indexOf(detail.title);
                  results[index] = self._single(detail);
                });
                self._reply(text, results, res);
              });
            });
          } else {
            self._reply(text, [ self._single(data[0]) ], res);
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
      if (msg.Event == 'subscribe') {
        self._subscribe(res);
      } // TODO: else if...
    },
    /*
     * Hack users' input for various reasons, e.g. avoid typo, support new 
     * keywords without failing legacy ones, explicitly redirection 
     * out-of-wiki-site, etc.
     *
     * *msg*, required, users' input
     *
     * Users should call addHack() before the wechat server starts. 
     * hack() will lookup _hack_key and return corresponding value in 
     * _hack_value if there is a hit. Otherwise, return what is passed in.
     *
     * By default, hack() will be called at the beginning of handlerText().
     */
    hack: function(msg) {
      if (msg == undefined || msg == '') msg = '';
      else msg = '' + msg;
      var hacked = false;
      var res = undefined;

      function hit(value) {
        res = value;
        hacked = true;
        return false;
      }

      _.forEach(this._hack_key, function(key, index) {
        var value = this._hack_value[index];
        if (typeof(key) == 'string') {
          if (msg == key) return hit(value);
        } else if (key instanceof RegExp) {
          if (key.test(msg)) return hit(value);
        } else if (typeof(key) == 'function') {
          ret = key(msg);
          if (ret === true) return hit(value);
          if (ret !== false) return hit(ret);
        }
      }, this);
      if (hacked) {
        console.log('hacked %s => %s', msg, res);
        return res;
      } else return msg;
    },
    /*
     * Add hack-case to support hack().
     *
     * Following types of hack-case are supported, 
     *   1. <string, string>, e.g., '囧恩' => '琼恩'
     *   2. <RegExp, string>, e.g., /^囧/ => '琼恩'
     *   3. <array, string>, e.g., ['囧', '囧恩', '穷恩'] => '琼恩'
     *   4. <dict object, undefined>, e.g., 
     *        { '囧': '琼恩', '囧恩': '琼恩' } => undefined (value not used)
     *   5. <function, string>, users' input will be filtered by function. 
     *        Those whose return value is true will be hacked; Else not.
     *        However, this hack-case also support dynamic hacking. If the 
     *        result of a return is not false and is not true either, use 
     *        the return value as the hacked result.
     *   6. <array, undefined>, e.g., 
     *        [{ 'key': '囧恩', 'value': '琼恩' }] => undefined 
     *        addHack() every elements in the array. Each element should be an 
     *        object containing only two fields: key & value.
     */
    addHack: function(key, value) {
      if (key == undefined || key == null || _.isNaN(key) || _.isEqual(key, {})
        || _.isEqual(key, []) || key == '')
        return;
      if (key instanceof RegExp || typeof(key) == 'function') {
        this._hack_key.push(key);
        this._hack_value.push(value);
      } else if (_.isArray(key)) {
        if (value === undefined) {
          _.forEach(key, function(k) {
            this.addHack(k.key, k.value);
          }, this);
        } else {
          _.forEach(key, function(k) {
            this.addHack(k, value);
          }, this);
        }
      } else if (typeof(key) == 'object') {
        _.forEach(key, function(v, k) {
          this._hack_key.push(k);
          this._hack_value.push(v);
        }, this);
      } else {
        key = '' + key;
        this._hack_key.push(key);
        this._hack_value.push(value);
      }
    },
    /*
     * Handle special keyword-cases
     *
     * *msg*, required, users' input

     * Such special keyword-cases will be handled only in functions added by 
     * addKeyword() and will not be passed to following process. 
     *
     * Return false if keyword not hit; Otherwise, return,
     *   1. A value, that will be replied to client at once,
     *   2. A Promise, that is transformed from a node-style function 
     *      configured by developer.
     */
    keyword: function(msg) {
      if (!msg && msg != 0) return false;
      var handled = false;
      var res = undefined;

      function hit(func) {
        /*
         * Pass *self* which points to wechat itself into keyword functions
         * This is useful for those complicated keyword handler. 
         * For those asynchronize handler, a node-style function should be 
         * returned. Promise related stuff will be handled here.
         */
        res = func.call(self, msg);
        if (typeof(res) == 'function') {
          res = Q.denodeify(res)();
        }
        handled = true;
        return false;
      }

      _.forEach(this._keywords_key, function(key, index) {
        var func = this._keywords_func[index];
        if (typeof(key) == 'string') {
          if (msg == key) return hit(func);
        } else if (key instanceof RegExp) {
          if (key.test(msg)) return hit(func);
        } else if (typeof(key) == 'function') {
          ret = key(msg);
          if (ret === true) return hit(func);
          if (ret !== false) return hit(ret);
        }
      }, this);
      if (handled) {
        console.log('keyword %s hit.', msg);
        return res;
      } else return false;
    },
    /*
     * Add keyword-case to support keyword().
     *
     * To provide dynamic keyword functionality (supposed to be rare case), 
     * the following code is similar to code of addHack(). 
     * *key* is similar to those for addHack(). However, 
     * *func* is a function which accepts users' input that produces the 
     * output and responds to client directly. It could yield a value which 
     * will be replied to client at once; Or yield a node-style function which 
     * will be transformed into a Promise if it contains asynchronized logic.
     * 
     * handlerText() will handle keyword-cases after hack(). Those inputs that 
     * hit a keyword-case will be handled only in corresponding *func* and will 
     * not be passed to following process. 
     */
    addKeyword: function(key, func) {
      if (key == undefined || key == null || _.isNaN(key) || _.isEqual(key, {})
        || _.isEqual(key, []) || key == '')
        return;
      if (key instanceof RegExp || typeof(key) == 'function') {
        this._keywords_key.push(key);
        this._keywords_func.push(func);
      } else if (_.isArray(key)) {
        if (func === undefined) {
          _.forEach(key, function(k) {
            this.addKeyword(k.key, k.func);
          }, this);
        } else {
          _.forEach(key, function(k) {
            this.addKeyword(k, func);
          }, this);
        }
      } else if (typeof(key) == 'object') {
        _.forEach(key, function(f, k) {
          this._keywords_key.push(k);
          this._keywords_func.push(f);
        }, this);
      } else {
        key = '' + key;
        this._keywords_key.push(key);
        this._keywords_func.push(func);
      }
    },
    /*
     * Filter the results passed from handlerText(), usually to do an after 
     * hack. 
     * This filter() will do the followings in order:
     *   1) call _.filter() to *results* to eliminate potential holes in 
     *      results array.
     *   2) call _filter() to do further filtering. However, the default 
     *      behavior of such _filter() is to do nothing and echo the 
     *      parameters passed in directly. Developers may override this 
     *      _filter() to customize their own filtering.
     *
     * *results*, array of messages bumped after normal text handling.
     * Return results array to be replied to users.
     */
    filter: function(results) {
      var after_results = _.filter( // in caes a careless developer does not 
                                    // check out holes in the filtered results
        this._filter(               // call customized _filter()
          _.filter(results)         // eliminate potential holes first
        )
      );
      return after_results;
    },
    /*
     * Do customize filtering on the results to be replied to users. 
     * Something happened when our site changes its default search engine. 
     * The result extracts will contain unexpected text and search result 
     * may contain pages under legacy namespace of wikia. 
     * We customized default behavior of the following _filter() for our own 
     * platform, so that this part of code is not universal applicable. 
     */
    _filter: function(results) {
      var reg_filter = /(^用户博客|^TV talk|@comment)/;
      return _.filter(results, function(msg) {
        var qualified = !reg_filter.test(msg.title);    // filter legacy namespaces
        if (qualified) {
          var desc = msg.description;
          var index = desc.indexOf('↑');
          if (index >= 0)
            msg.description = desc.substring(0, index); // filter tailing ref test
        }
        return qualified;
      });
    },
    /*
     * Get url of the wiki site
     */
    _url: function() {
      return 'http://' + this.conf.name + '.huiji.wiki';
    },
    /*
     * Get page url on the wiki site
     */
    _page_url: function(title) {
      var base = this.url || this._url();
      return base + '/wiki/' + title;
    },
    /*
     * Get value by key from cache
     * if cache is not set, return null.
     */
    _cache_get: function(key) {
      if (!cache) return null;
      var cached = cache.get(key);
      if (cached) console.log('cache hit: %s', key);
      return cached;
    },
    /*
     * Write <key, value> into cache
     * if *key* already exists in cache, do not do an additional write.
     *
     * Return false if cache is not set or a cache write does not happen.
     * Otherwise, return true if a cache-write succeeds.
     */
    _cache_set: function(key, value, maxAge) {
      if (!cache) return false;
      if (cache.has(key)) return false;

      maxAge = maxAge || this.conf.cache.maxAge;
      console.log('cache write: %s', key);
      cache.set(key, value, maxAge);
      return true;
    },
    /*
     * Wrap the first api.details(), before api.search().
     * _details() allows developers to inherit and change default parameters 
     * for api.details() call.
     */
    _details: function(title, callback) {
      api.details({
        titles: [ title ],
        size: 320
      }, callback);
    },
    /*
     * Wrap api.search(). 
     * _search() allows developers to inherit and change default parameters 
     * for api.search() call. 
     */
    _search: function(key, callback) {
      api.search({
        key: key,
        limit: this.conf.CONST.SEARCH_LIMIT
      }, callback);
    },
    /*
     * Wrap the second api.details(), after api.search().
     * _search_details() allows developers to inherit and change default 
     * parameters for api.details() call.
     */
    _search_details: function(titles, callback) {
      api.details({
        titles: titles,
        size: 320
      }, callback);
    },
    /*
     * Called when an error occurs. Respond plain text conf.CONST.MSG_ERR to 
     * client by default. 
     *
     * Now rolling message is supported. conf.CONST.MSG_ERR could be an array, 
     * _err() will choose one of them randomly. Even an object which 
     * represents a reply-with-pic is allowed to be in the array. 
     *
     * *err*, message of the error, will be logged.
     * *res*, will call res.reply() to respond to client.
     */
    _err: function(err, res) {
      console.log(err);
      var MSG_ERR = this.conf.CONST.MSG_ERR;
      if (_.isArray(MSG_ERR)) {
        res.reply(_.sample(MSG_ERR));
      } else {
        res.reply(MSG_ERR);
      }
      return;
    },
    /*
     * Called when no results to respond. Respond plain text 
     * conf.CONST.MSG_NORESULT to client by default.
     *
     * Now rolling message is supported. conf.CONST.MSG_NORESULT could be an 
     * array, _noresult() will choose one of them randomly. Even an object 
     * which represents a reply-with-pic is allowed to be in the array. 
     *
     * *res*, will call res.reply() to respond to client.
     */
    _noresult: function(res) {
      console.log('NO RESULTS');
      var MSG_NORESULT = this.conf.CONST.MSG_NORESULT;
      if (_.isArray(MSG_NORESULT)) {
        res.reply(_.sample(MSG_NORESULT));
      } else {
        res.reply(MSG_NORESULT);
      }
      return;
    },
    /*
     * Called when a user subscribes. Respond plain text 
     * conf.CONST.MSG_SUBSCRIBE to client by default.
     *
     * Now rolling message is supported. conf.CONST.MSG_SUBSCRIBE could be an 
     * array, _subscribe() will choose one of them randomly. Even an object 
     * which represents a reply-with-pic is allowed to be in the array. 
     *
     * *res*, will call res.reply() to respond to client.
     */
    _subscribe: function(res) {
      console.log('SUBSCRIBE');
      var MSG_SUBSCRIBE = this.conf.CONST.MSG_SUBSCRIBE;
      if (_.isArray(MSG_SUBSCRIBE)) {
        res.reply(_.sample(MSG_SUBSCRIBE));
      } else {
        res.reply(MSG_SUBSCRIBE);
      }
      return;
    },
    /*
     * Form wechat single message according to the result returned by API
     *
     * *res* represents a single record of data to be replied.
     */
    _single: function(res) {
      // handle thumbnail
      var picurl = '';
      // TODO: further process to thumbnail according to its size
      if (!res.thumbnail) {
        // if no thumbnail exists, a default pic should be returned.
        picurl = this.conf.CONST.PIC_PLACEHOLDER;
      } else {
        picurl = res.thumbnail.source;
      }
      res.extract = _.trunc(res.extract, {
        'length': this.conf.CONST.EXTRACT_REPLY_LIMIT, 
        'separator': /(，|。|\n)/
      });
      return {
        title: res.title,
        description: res.extract,
        url: this._page_url(res.title),
        picurl: picurl
      };
    },
    /*
     * Called when to reply to clients.
     * Will call filter() to eliminate unwanted results before reply.
     *
     * *key*, hacked (or not if not hit) message from clients.
     * *results*, array of messages to reply to clients. Each messages should 
     *   be in the exact format coming out from _single().
     * *res*, will call res.reply() to respond to client.
     * *raw*, whether to do extended post-process (e.g. filter)  to the 
     * *results*, false by default.
     */
    _reply: function(key, results, res, raw) {
      raw = raw || false;
      if (!raw) results = this.filter(results);
      if (results.length == 0) this._noresult(res);
      else {
        this._cache_set(key, results);
        res.reply(results);
      }
    }
  };

  return WeChat;
}());
