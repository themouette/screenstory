/* global
    describe: true,
    it: true,
    beforeEach: true */
describe('#findTestFiles()', function() {
    var assert = require('chai').assert;
    var path = require('path');

    var findTestFiles = require('../../../lib/runner/findTestFiles');

    function fixtures(directory) {
        return path.join(__dirname, '..','..','fixtures', 'findTestFiles', directory || '');
    }

    var FILES = {
        'index.js': fixtures('index.js'),
        'lib/index.js': fixtures('lib/index.js'),
        'lib/foo.js': fixtures('lib/foo.js')
    };

    describe('given a directory', function() {
        it('should return all js files in it', function(done) {
            findTestFiles(fixtures('lib'), function (err, files) {
                try {
                    assert.notOk(err);
                    assert.sameMembers(files, [FILES['lib/index.js'], FILES['lib/foo.js']]);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
        it('should search recursivley', function(done) {
            findTestFiles(fixtures(''), function (err, files) {
                try {
                    assert.notOk(err);
                    assert.sameMembers(files, [FILES['index.js'], FILES['lib/index.js'], FILES['lib/foo.js']]);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });


    describe('given a pattern', function() {
        it('should return all matching files', function(done) {
            findTestFiles(fixtures('*.js'), function (err, files) {
                try {
                    assert.notOk(err);
                    assert.sameMembers(files, [FILES['index.js']]);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('give multiplepatterns', function() {
        it('should return all matching files', function(done) {
            findTestFiles([fixtures('*.js'), fixtures('lib/*.js')], function (err, files) {
                try {
                    assert.notOk(err);
                    assert.sameMembers(files, [FILES['index.js'], FILES['lib/index.js'], FILES['lib/foo.js']]);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

});
