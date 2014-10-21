/* global
    describe: true,
    it: true,
    beforeEach: true */
describe('resolveScreenshotOptions()', function() {
    var assert = require('chai').assert;

    var resolveScreenshotOptions = require('../../../lib/runner/resolveScreenshotOptions');

    var screenstoryOptions;
    beforeEach(function() {
        // define some fixtures
        screenstoryOptions  = {
            env: {
                screenshot: {
                    root: 'file-root',
                    width: 'file-width',
                    orientation: 'file-orientation'
                }
            }
        };

    });

    it('should accept direct options', function () {
        var result = resolveScreenshotOptions(screenstoryOptions, {
            screenshotRoot: 'root',
            screenshotWidth: 'width',
            screenshotOrientation: 'orientation'
        });

        assert.deepPropertyVal(result, 'screenshotRoot', 'root');
        assert.deepPropertyVal(result, 'screenshotWidth', 'width');
        assert.deepPropertyVal(result, 'screenshotOrientation', 'orientation');
    });

    it('should use screenstory.yml as default', function () {
        var result = resolveScreenshotOptions(screenstoryOptions, {});

        assert.deepPropertyVal(result, 'screenshotRoot', 'file-root');
        assert.deepPropertyVal(result, 'screenshotWidth', 'file-width');
        assert.deepPropertyVal(result, 'screenshotOrientation', 'file-orientation');
    });
});
