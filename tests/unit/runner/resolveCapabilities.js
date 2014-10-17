/* global
    describe: true,
    it: true,
    before: true */
describe('resolveCapabilities()', function() {
    var assert = require('chai').assert;

    var resolveCapabilities = require('../../../lib/runner/resolveCapabilities');

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

        describe('when requested capability is unknown', function() {
            it('should use it as browsername', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'unknown'});
                assert.deepPropertyVal(result, 'wdCapabilities.browserName', 'unknown');
            });
        });

        describe('without flags', function() {
            it('should not use specifics capabilities', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'saucelabs-only'});
                assert.deepPropertyVal(result, 'wdCapabilities.browserName', 'saucelabs-only');

                result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'browserstack-only'});
                assert.deepPropertyVal(result, 'wdCapabilities.browserName', 'browserstack-only');
            });
            it('should use "all" specifics capabilities', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'simple'});
                assert.propertyVal(result, 'wdCapabilities', 'all');
            });
            it('should use "all-only" specifics capabilities', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'all-only'});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
        });

        describe('with saucelabs flag', function() {
            it('should use saucelabs configuration', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'simple', saucelabs: true});
                assert.propertyVal(result, 'wdCapabilities', 'saucelabs');
            });
            it('should return saucelab only wdCapabilities', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'saucelabs-only', saucelabs: true});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
            it('should return non overriden wdCapabilities', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'all-only', saucelabs: true});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
        });

        describe('with browserstack flag', function() {
            it('should override wdCapabilities with browserstack if defined', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'simple', browserstack: true});
                assert.propertyVal(result, 'wdCapabilities', 'browserstack');
            });
            it('should return browserstack only wdCapabilities', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'browserstack-only', browserstack: true});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
            it('should return non overriden wdCapabilities', function() {
                var result = resolveCapabilities(screenstoryOptions, {wdCapabilities: 'all-only', browserstack: true});
                assert.propertyVal(result, 'wdCapabilities', true);
            });
        });
    });
});
