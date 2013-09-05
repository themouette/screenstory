/* global require: true, __dirname: true, process: true, console: true */
"use strict";
process.on('error', function (err) {console.log(err);});

var directory = [__dirname, 'screenshots'].join('/');
var resizedDirectory = [__dirname, 'resized'].join('/');

var q = require('q');
var fs = require('fs');
var _ = require('lodash');
var gm = require('gm');
var ScreenshotFinder = require('./src/model.screenshot').finder;
var ScreenshotRepository = require('./src/model.screenshot').repository;
var Resizer = require('./src/image.manipulate').resizer;
var Uniformizer = require('./src/image.manipulate').uniformizer;

q.longStackSupport = true;

go(directory, resizedDirectory);

function go(directory, resizedDirectory) {
    var start = process.hrtime();
    var elapsed_time = function(note){
        var precision = 3; // 3 decimal places
        var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
        console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " + note); // print message + time
    };
    var files = (new ScreenshotFinder({
            directory: directory
        })).findAll();
    var latest = (new ScreenshotFinder({
            directory: directory
        })).findAll();

    var repository = new ScreenshotRepository({ directory: resizedDirectory });
    var resizer = new Resizer({ repository: repository });
    var uniformized = (new Uniformizer({
            resizer: resizer
        })).uniformize(files);

    var median = createAverageImage(uniformized, repository, "median");
    var mean = createAverageImage(uniformized, repository, "mean");

    q.all([median, mean])
    .then(function () {console.log('average done');});

    q.all([
        generateDiff(uniformized, median, "median_"),
        generateDiff(uniformized, mean, "mean_"),
        generateDiff(files, latest, "history_"),
        generateDiff(median, mean, "avg_")
    ])
    .then(function (diffs) {
        q.all([uniformized, median, mean]).then(function (results) {
            var uniformized = results[0];
            var median = results[1];
            var mean = results[2];
            generateReport({
                uniformized: uniformized,
                median: median,
                mean: mean,
                diffs: {
                    median: diffs[0],
                    mean: diffs[1],
                    history: diffs[2],
                    average: diffs[3],
                }
            }, resizedDirectory);
            elapsed_time('diffs OK');
        });
    }, function (err) {
        console.log(err);
    });
    serve(resizedDirectory);

}

function createAverageImage(resizedFilenames, resizedRepository, type) {
    var exec = require('child_process').exec;
    var image = q.defer();
    var resizedDirectory = resizedRepository.getPath();
    q.when(resizedFilenames, function (files) {
        var key = 'homepage_avg-'+type+'.png';
        var filename = [resizedRepository.getPath(), key].join('/');
        var origin = _.pluck(files, 'path');
        var command = [
            'convert'].concat(origin).concat([
                '-evaluate-sequence', type, filename
        ]).join(' ');

        exec(command, function (err, stdout, stderr) {
                if (err) {
                    console.error("unable to create average image\n"+stderr);
                    image.reject(err);
                    return ;
                }
                image.resolve(resizedRepository.screenshotFactory(key));
            });
    });
    return image.promise;
}

function generateDiff(files, average, prefix) {
    var difs = q.defer();
    q.all([files, average])
    .then(function (results) {
        var files = results[0];
        var average = results[1];
        var difPromises = [];
        if (!files.forEach) {
            files = [files];
        }
        files.forEach(function (file, index) {
            var origin;
            if (typeof average === "object" && average[index]) {
                origin = average[index];
            } else {
                origin = average;
            }
            difPromises.push(diff(file, origin, prefix));
        });

        q.all(difPromises).then(function (compares) {
            difs.resolve(compares);
        }, function (err) {
            difs.reject(err);
        });
    }, function (err) {
        difs.reject(err);
    });
    return difs.promise;
}

function diff(file, average, prefix) {
    var resemble = require('resemble').resemble;
    var fullname = file.path || file;
    var dest = prefixFile(fullname, prefix);
    var compare = q.defer();
    average = average.path || average;
    try {
        resemble(fullname).compareTo(average).ignoreAntialiasing().onComplete(function (data) {
            var base64 = data.getImageDataUrl().replace('data:image/png;base64,', '');
            base64 = new Buffer(base64, 'base64');
            fs.writeFile(dest, base64, function (err) {
                if (err) {
                    compare.reject(err);
                    return;
                }
                compare.resolve(data);
            });
        });
    }catch(e) {
        console.log('diff generation error', e);
    }
    return compare.promise;
}

function ensureResizeDir(dest) {
    // do nothing for now
    return dest;
}

function prefixFile(file, prefix) {
    var last = file.lastIndexOf('/')+1;
    file = file.slice(0, last)+prefix+file.slice(last);
    return file.replace(directory, resizedDirectory);
}

function serve(directory) {
    console.log('start server.');
    var express = require('express');

    var app = express()
        .use(express.static(directory))
        .use(express.directory(directory))
        .listen(8080);
}

var Handlebars = require('handlebars');
var template = fs.readFileSync([__dirname, 'report'].join('/'), {
    encoding: 'utf8',
    flag: 'r'
});
var compiled = Handlebars.compile(template);

function generateReport (data, destinationDir) {
    try {
        fs.writeFileSync([destinationDir, 'report.html'].join('/'), compiled(data));
    } catch (e) {
        console.dir(e);
    }
}
