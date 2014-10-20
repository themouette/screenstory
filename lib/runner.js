// The main runner
// ===============
//
//
var EventEmitter    = require('events').EventEmitter;
var util            = require('util');
var Promise         = require('es6-promise').Promise;
var _               = require('lodash');
var debug           = require('debug')('screenstory:runner');
var Mocha           = require('mocha');
var VError          = require('verror');
var path            = require('path');
var async           = require('async');

function Runner(options) {
    this.options = _.defaults(options, {
        toFile: null,
        timeout: 10000,
        reporter: 'spec',
        extension: []
    });
    EventEmitter.call(this);
}
module.exports = Runner;

util.inherits(Runner, EventEmitter);
// Prepare to provide an async way to emit events.
Runner.prototype.emitAsync = function emitAsync(eventName, allDoneCb) {
    allDoneCb = arguments[arguments.length - 1];
    var args = _.head(arguments, arguments.length - 1);
    args.push(function next() {});
    this.emit.apply(this, args);
    allDoneCb(null);
};

// Run tests.
// This is the main function
Runner.prototype.run = function () {
    var runner = this;

    async
        .waterfall([
            function seedWQithOptions(cb) { cb(null, runner.options); },
            this._configure.bind(this),
            this._findTestFiles.bind(this),
            this._setup.bind(this),
            this._run.bind(this)
        ], function (err, failures) {
            return this
                ._teardown(failures)
                .catch(function (err) {
                    console.log(err.stack);
                    process.exit(1);
                });
        }.bind(this));

};

Runner.prototype._configure = function (options, next) {
    debug('configure');

    // import functions
    var readConfigurationFiles  = require('./runner/readConfigurationFiles');
    var resolveWdOptions     = require('./runner/resolveWdOptions');
    var resolveScreenshotOptions     = require('./runner/resolveScreenshotOptions');

    var screenstoryConfig = readConfigurationFiles();
    options = resolveWdOptions(screenstoryConfig, options);
    options = resolveScreenshotOptions(screenstoryConfig, options);

    // Emit a 'configure' event
    //
    // This can be used to configure extensions, unless extensions are
    // not loaded yet.
    var runner = this;
    this.emitAsync('configure', screenstoryConfig, options, function (err) {
        runner.options = options;
        next(err, options);
    });
};

Runner.prototype._findTestFiles = function (options, next) {
    var self = this;

    var findTestFiles = require('./runner/findTestFiles');

    findTestFiles(options.args, function (err, files) {
        self.files = files;
        next(err, files);
    });
};

Runner.prototype._setup = function (files, next) {
    debug('setup');
    var runner = this;

    async.waterfall([
            function loadExtensions(cb) {
                require('./runner/loadExtensions')(
                    runner.options.extension,
                    runner,
                    runner.options,
                    function (err, extensions) {
                        cb(null, extensions);
                    });
            },
            function emitAsyncSetupEvents(extensions, cb) {
                runner.emitAsync('setup', function () {
                    cb(null, extensions);
                });
            }
        ], function (err, extensions) {
            runner.extensions   = extensions;

            next(err, extensions);
        });

    return this;
};


Runner.prototype._run = function (extensions, next) {
    require('./runner/runMocha')(this.options, this.files, this, next);

    return this;
};

Runner.prototype._teardown = function (failures) {
    debug('teardown');
    var promise = Promise.resolve();

    debug('+  trigger "report" event');

    var reports = [];

    this.emit('report', failures, function next(err, report) {
            reports = reports.concat(report);
            promise
                .then(function () {
                    if (err) { return Promise.reject(err); }
                    return Promise.resolve();
                })
                .catch(function (err) {
                    debug(err);
                    debug(new VError(err, 'While executing "report" event'));
                });
        });

    promise
        .then(function generateMainReport() {
            debug('I should generate main report here');
            console.log(reports);
        }.bind(this));

    debug('+  trigger "done" event');

    this.emit('done', failures, function next(err) {
        promise
            .then(function () {
                if (err) { return Promise.reject(err); }
                return Promise.resolve();
            })
            .catch(function (err) {
                debug(new VError(err, 'While executing "done" event'));
            });
    });

    promise
        .then(new Promise(function (resolve, reject) {
            process.on('exit', function () {
                debug('exit with %s', failures ? 'failures' : 'success');
                process.exit(failures);
            });
            resolve(failures);
        }));

    return promise;
};



