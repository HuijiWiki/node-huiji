var util = require('../util.js');

describe('defaults()', function() {
  it('no cover', function() {
    var dst = { 'foo': 1 };
    var src = { 'bar': 2 };
    util.defaults(dst, src).should.have.property('bar', 2);
    dst.should.have.property('bar', 2);
  });
  it('cover', function() {
    var dst = { 'foo': 1 };
    var src = { 'foo': 2, 'bar': 3 };
    util.defaults(dst, src).should.have.property('foo', 1);
    dst.should.have.property('bar', 3);
    dst = { 'foo': 1, 'o': { 'foo': 1 } };
    src = { 'o': { 'foo': 3 } };
    util.defaults(dst, src).o.should.have.property('foo', 1);
  });
  it('deep defaults', function() {
    var dst = { 'o': { 'foo': 1 } };
    var src = { 'bar': 2, 'o': { 'foo': 3, 'bar': 1 } };
    util.defaults(dst, src).o.should.have.property('bar', 1);
    dst.o.should.have.property('foo', 1);
  });
});
