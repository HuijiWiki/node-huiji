var _ = require('lodash');
var WeChat = require('../wechat.js');
var VALID_AESKEY = 'quJ0FSie0l6vp3L2otUMvuwdjLszefK6pm9b8XyBJkn';

describe('new WeChat()', function() {
  it('when invalid config passed', function() {
    new WeChat().should.be.empty;
    new WeChat({}).should.be.empty;
    new WeChat({ name: 'lotr' }).should.be.empty;
    var wechat = {
      'token': 1,
      'appid': 2,
      'encodingAESKey': 3
    };
    new WeChat({ wechat: wechat }).should.be.empty;
    delete wechat.token;
    new WeChat({ name: 1, wechat: wechat }).should.be.empty;
  });
});

describe('hack()', function() {
  it('when hack not provided', function() {
    var config = {
      name: 'lotr', 
      wechat: {
        'token': 1,
        'appid': 2,
        'encodingAESKey': VALID_AESKEY
      },
      port: 80
    };
    var wechat = new WeChat(config);
    wechat.hack().should.equal('');
    wechat.hack(1).should.equal('1');
    wechat.hack('2').should.equal('2');
  });
  it('when hack is a dict', function() {
    var config = {
      name: 'lotr', 
      wechat: {
        'token': 1,
        'appid': 2,
        'encodingAESKey': VALID_AESKEY
      },
      port: 80,
      hack: {
        '1': 333,
        'a': 'bbb'
      }
    };
    var wechat = new WeChat(config);
    wechat.hack('x').should.equal('x');
    wechat.hack(1).should.equal('333');
    wechat.hack('a').should.equal('bbb');
  });
  it('when hack is a function', function() {
    var config = {
      name: 'lotr', 
      wechat: {
        'token': 1,
        'appid': 2,
        'encodingAESKey': VALID_AESKEY
      },
      port: 80,
      hack: function(msg) {
        if (!msg) return '';
        if (msg == '1') return 'hacked 1';
        else return msg.toUpperCase();
      }
    };
    var wechat = new WeChat(config);
    wechat.hack().should.equal('');
    wechat.hack(1).should.equal('hacked 1');
    wechat.hack('2').should.equal('2');
    wechat.hack('lotr').should.equal('LOTR');
  });
});

var config = {
  name: 'lotr', 
  wechat: {
    'token': 1,
    'appid': 2,
    'encodingAESKey': VALID_AESKEY
  }
};
var wechat = new WeChat(config);
var clearKeywordTestTrace = function(wechat) {
  _.remove(wechat._keywords_key);
  _.remove(wechat._keywords_func);
};

describe('keyword', function() {
  describe('addKeyword', function() {
    it('invalid keyword passed in', function() {
      var func = function() { };
      wechat.addKeyword(undefined, func);
      wechat._keywords_key.should.have.length(0);
      wechat.addKeyword(null, func);
      wechat._keywords_key.should.have.length(0);
      wechat.addKeyword(NaN, func);
      wechat._keywords_key.should.have.length(0);
      wechat.addKeyword({}, func);
      wechat._keywords_key.should.have.length(0);
      wechat.addKeyword([], func);
      wechat._keywords_key.should.have.length(0);
      wechat.addKeyword('', func);
      wechat._keywords_key.should.have.length(0);
    });
    var func = function(x) { return x; };
    it('RegExp or function passed in', function() {
      var r = /^lotr$/;
      wechat.addKeyword(r, func);
      wechat._keywords_key.should.have.length(1);
      wechat._keywords_func[0]('echo').should.equal('echo');
      wechat.addKeyword(func, func);
      wechat._keywords_key.should.have.length(2);
      wechat._keywords_func[1]('echo').should.equal('echo');
      clearKeywordTestTrace(wechat);
    });
    it('string passed in', function() {
      wechat.addKeyword('lotr', func);
      wechat._keywords_key.should.have.length(1);
      wechat._keywords_func[0]('echo').should.equal('echo');
      wechat.addKeyword(777, func);
      wechat._keywords_key.should.have.length(2);
      wechat._keywords_func[1]('echo').should.equal('echo');
      clearKeywordTestTrace(wechat);
    });
    it('Array passed in', function() {
      var arr = [ 1453, func, undefined, NaN, 'huiji', /^地图/ ];
      wechat.addKeyword(arr, func);
      wechat._keywords_key.should.have.length(4);
      wechat._keywords_func[1]('echo').should.equal('echo');
      clearKeywordTestTrace(wechat);      
    });
  });

  describe('keyword()', function() {
  
  });
});