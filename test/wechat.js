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
var func = function(x) { return x; };
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
    before(function() {
      wechat.addKeyword(1, func);
      wechat.addKeyword('map', func);
      wechat.addKeyword(/^lotr/, func);
      wechat.addKeyword(/^abc$/, func);
      wechat.addKeyword(/777$/, func);
      wechat.addKeyword(function(msg) {
        var parsed = parseInt(msg);
        if (isNaN(parsed) || parsed == 0) return false;
        else return true;
      }, func);
    });
    it('empty keyword', function() {
      wechat.keyword().should.equal(false);
      wechat.keyword('').should.equal(false);
    });
    it('string matched keyword', function() {
      wechat.keyword(1).should.equal(1);
      wechat.keyword('1').should.equal('1');
      wechat.keyword('map').should.equal('map');
    });
    it('RegExp matched keyword', function() {
      wechat.keyword('lotr').should.equal('lotr');
      wechat.keyword('lotr11').should.equal('lotr11');
      wechat.keyword('abc').should.equal('abc');
      wechat.keyword('7777').should.equal('7777');
      wechat.keyword('777').should.equal('777');
    });
    it('function matched keyword', function() {
      wechat.keyword(123).should.equal(123);
      wechat.keyword('321').should.equal('321');
    });
    it('not matched keyword', function() {
      wechat.keyword(0).should.equal(false);
      wechat.keyword('abcd').should.equal(false);
      wechat.keyword('xyz').should.equal(false);
    });
  });
});

describe('handleText', function() {
  // TODO
});