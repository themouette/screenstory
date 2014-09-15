var debug           = require('debug')('screenstory:screenstory');
var Promise         = require('es6-promise').Promise;

module.exports = function (runner, options) {
    'use strict';
    var screenstory = require('../lib/screenstory')(options.screenshotRoot);
    debug('Create screenstory object...');

    runner.on('done',function (failures, next) {
        debug('+  generate report');
        screenstory.generateReport(function (err, reports) {
            debug('+  generated reports', reports);
            next(err, reports);
        });
    });

    return {
        'screenstory': function (id, cb) {
            this.screenshot(function addToScreenstory(err, image) {
                if (err) return cb(err);
                var options = {
                    id: id,
                    capabilities: this.desiredCapabilities,
                    storyId: this.screenstoryId
                };
                screenstory.save(image, options, cb);
            });
        },

        'setStory': function (title, cb) {
            this.screenstoryId = title;
            cb();
        }
    };
};
