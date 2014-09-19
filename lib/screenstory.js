// this is the screenstory object
'use strict';

var fs = require('fs');
var fse = require('fs-extra');
var _ = require('lodash');
var VError = require('verror');
var path = require('path');
var morph = require('morph');



function Screenstory(screenshotsDir) {
    this.data = [];
    this.screenshotsDir = screenshotsDir;
}

Screenstory.prototype.browserId = function (options) {
    var id = [];
    ['browserName', 'version', 'device', 'deviceName'].forEach(function (prop) {
        if (options[prop]) {
            id.push(dasherize(options[prop]));
        }
    });

    return id.join('_');
};

Screenstory.prototype.save = function add(image, options, cb) {
    var self = this;

    // extract browser id from capabilities
    var browserId = this.browserId(options.capabilities);
    var id = options.id || this.data.length;

    var dest = this.generatePath(browserId, id);
    // we are about to create parent directory
    var screenshotsDir = path.dirname(dest);
    // Add browserId
    options.browserId = browserId;
    options.storyId = options.storyId || dasherize(options.story);
    options.title = options.title || id;

    fse.mkdirs(screenshotsDir, function writeScreenshotFile(err) {
        if (err) { return cb(err); }

        fs.writeFile(dest, image.value, 'base64', function pushDataToScreenstory(err) {
            if (err) { return cb(err); }

            options.fullpath = dest;
            self.data.push(options);

            cb();
        });
    });

    return dest;
};

Screenstory.prototype.generatePath = function generatePath(browserName, id) {
    var dest = path.join(this.browserPath(browserName), id + '.png');
    return dest;
};

Screenstory.prototype.browserPath = function browserPath(browserName) {
    var dest = path.join(this.screenshotsDir, browserName);
    return dest;
};


Screenstory.prototype.generateReport = function (cb) {
    var data = groupByBrowser(this.data);
    var browserId;
    var reports = [];

    try {
        for (browserId in data) {
            if (data.hasOwnProperty(browserId)) {
                var reportPath = this.browserPath(browserId) + '.html';
                if (data.hasOwnProperty(browserId)) {
                    generateBrowserReport(reportPath, browserId, data[browserId]);
                    reports.push(reportPath);
                }
            }
        }
        cb(null, reports);
    } catch(e) {
        cb(new VError(e, 'Unable to generate report'));
    }
};

module.exports = function (screenshotsDir) {
    return new Screenstory(screenshotsDir);
};

function dasherize(str){
    if (!str) { return str; }
    return morph.toDashed(str.trim());
}

function groupByBrowser(data) {
    return _.groupBy(data, 'browserId');
}

function groupByStory(data) {
    var stories = {};
    _.each(data, function (screenshot) {
        stories[screenshot.storyId] = stories[screenshot.storyId] || {
            title: screenshot.story || screenshot.storyId,
            screenshots: []
        };
        stories[screenshot.storyId].screenshots.push(screenshot);
    });

    return stories;
}

function prepareData(destFile, data) {
    var destPath = path.dirname(destFile);

    data = _.map(data, function prepareDataItem(story) {
        story.url = path.relative(destPath, story.fullpath);
        return story;
    });

    data = groupByStory(data);

    // transform to array
    var ret = [];
    _.each(data, function (story) {
        ret.push(story);
    });

    return ret;
}

function generateBrowserReport(destFile, browserName, data) {
    var reportFile = path.join(__dirname, '..', 'reportTpl.html');

    if (!fs.existsSync(reportFile)) {
        throw new VError('Unable to load report template %s', reportFile);
    }

    var tpl = fs.readFileSync(reportFile);

    tpl = _.template(tpl);

    var html = tpl({
        browserName: browserName,
        data: prepareData(destFile, data)
    });

    fs.writeFileSync(destFile, html);
}

