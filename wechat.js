module.exports = (function() {
  var wechat = require('wechat');
  var express = require('express');
  var _ = require('lodash');

  var API = require('./api.js');
  var api = null;	// API caller
  var self = null;	// point to WeChat itself
  var default_conf = {
    port: 80,
    CONST: {
      ERR: '啊啦，服务器傲娇啦~~~~(>_<)~~~~ 。请稍后重试~！',
      NO_RESULT: '抱歉，暂未找到相关词条，不妨试试其他关键词~？',
      PIC_PLACEHOLDER: 'http://home.huiji.wiki/uploads/8/81/Wechat_placeholder_logo.png'
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
    var wechat_required = _.every(['token', 'appid', 'encodingAESKey'], function(n) {
      return _.has(config.wechat, n);
    });
    if (!wechat_required) return;

    this.conf = default_conf;
    _.assign(this.conf, config);
    
    this.url = this._url();
    api = new API(this.url);

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
    // handlerXXX() functions need such self to point to WeChat instance itself
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
     *   3. Return detail information of the page queried if user's input get 
     *      a precise hit; Otherwise, list of search results will be returned.
     */
    handlerText: function(msg, req, res, next) {
      var text = msg.Content || '';
      console.log("Text message recv: %s", text);
      // 1. hack()
      text = self.hack(text);
      // 2. keyword()
      var handled = self.keyword(text);
      if (handled !== false) {
        res.reply(handled);
      } else {
        api.details({
          titles: [ text ],
          // A sole message-with-pic requires a 320px-wide picture
          size: 320
        }, function(err, data) {
          if (err) return self._err(err, res);
          if (data.length == 0) {
            // Message is not a precise title of any page. 
            // Try search.
            api.search({
              key: text,
              limit: 10,  //  TODO: could be configured
              target: 'default',  //  TODO: could be configured, or not...
            }, function(err, titles) {
              if (err) return self._err(err, res);
              if (titles.length == 0) return self._no_result(res);
              // Get details of these result pages
              api.details({
                titles: titles,
                // TODO: size == 320 or one more API call?
                size: 320
              }, function(err, data) {
                if (err) return self._err(err, res);
                // Preserve order of the searching results strictly according 
                // to the order in titles
                var results = [];
                _.forEach(data, function(detail) {
                  var index = titles.indexOf(detail.title);
                  results[index] = self._single(detail);
                });
                res.reply(_.filter(results));
              });
            });
          } else {
            res.reply([ self._single(data[0]) ]);
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
     * Return response if handled; false otherwise.
     */
    keyword: function(msg) {
      if (!msg && msg != 0) return false;
      var handled = false;
      var res = undefined;

      function hit(func) {
        res = func(msg);
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
     * output and responds to client directly.
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
     * Called when an error occurs. Respond plain text conf.CONST.ERR to 
     * client by default. 
     *
     * *err*, message of the error, will be logged.
     * *res*, will call res.reply() to respond to client.
     */
    _err: function(err, res) {
      console.log(err);
      res.reply(this.conf.CONST.ERR);
      return;
    },
    /*
     * Called when no results to respond. Respond plain text 
     * conf.CONST.NO_RESULT to client by default.
     *
     * *res*, will call res.reply() to respond to client.
     */
    _no_result: function(res) {
      console.log('NO RESULTS');
      res.reply(this.conf.CONST.NO_RESULT);
      return;
    },
    /*
     * Form wechat single message according to the result returned by API
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
      return {
        title: res.title,
        description: res.extract,
        url: this._page_url(res.title),
        picurl: picurl
      };
    }
  };
  
  return WeChat;
}());
