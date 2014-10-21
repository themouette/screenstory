/* global
    describe: true,
    it: true,
    before: true */
describe('#resolveOptions()', function() {
    var assert = require('chai').assert;
    var resolveOptions = require('../../../lib/runner/resolveOptions');

    var screenstoryOptions  = {
            capabilities: {
            },
            env: {
                url: 'foo',
                resolution: '1800x300',
                wd: {}
            }
        };

    describe('', function () {
        it('should add undefined option', function() {
            var res = resolveOptions(screenstoryOptions, {});
            assert.propertyVal(res, 'url', 'foo');
        });
        it('should not add defined options', function() {
            var res = resolveOptions(screenstoryOptions, {url: ''});
            assert.propertyVal(res, 'url', '');
        });
        it('should not add objects defined options', function() {
            var res = resolveOptions(screenstoryOptions, {url: ''});
            assert.notProperty(res, 'wd');

        });
    });
    describe('resolution option', function() {
        it('should parse provided resolution', function() {
            var res = resolveOptions(screenstoryOptions, {resolution: '1200x600'});
            assert.deepPropertyVal(res, 'resolution.width', 1200);
            assert.deepPropertyVal(res, 'resolution.height', 600);
        });
        it('should parse default options', function() {
            var res = resolveOptions(screenstoryOptions, {});
            assert.deepPropertyVal(res, 'resolution.width', 1800);
            assert.deepPropertyVal(res, 'resolution.height', 300);
        });
    });
});
