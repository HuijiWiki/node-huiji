var API = require('../api.js');
var api = new API('http://lotr.huiji.wiki');

describe('details()', function() {
  it('no callback', function() {
    api.details({
      titles: ['芬威', '芬罗德', '费艾诺'],
      abstracts: 500,
      size: 320
    }).should.equal('&titles=芬威|芬罗德|费艾诺&prop=extracts|pageimages&exlimit=3&exintro=&explaintext=&exsectionformat=plain&pilimit=3&pithumbsize=320');
  });
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

api = new API('http://asoiaf.huiji.wiki');
describe('search()', function() {
  describe('without sort', function() {
    it('no callback', function() {
      api.search({
        key: '乔拉',
        limit: 10
      }).should.equal('&list=search&srsearch=乔拉&srwhat=text&srnamespace=0&srlimit=10');
      api.search({
        key: '乔拉',
        limit: 20
      }).should.equal('&list=search&srsearch=乔拉&srwhat=text&srnamespace=0&srlimit=20');
      api.search({
        key: '乔拉',
        limit: 10,
        namespace: [0, 220]
      }).should.equal('&list=search&srsearch=乔拉&srwhat=text&srnamespace=0|220&srlimit=10');
    });
    it('search text', function(done) {
      api.search({
        key: '乔拉',
        limit: 50
      }, function(err, data) {
        data.length.should.equal(50);
        done();
      });
    });
    it('search multiple namespace', function(done) {
      api.search({
        key: '梅葛亚',
        limit: 10,
        namespace: [220]
      }, function(err, data) {
        data.length.should.equal(7);
        done();
      });
    });
    it('no reulsts', function(done) {
      api.search({
        key: 'DUMMY_TITLE',
        limit: 10
      }, function(err, data) {
        data.length.should.equal(0);
        done();
      });
    });
  });
});
