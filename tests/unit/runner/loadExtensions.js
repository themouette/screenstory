/* global
    describe: true,
    it: true,
    beforeEach: true */
describe('#loadExtensions()', function() {

    var assert = require('chai').assert;
    var path = require('path');

    var loadExtensions = require('../../../lib/runner/loadExtensions');

    var runner;
    var options;

    function fixtureExtension(extension) {
        return path.join(__dirname, '..','..','fixtures', 'loadExtensions', extension || '');
    }

    beforeEach(function () {
        runner = {};
        options = {};
    });
    describe('extension argument', function () {
        it('should accept empty extensions', function (done) {
            loadExtensions(null, runner, options, function (err, extensions) {
                try {
                    assert.notOk(err, 'There should be no error');
                    assert.equal(extensions.length, 0, 'should return no extensions');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
        it('should accept string extensions', function (done) {
            loadExtensions(fixtureExtension('json'), runner, options, function (err, extensions) {
                try {
                    assert.notOk(err, 'There should be no error');
                    assert.ok(extensions.length, 'should return loaded extensions');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
        it('should accept array of extensions', function (done) {
            loadExtensions([fixtureExtension('json')], runner, options, function (err, extensions) {
                try {
                    assert.notOk(err, 'There should be no error');
                    assert.ok(extensions.length, 'should return loaded extensions');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
        it('should break if unable to load extension', function (done) {
            loadExtensions([fixtureExtension('unknown')], runner, options, function (err, extensions) {
                try {
                    assert.ok(err, 'There should be an error');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
    describe('exstension as a JSON object', function () {
        it('should return all methods in object', function (done) {
            loadExtensions(fixtureExtension('json'), runner, options, function (err, extensions) {
                try {
                    assert.notOk(err, 'There should be no error');
                    // let's test the returned extension
                    var ext = extensions.pop();
                    assert.property(ext, 'foo');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('extension as a function', function() {
        it('should return all methods in object', function (done) {
            loadExtensions(fixtureExtension('function'), runner, options, function (err, extensions) {
                try {
                    assert.notOk(err, 'There should be no error');
                    // let's test the returned extension
                    var ext = extensions.pop();
                    assert.property(ext, 'bar');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

    });
});
