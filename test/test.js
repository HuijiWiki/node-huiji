var Huiji = require('../index.js');
var huiji = new Huiji();

describe('extracts()', function() {
  it('when o is empty', function() {
    huiji.extracts(undefined).should.equal('');
    huiji.extracts({}).should.equal('');
  });
  it('only exlimit', function() {
    var o = {};
    o.exlimit = 10;
    huiji.extracts(o).should.equal(
      '&exlimit=10&exintro=&explaintext=&exsectionformat=plain');
    o.exlimit = 30;
    huiji.extracts(o).should.equal(
      '&exlimit=20&exintro=&explaintext=&exsectionformat=plain');
    o.exlimit = -1;
    huiji.extracts(o).should.equal(
      '&exlimit=1&exintro=&explaintext=&exsectionformat=plain');
  });
  it('more params', function() {
    var o = {};
    o.exlimit = 10;
    o.exintro = false;
    o.exsentences = 5;
    o.chars = 500;
    o.explaintext = false;
    o.exsectionformat = 'wiki';
    o.exvariant = 'en';
    huiji.extracts(o).should.equal(
      '&exlimit=10&exsentences=5&exsectionformat=wiki&exvariant=en');
  });
});

describe('pageimages()', function() {
  it('when o is empty', function() {
    huiji.pageimages(undefined).should.equal('');
    huiji.pageimages({}).should.equal('');
  });
  it('with params', function() {
    var o = {};
    o.pilimit = 10;
    huiji.pageimages(o).should.equal('&pilimit=10&pithumbsize=50');
    o.pilimit = 100;
    o.pithumbsize = 200;
    huiji.pageimages(o).should.equal('&pilimit=50&pithumbsize=200');
    o.pilimit = -1;
    o.pithumbsize = 20;
    huiji.pageimages(o).should.equal('&pilimit=1&pithumbsize=20');
    delete o.pilimit;
    huiji.pageimages(o).should.equal('&pilimit=1&pithumbsize=20');
  });
});

describe('prop()', function() {
  it('when o is empty', function() {
    huiji.prop(undefined).should.equal('');
    huiji.prop({}).should.equal('');
  });
  it('extract(), pageimages() provided', function() {
    var o = {};
    o.extracts = {
      exlimit: 2
    };
    o.pageimages = {
      pilimit: 2,
      pithumbsize: 320
    };
    huiji.prop(o).should.equal('&prop=extracts|pageimages&exlimit=2&exintro=&explaintext=&exsectionformat=plain&pilimit=2&pithumbsize=320');
  });
});

describe('query()', function() {
  it('when o is empty', function() {
    huiji.query(undefined).should.equal('');
    huiji.query({}).should.equal('');
  });
  it('when only titles or pageids is provided, without callback', function() {
    var o = {};
    o.titles = ['芬罗德', '芬巩'];
    huiji.query(o).should.equal('&titles=芬罗德|芬巩');
    o.pageids = [10, 20, 30];
    huiji.query(o).should.equal('&titles=芬罗德|芬巩');
    delete o.titles;
    huiji.query(o).should.equal('&pageids=10|20|30');
  });
  it('when prop, without callback', function() {
    var o = {};
    o.titles = ['芬罗德', '芬巩'];
    o.prop = {
      extracts: {
        exlimit: 2
      },
      pageimages: {
        pilimit: 2,
        pithumbsize: 320
      }
    };
    huiji.query(o).should.equal('&titles=芬罗德|芬巩&prop=extracts|pageimages&exlimit=2&exintro=&explaintext=&exsectionformat=plain&pilimit=2&pithumbsize=320');
  });
  it('with callback', function(done) {
    var url = 'http://lotr.huiji.wiki';
    var o = {};
    o.titles = ['芬罗德', '芬巩'];
    o.prop = {
      extracts: {
        exlimit: 2
      },
      pageimages: {
        pilimit: 2,
        pithumbsize: 320
      }
    };
    huiji.query(o, url, function(err, data) {
      done();
    });
  });
});
