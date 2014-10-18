/* global
    describe: true,
    it: true,
    before: true */
describe('resolveWdOptions()', function() {
    var assert = require('chai').assert;

    var resolveWdOptions = require('../../../lib/runner/resolveWdOptions');

    describe('wdCapabilities dictionary', function () {

        var screenstoryOptions;
        before(function() {
            // define some fixtures
            screenstoryOptions  = {
                capabilities: {
                    'all':          {simple: 'all', 'all-only': true},
                    'saucelabs':    {simple: 'saucelabs', 'saucelabs-only': true},
                    'browserstack': {simple: 'browserstack', 'browserstack-only': true}
                }
            };

        });

        describe('A capability out of dictionary', function() {
            it('should be used as browsername', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'unknown'});
                assert.deepPropertyVal(result, 'wdCapabilities.browserName', 'unknown');
            });
        });

        describe('without flags', function() {
            it('should not use specifics capabilities', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'saucelabs-only'});
                assert.deepPropertyVal(result, 'wdCapabilities.browserName', 'saucelabs-only');

                result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'browserstack-only'});
                assert.deepPropertyVal(result, 'wdCapabilities.browserName', 'browserstack-only');
            });
            it('should use "all" specifics capabilities', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'simple'});
                assert.propertyVal(result, 'wdCapabilities', 'all');
            });
            it('should use "all-only" specifics capabilities', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'all-only'});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
        });

        describe('with saucelabs flag', function() {
            it('should use saucelabs configuration', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'simple', saucelabs: true});
                assert.propertyVal(result, 'wdCapabilities', 'saucelabs');
            });
            it('should return saucelab only wdCapabilities', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'saucelabs-only', saucelabs: true});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
            it('should return non overriden wdCapabilities', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'all-only', saucelabs: true});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
        });

        describe('with browserstack flag', function() {
            it('should override wdCapabilities with browserstack if defined', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'simple', browserstack: true});
                assert.propertyVal(result, 'wdCapabilities', 'browserstack');
            });
            it('should return browserstack only wdCapabilities', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'browserstack-only', browserstack: true});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
            it('should return non overriden wdCapabilities', function() {
                var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'all-only', browserstack: true});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
        });
    });

    describe('Wd host options', function() {
        var screenstoryOptions;
        before(function() {
            // define some fixtures
            screenstoryOptions  = {
                wd: {
                    host: 'foo',
                    port: 80,
                    username: 'john doe'
                }
            };

            process.env.SAUCE_USERNAME        = process.env.SAUCE_USERNAME || '';
            process.env.BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME || '';

        });
        it('should configure from screenstory.yml file', function() {
            var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'any'});
            assert.propertyVal(result, 'wdHost', 'foo');
            assert.propertyVal(result, 'wdUsername', 'john doe');
            assert.propertyVal(result, 'wdPort', 80);
        });
        it('should configure from options', function() {
            var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'any', wdHost: 'bar'});
            assert.propertyVal(result, 'wdHost', 'bar');
        });
        it('should configure saucelabs', function() {
            var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'any', saucelabs: true});
            assert.propertyVal(result, 'wdHost', 'ondemand.saucelabs.com');
            assert.propertyVal(result, 'wdUsername', process.env.SAUCE_USERNAME);
        });
        it('should configure browserstack', function() {
            var result = resolveWdOptions(screenstoryOptions, {wdCapabilities: 'any', browserstack: true});
            assert.propertyVal(result, 'wdHost', 'hub.browserstack.com');
            assert.propertyVal(result, 'wdUsername', process.env.BROWSERSTACK_USERNAME);
        });
    });
});
