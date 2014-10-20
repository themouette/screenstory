// Find All Test Files To Execute
//
// Under the hood [glob](https://www.npmjs.org/package/glob) is used.
//
// > Note: When given pattern matches a directory, all js files are loaded
// > recursively.
var path            = require('path');
var async           = require('async');
var fs              = require('fs');
var glob            = require('glob');

module.exports = function findTestFiles(patterns, next) {
    patterns = patterns || [];
    if (!Array.isArray(patterns)) {
        patterns = [patterns];
    }
    // default value
    if (!patterns.length) {
        patterns.push(path.join('tests', 'wd', 'specs', '**', '*.js'));
    }

    async.reduce(patterns, [], function (files, pattern, callback) {
            filesForPattern(pattern, function (err, matches) {
                callback(err, files.concat(matches));
            });
        },
        function (err, files) {
            next(err, files);
        });
};

function filesForPattern(pattern, next) {
    async.waterfall([
        function seedWithPattern(cb) {cb(null, pattern);},
        setPatternForDirectory,
        globPattern
    ],
    function (err, files) {
        next(err, files);
    });
}

function setPatternForDirectory(pattern, next) {
    fs.stat(pattern, function (err, stats) {
        if (err) {
            // error is most likely "file does not exist"
            return next(null, pattern);
        }

        if (stats.isDirectory()) {
            pattern = path.join(pattern, '**', '*.js');
        }
        return next(null, pattern);
    });
}

function globPattern(pattern, next) {
    glob(pattern, null, function (err, files) {
        next(err, files);
    });
}
