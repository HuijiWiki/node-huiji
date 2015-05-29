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
   *   lotr.huiji.wiki
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
    if (!config) return;
    if (!config.name || !config.wechat) return;
    var wechat_required = _.every(['token', 'appid', 'encodingAESKey'], function(n) {
      return _.has(config.wechat, n);
    });
    if (!wechat_required) return;

    this.conf = config;
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
    /*
     * Handle different type of requests and give response
     */
    handlerText: function(msg, req, res, next) {
     // do hack
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
    }
  };
  
  return WeChat;
}());