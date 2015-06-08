var API = require('../api.js');
var api = new API('http://lotr.huiji.wiki');

describe('details()', function() {
  it('ok', function(done) {
    api.details({
      titles: ['芬威', '芬罗德', '费艾诺'],
      abstracts: 500,
      size: 320
    }, function(err, data) {
      data.length.should.equal(3);
      done();
    });
  });
  it('no results', function(done) {
    api.details({
      titles: ['dummy']
    }, function(err, data) {
      data.length.should.equal(0);
      done();
    });
  });
});