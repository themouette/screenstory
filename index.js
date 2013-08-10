"use strict";
process.on('error', function (err) {console.log(err)});

var size = {width: 1024,height:780};
var directory = [__dirname, 'screenshots'].join('/');
var resizedDirectory = [__dirname, 'resized'].join('/');

var q = require('q');
var fs = require('fs');
var _ = require('lodash');
var gm = require('gm');

go(directory, resizedDirectory);

function go(directory, resizedDirectory) {
    var files = getFiles(directory);
//    var latest = getFiles(directory);

    var size = getOptimalSize(files);
    size.then(function (size) {console.log('optimal size %sx%s', size.height, size.width);});
/*
    var resized = resize(files, size, directory, resizedDirectory);
    resized.then(function () {console.log('resize done')});

    var median = createAverageImage(resized, resizedDirectory, "median");
    var mean = createAverageImage(resized, resizedDirectory, "mean");
    q.all([median, mean])
    .then(function () {console.log('average done')});

    var diffMedian = generateDiff(resized, median, "median_");
    var diffMean = generateDiff(resized, mean, "mean_");
    var diffHistory = [];//generateDiff(files, latest, "history_");
    q.all([diffMean, diffMedian, diffHistory])
    .then(function (difs) {
        console.log('difs ok');
    }, function (err) {
        console.log(err);
    });*/
    serve(resizedDirectory);

}

function getFiles(directory) {
    var filenames = q.defer();
    fs.readdir(directory, function done(err, f) {
        if (err) {
            filenames.fail(err);
        }
        var files = [];
        // ensure fullpath is used
        f.forEach(function (file) {
            files.push([directory, file].join('/'));
        });
        // and resolve
        filenames.resolve(files);
    });
    return filenames.promise;
}

function getOptimalSize(files) {
    var size = q.defer();
    // when files are ready
    q.when(files, function (files) {
        var dimensions = [];
        files.forEach(function (file, index) {
            dimensions.push(q.ninvoke(gm(file), 'size'));
        });
        q.all(dimensions)
        .then(function (results) {
            var optimal = {
                width: 0,
                height: 0
            };
            results.forEach(function (tmp) {
                optimal.width = Math.max(optimal.width, tmp.width);
                optimal.height = Math.max(optimal.height, tmp.height);
            });
            size.resolve(optimal);
        }, function (err) {
            size.reject(err);
        });
    });
    return size.promise;
}

function resize(files, size, directory, resizedDirectory) {
    var resized = q.defer();
    q.all([files, size])
    .then(function (results) {
        var files = results[0];
        var size = results[1];
        var resizedFilenames = [];
        var resizedPromises = [];

        ensureResizeDir(resizedDirectory);
        files.forEach(function (original) {
            var resized = gm(original)
                .resize(size.width, size.height, "!")
                .noProfile();
            var filename = original.replace(directory, resizedDirectory);
            resizedPromises.push(q.ninvoke(resized, 'write', filename).promise);
            resizedFilenames.push(filename);
        });

        q.all(resizedPromises)
        .then(function () {
            resized.resolve(resizedFilenames);
        }, function (err) {
            resized.reject(err);
        });

    });
    return resized.promise;
}

function createAverageImage(resizedFilenames, resizedDirectory, type) {
    var exec = require('child_process').exec;
    var image = q.defer();
    q.when(resizedFilenames, function (files) {
        var filename = [resizedDirectory, 'homepage_avg-'+type+'.png'].join('/');
        var command = [
            'convert'].concat(files).concat([
                '-evaluate-sequence', type, filename
        ]).join(' ');

        exec(command, function (err, stdout, stderr) {
                if (err) {
                    console.error(stderr);
                    image.reject(err);
                    return ;
                }
                image.resolve(filename);
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
        if (!average.length) {
            average = [average];
        }
        console.log(average);
        files.forEach(function (file) {
            average.forEach(function (origin) {
                difPromises.push(diff(file, origin, prefix));
            });
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
    var dest = prefixFile(file, prefix);
    var compare = q.defer();
    try {
        resemble(file).compareTo(average).onComplete(function (data) {
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
        console.log(e);
    }
    return compare.promise;
}

function ensureResizeDir(dest) {
    // do nothing for now
    return dest;
}

function prefixFile(file, prefix) {
    var last = file.lastIndexOf('/')+1;
    return file.slice(0, last)+prefix+file.slice(last);
}

function serve(directory) {
    console.log('start server.');
    var express = require('express');

    var app = express()
        .use(express.static(directory))
        .use(express.directory(directory))
        .listen(8080);
}
