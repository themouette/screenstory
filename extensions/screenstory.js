var fse             = require('fs-extra');
var debug           = require('debug')('screenstory:screenstory');
var VError          = require('verror');
var Promise         = require('es6-promise').Promise;
var webdrivercss    = require('webdrivercss');
var path            = require('path');

var DEFAULT_PROJECT_NAME = 'No Project';

module.exports = function (runner, options) {
    'use strict';

    var screenshotRoot = options.screenshotRoot;
    var screenshotWidth = options.screenshotWidth || null;
    var screenshotOrientations = options.screenshotOrientation || null;
    var projectName = options.projectName || DEFAULT_PROJECT_NAME;
    var adminPanel = options.adminPanel ? options.adminPanel + '/api/repositories/' : null;

    var screenstory = require('../lib/screenstory')(screenshotRoot);
    debug('Create screenstory object...');

    runner.on('report', function (failures, next) {
        debug('+  generate report');
        screenstory.generateReport(function (err, reports) {
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
        webdrivercss.init(client, {
            screenshotRoot: storyRoot,
            api: adminPanel
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

        fse.mkdirs(path.join(storyRoot, 'diff'), function create(err) {
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
                        screenshotConfig.screenWidth = screenshotWidth;
                    }
                }

                // prepare for webdrivercss image
                var image = screenstory.loadWebdrivercss({
                        capabilities: this.desiredCapabilities,
                        title: title,
                        story: this._currentStory
                    });

                // FIXME
                // For now there is no way to ask for diff computation
                // only screenshot is available.
                if (!this.computeDiff) {
                    switch (this.desiredCapabilities.browserName) {
                        case 'phantomjs':
                            this
                                .saveScreenshot(image.fileDocument, function (err) {
                                    if (err) { return done(err); }
                                    screenstory.saveWebdrivercssResponse(image, null, done);
                                });
                            break;
                        default:
                            this
                                .saveDocumentScreenshot(image.fileDocument, function (err) {
                                    if (err) { return done(err); }
                                    screenstory.saveWebdrivercssResponse(image, null, done);
                                });
                    }
                } else {
                    this
                        .webdrivercss(image.id, screenshotConfig, function addToScreenstory(err, response) {
                            if (err) { return done(err); }
                            screenstory.saveWebdrivercssResponse(image, response, done);
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
