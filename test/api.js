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
        limit: 10,
        target: 'title'
      }).should.equal('&list=search&srsearch=乔拉&srwhat=title&srlimit=10');
      api.search({
        key: '乔拉',
        limit: 20,
        target: 'text'
      }).should.equal('&list=search&srsearch=乔拉&srwhat=text&srlimit=20');
      api.search({
        key: '乔拉',
        limit: 10,
        target: 'default'
      }).should.equal('&list=search&srsearch=乔拉&srwhat=title&srlimit=10');
      api.search({
        key: '乔拉',
        limit: 10,
        target: 'ttttt'
      }).should.equal('&list=search&srsearch=乔拉&srwhat=title&srlimit=10');
      api.search({
        key: '乔拉',
        limit: 10
      }).should.equal('&list=search&srsearch=乔拉&srwhat=title&srlimit=10');
    });
    it('search title', function(done) {
      api.search({
        key: '乔拉',
        limit: 10,
        target: 'title'
      }, function(err, data) {
        data.length.should.equal(5);
        done();
      });
    });
    it('search text', function(done) {
      api.search({
        key: '乔拉',
        limit: 50,
        target: 'text'
      }, function(err, data) {
        data.length.should.equal(50);
        done();
      });
    });
    it('search default', function(done) {
      api.search({
        key: '乔拉',
        limit: 10,
        target: 'default'
      }, function(err, data) {
        data.length.should.equal(10);
        done();
      });
    });
    it('no reulsts', function(done) {
      api.search({
        key: 'DUMMY_TITLE',
        limit: 10,
        target: 'title'
      }, function(err, data) {
        data.length.should.equal(0);
        done();
      });
    });
  });
});
