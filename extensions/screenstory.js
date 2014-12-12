var fse             = require('fs-extra');
var debug           = require('debug')('screenstory:screenstory');
var VError          = require('verror');
var Promise         = require('es6-promise').Promise;
var webdrivercss    = require('webdrivercss');
var path            = require('path');
var async           = require('async');

var DEFAULT_PROJECT_NAME = 'No Project';

module.exports = function (runner, options) {
    'use strict';

    var screenshotRoot = options.screenshotRoot;
    var screenshotWidth = options.screenshotWidth || null;
    var screenshotOrientations = options.screenshotOrientation || null;
    var projectName = options.projectName || DEFAULT_PROJECT_NAME;
    var adminPanel = options.adminPanel ? options.adminPanel + '/api/repositories/' : null;

    if (screenshotWidth && !Array.isArray(screenshotWidth)) {
        screenshotWidth = [screenshotWidth];
    }

    var screenstory = require('../lib/screenstory')(screenshotRoot);
    debug('Create screenstory object...');

    runner.on('report', function (failures, next) {
        debug('+  generate report');
        screenstory.generateReport(options, function (err, reports) {
            debug('+  generated reports', reports);
            next(err, reports);
        });
    });

    runner.on('new client', function (client, next) {
        // noting to do, webdriver is autoloaded by screenstory
        next();
    });
    function initWebdrivercss(client, storyTitle, cb) {
        var storyRoot = screenstory.storyRoot(client.desiredCapabilities, storyTitle);
        fse.mkdirs(path.join(storyRoot, 'diff'), function create(err) {
            webdrivercss.init(client, {
                screenshotRoot: storyRoot,
                api: adminPanel,
                screenWidth: screenshotWidth.slice(0) // clone the array
            });
            debug('setup webdrivercss "%s"', storyTitle);
            if (adminPanel) {
                client.sync();
            }

            // register only once
            if (!client._currentStory) {
                client.eventHandler.on('end', function () {
                    tearDownWebdrivercss(client);
                });
            }

            cb(err);
        });
    }
    function tearDownWebdrivercss(client) {
        debug('teardow webdrivercss');
        if (adminPanel) {
            client.sync();
        }
    }

    return {
        'screenstory': function (title, screenshotConfig, done) {

            var currentScroll;
            var self = this;

            function restoreScroll(cb) {
                return function () {
                    self
                        .scroll(currentScroll.x, currentScroll.y)
                        .setViewportSize({ height: currentScroll.height, width: currentScroll.width })
                        .call(cb);
                    };
            }

            try {
                // config is optional
                if (!done) {
                    done = screenshotConfig;
                    screenshotConfig = {};
                }
                // initialize story if not initialized yet
                if (!this._currentStory) {
                    this.setStory('');
                }

                // prepare capabilities dependent options
                if (this.isMobile) {
                    if (screenshotOrientations.length) {
                        // Up to now, only apply first orientation
                        this.setOrientation(screenshotOrientations[0]);
                    }
                } else {
                    // On a desktop
                    if (!screenshotConfig.screenWidth && screenshotWidth) {
                        // clone the width array
                        screenshotConfig.screenWidth = screenshotWidth.slice(0);
                    }
                }
                // Ensure screenWidth is an array
                if (screenshotConfig.screenWidth && !Array.isArray(screenshotConfig.screenWidth)) {
                    screenshotConfig.screenWidth = [screenshotConfig.screenWidth];
                }

                // prepare for webdrivercss image
                var image = screenstory.loadWebdrivercss({
                        capabilities: this.desiredCapabilities,
                        title: title,
                        story: this._currentStory,
                        diff: options.screenshotDiff,
                        width: screenshotConfig.screenWidth
                    });

                // FIXME
                // For now there is no way to ask for diff computation
                // only screenshot is available.
                if (!options.screenshotDiff) {

                    this
                        .execute(function saveScroll() {
                            var body = document.body,
                                html = document.documentElement;

                            return {
                                x:  Math.max( body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth ),
                                y:  Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight ),
                                height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
                                width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
                            };
                        }, [], function(err,res) {
                            currentScroll = res.value;

                            if (!screenshotConfig.screenWidth || !screenshotConfig.screenWidth.length) {
                                screenshotConfig.screenWidth = [currentScroll.width];
                            }

                            async.eachSeries(
                                screenshotConfig.screenWidth,
                                function saveScreenshot(width, cb) {
                                    var suffix = width ? '.' + width + 'px' : '';
                                    var fileOriginal = screenstory.generatePath(image.capabilities, image.storyId, image.id + suffix + '.png');
                                    self
                                        .setViewportSize({ height: currentScroll.height, width: width })
                                        .saveDocumentScreenshot(fileOriginal, function (err) {
                                            if (err) { return cb(err); }
                                            var response = {
                                                baselinePath: fileOriginal,
                                                regressionPath: fileOriginal,
                                                width: width
                                            };
                                            screenstory.saveWebdrivercssResponse(image, response, cb);
                                        });
                                }, function (err) {
                                    if (err) { return done(err); }
                                    restoreScroll(done)();
                                });
                        });

                } else {
                    if (!screenshotConfig.name) {
                        screenshotConfig.name = image.id;
                    }
                    this
                        .webdrivercss(image.id, screenshotConfig, function addToScreenstory(err, response) {
                            if (err) { return done(err); }
                            screenstory.saveWebdrivercssResponse(image, response[image.id], done);
                        });
                }
            } catch (err) {
                debug(err);
                done(new VError(err, 'While executing screenstory command'));
            }
        },

        'setStory': function (title, cb) {
            var storyTitle;
            storyTitle = (projectName === DEFAULT_PROJECT_NAME ? title : projectName + ' - ' + title);
            storyTitle = storyTitle || projectName;
            storyTitle = storyTitle + ' - ' + this.desiredCapabilities.browserName;
            if (this._currentStory && title !== this._currentStory) {
                tearDownWebdrivercss(this);
            }
            initWebdrivercss(this, storyTitle, cb);
            this._currentStory = storyTitle;
        }
    };
};
