var MWAPI = require('../mwapi.js');
var mwapi = new MWAPI();

describe('extracts()', function() {
  it('when o is empty', function() {
    mwapi.extracts(undefined).should.equal('');
    mwapi.extracts({}).should.equal('');
  });
  it('only exlimit', function() {
    var o = {};
    o.exlimit = 10;
    mwapi.extracts(o).should.equal(
      '&exlimit=10&exintro=&explaintext=&exsectionformat=plain');
    o.exlimit = 30;
    mwapi.extracts(o).should.equal(
      '&exlimit=20&exintro=&explaintext=&exsectionformat=plain');
    o.exlimit = -1;
    mwapi.extracts(o).should.equal(
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
    mwapi.extracts(o).should.equal(
      '&exlimit=10&exsentences=5&exsectionformat=wiki&exvariant=en');
  });
});

describe('pageimages()', function() {
  it('when o is empty', function() {
    mwapi.pageimages(undefined).should.equal('');
    mwapi.pageimages({}).should.equal('');
  });
  it('with params', function() {
    var o = {};
    o.pilimit = 10;
    mwapi.pageimages(o).should.equal('&pilimit=10&pithumbsize=50');
    o.pilimit = 100;
    o.pithumbsize = 200;
    mwapi.pageimages(o).should.equal('&pilimit=50&pithumbsize=200');
    o.pilimit = -1;
    o.pithumbsize = 20;
    mwapi.pageimages(o).should.equal('&pilimit=1&pithumbsize=20');
    delete o.pilimit;
    mwapi.pageimages(o).should.equal('&pilimit=1&pithumbsize=20');
  });
});

describe('prop()', function() {
  it('when o is empty', function() {
    mwapi.prop(undefined).should.equal('');
    mwapi.prop({}).should.equal('');
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
    mwapi.prop(o).should.equal('&prop=extracts|pageimages&exlimit=2&exintro=&explaintext=&exsectionformat=plain&pilimit=2&pithumbsize=320');
  });
});

describe('query()', function() {
  it('when o is empty', function() {
    mwapi.query(undefined).should.equal('');
    mwapi.query({}).should.equal('');
  });
  it('when only titles or pageids is provided, without callback', function() {
    var o = {};
    o.titles = ['芬罗德', '芬巩'];
    mwapi.query(o).should.equal('&titles=芬罗德|芬巩');
    o.pageids = [10, 20, 30];
    mwapi.query(o).should.equal('&titles=芬罗德|芬巩');
    delete o.titles;
    mwapi.query(o).should.equal('&pageids=10|20|30');
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
    mwapi.query(o).should.equal('&titles=芬罗德|芬巩&prop=extracts|pageimages&exlimit=2&exintro=&explaintext=&exsectionformat=plain&pilimit=2&pithumbsize=320');
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
    mwapi.query(o, url, function(err, data) {
      done();
    });
  });
});
