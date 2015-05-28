var WeChat = require('../wechat.js');

describe('new WeChat()', function() {
  it('when invalid config passed', function() {
    new WeChat().should.be.empty;
    new WeChat({}).should.be.empty;
    new WeChat({ name: 'lotr' }).should.be.empty;
    new WeChat({ wechat: {} }).should.be.empty; // TODO: detail cases
    // TODO: more cases
  });
});