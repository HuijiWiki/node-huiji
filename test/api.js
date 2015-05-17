var API = require('../api.js');
var api = new API();

describe('details()', function() {
  it('ok', function(done) {
    api.details({
      titles: ['芬威', '芬罗德', '费艾诺'],
      abstracts: 500,
      size: 320
    }, 'http://lotr.huiji.wiki', function(err, data) {
      data.length.should.equal(3);
      done();
    });
  });
});