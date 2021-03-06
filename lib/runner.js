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
        timeout: null,
        reporter: 'spec',
        extension: []
    });
    EventEmitter.call(this);
}
module.exports = Runner;

util.inherits(Runner, EventEmitter);
// Prepare to provide an async way to emit events.
Runner.prototype.emitAsync = function emitAsync(eventName, allDoneCb) {
    var self = this;
    var args = _.toArray(arguments);
    // Latest argument is the next callback.
    allDoneCb = args.pop();
    // remove the eventName
    args.shift();

    async.mapSeries(
        this.listeners(eventName),
        function (listener, callback) {
            try {
                // The listener is async as there is more
                // arguments than provided
                if (listener.length >= args.length) {
                    return listener.apply(self, args.concat([callback]));
                }
                // The listener does not expect a `next` argument
                // so we should call it
                listener.apply(self, args);
                callback(null);
            } catch (e) {
                callback(e);
            }
        },
        function (err) {
            if (err) {
                debug('An error occured while executing event %s', eventName);
                debug(err);
                console.log(err);
            }
            allDoneCb.apply(self, arguments);
        }
    );
};

// Run tests.
// This is the main function
Runner.prototype.run = function () {
    var runner = this;

    async
        .waterfall([
            function seedWithOptions(cb) { cb(null, runner.options); },
            this._configure.bind(this),
            this._findTestFiles.bind(this),
            this._setup.bind(this),
            this._run.bind(this),
            this._teardown.bind(this)
        ], function (err, failures) {
            if (err) {
                console.log(err.stack);
                process.exit(1);
            }
        });

};

Runner.prototype._configure = function (options, next) {
    debug('configure');

    // import functions
    var readConfigurationFiles      = require('./runner/readConfigurationFiles');
    var resolveEnvConfiguration     = require('./runner/resolveEnvConfiguration');
    var resolveOptions              = require('./runner/resolveOptions');
    var resolveWdOptions            = require('./runner/resolveWdOptions');
    var resolveScreenshotOptions    = require('./runner/resolveScreenshotOptions');

    var config   = readConfigurationFiles();
    var screenstoryConfig = {
        env: resolveEnvConfiguration(config, options),
        capabilities: config.capabilities
    };

    options = resolveOptions(screenstoryConfig, options);
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

Runner.prototype._teardown = function (failures, next) {
    debug('teardown');

    var reports = [];
    var runner = this;

    async.waterfall([
            function emitReportEvent(cb) {
                debug('+  trigger "report" event');
                runner.emitAsync('report', failures, function onDone(err, results) {
                    if (err) { return cb(err); }
                    // extract reports
                    var reports = _.reduce(results, function (memo, generatedReports) {
                            return memo.concat(generatedReports || []);
                        }, []);

                    cb(null, reports);
                });
            },
            function generateMainReport(reports, cb) {
                debug('I should generate main report here');
                console.log(reports);
                cb(null, reports);
            },
            function emitDoneEvent(reports, cb) {
                runner.emitAsync('done', failures, function (err) { cb(err); });
            },
            function exitProcess(cb) {
                process.on('exit', function () {
                    debug('exit with %s', failures ? 'failures' : 'success');
                    process.exit(failures);
                });
            }
        ],
        function (err) {
            next(err);
        });

};

