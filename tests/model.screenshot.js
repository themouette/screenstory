describe('model.screenshot', function () {
    var Repository = require('../src/model.screenshot').repository;
    var assert = require('chai').assert;

    describe('Repository', function () {
        describe('.canonize', function() {
            it('should accept unprefixed filename', function() {
                var repository = new Repository({
                    directory: '/tmp/'
                });
                assert.equal(repository.canonize('foo'), 'foo');
            });
            it('should accept prefixed filename', function() {
                var repository = new Repository({
                    directory: '/tmp/'
                });
                assert.equal(repository.canonize('/tmp/foo'), 'foo');
            });
            it('should accept prefixed filename and remove leading "/"', function() {
                var repository = new Repository({
                    directory: '/tmp'
                });
                assert.equal(repository.canonize('/tmp/foo'), 'foo');
            });
        });
    });
});
