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
var clearTestTrace = function(wechat) {
  wechat._hack_key = [];
  wechat._hack_value = [];
  wechat._keywords_key = [];
  wechat._keywords_func = [];
};
describe('hack()', function() {
  it('when no hack', function() {
    wechat.hack().should.equal('');
    wechat.hack(1).should.equal('1');
    wechat.hack('2').should.equal('2');
  });
  it('addHack(string, string)', function() {
    wechat.addHack('囧', '琼恩');
    wechat.hack('囧').should.equal('琼恩');
    wechat.hack('囧恩').should.equal('囧恩');
  });
  it('addHack(RegExp, string)', function() {
    wechat.addHack(/雪诺$/, '琼恩·雪诺');
    wechat.hack('雪诺大人').should.equal('雪诺大人');
    wechat.hack('琼恩雪诺').should.equal('琼恩·雪诺');
  });
  it('addHack(array of string, string)', function() {
    wechat.addHack(['囧1', '囧2'], '囧');
    wechat.hack('囧1').should.equal('囧');
    wechat.hack('囧2').should.equal('囧');
  });
  it('addHack(dict, undefined)', function() {
    wechat.addHack({ 'key': 'value', 'key2': 'value2' });
    wechat.hack('key').should.equal('value');
    wechat.hack('key2').should.equal('value2');
    wechat.addHack({ 'xxx': '1' }, '333');
    wechat.hack('xxx').should.equal('1');
  });
  it('addHack(function, string)', function() {
    wechat.addHack(function(msg) {
      return (msg.length == 3) ? true : false;
    }, 'len==3');
    wechat.hack('123').should.equal('len==3');
    wechat.hack('1234').should.equal('1234');
    clearTestTrace(wechat);
    wechat.addHack(function(msg) {
      return (msg.length == 3) ? 'len==3' : ('' + msg.length);
    });
    wechat.hack('123').should.equal('len==3');
    wechat.hack('1234').should.equal('4');
    clearTestTrace(wechat);
  });
  it('addHack(array, undefined)', function() {
    wechat.addHack([
      {
        key: '1',
        value: '2'
      },
      {
        key: ['2', '3'],
        value: 'xx'
      }
    ]);
    wechat.hack('1').should.equal('2');
    wechat.hack('2').should.equal('xx');
    wechat.hack('3').should.equal('xx');
  });
});

var func = function(x) { return x; };
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
      clearTestTrace(wechat);
    });
    it('string passed in', function() {
      wechat.addKeyword('lotr', func);
      wechat._keywords_key.should.have.length(1);
      wechat._keywords_func[0]('echo').should.equal('echo');
      wechat.addKeyword(777, func);
      wechat._keywords_key.should.have.length(2);
      wechat._keywords_func[1]('echo').should.equal('echo');
      clearTestTrace(wechat);
    });
    it('Array passed in', function() {
      var arr = [ 1453, func, undefined, NaN, 'huiji', /^地图/ ];
      wechat.addKeyword(arr, func);
      wechat._keywords_key.should.have.length(4);
      wechat._keywords_func[1]('echo').should.equal('echo');
      clearTestTrace(wechat);      
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

