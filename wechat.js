module.exports = (function() {
  var conf = require('../config.js');
  var wechat = require('wechat');
  var express = require('express');

  var API = require('./api.js');
  var api = new Api();

  var WeChat = function() {
    this.app = express();
    this.app.use('', wechat(conf.wechat)
      .text(handlerText)
      .image(handlerImage)
      .voice(handlerVoice)
      .video(handlerVideo)
      .location(handlerLocation)
      .link(handlerLink)
      .event(handlerEvent)
      .middlewarify());
  };
  
  WeChat.prototype = {
    /*
     * Start wechat server
     *
     * *port*, which port to listen to, optinal. If not set, will look up 
     * conf.wechat.port and if still not set 80 by default.
     */
    start: function(port) {
      var port = port || conf.wechat.port || 80;
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
     * By default, will use conf.wechat.hack which is a dictionary to simply 
     * translate *msg* to hacked message. One can inherit WeChat and override 
     * this hack().
     * It will be called at the beginning of handlerText().
     */
    hack: function(msg) {
    }
  };
  
  return WeChat;
}());