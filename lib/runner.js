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
var webdriverio     = require('webdriverio');
var path            = require('path');
var fs              = require('fs');
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
            this._setup.bind(this)
        ], function (err, files) {
            return this
                ._run()
                .then(this._teardown.bind(this), debug)
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
            function setupReporter(cb) {
                var reporter = require('./reporter')(runner, runner.options);
                cb(null, reporter);
            },
            function loadExtensions(reporter, cb) {
                require('./runner/loadExtensions')(
                    runner.options.extension,
                    runner,
                    runner.options,
                    function (err, extensions) {
                        cb(null, reporter, extensions);
                    });
            },
            function emitAsyncSetupEvents(reporter, extensions, cb) {
                runner.emitAsync('setup', function () {
                    cb(null, reporter, extensions);
                });
            }
        ], function (err, reporter, extensions) {
            runner._reporter    = reporter;
            runner.extensions   = extensions;

            next(err, reporter, extensions);
        });

    return this;
};

// prepare context before given file runs
//
// see mocha runner `pre-require` event
Runner.prototype.prepareContext = function (context, file, mochaRunner) {
        debug('prepare context for %s', file);
        var runner = this;
        var options = this.options;
        var wdOptions = {
                    desiredCapabilities: options.wdCapabilities,
                    host: options.wdHost,
                    port: options.wdPort,
                    user: options.wdUsername,
                    key: options.wdKey,
                    logLevel: options.wdLogLevel
                };

        // Set saucelabs specific arguments
        if (options.saucelabs) {
            // Fix screensresolution
            // See https://docs.saucelabs.com/reference/test-configuration/#specifying-the-screen-resolution
            var platform = wdOptions.desiredCapabilities.platform;
            wdOptions
                .desiredCapabilities['screen-resolution']
                    = ['Windows 8', 'Windows 8.1'].indexOf(platform) === -1
                        ? '1920x1200'
                        : '1280x1024';
        }

        context.url = options.url;

        // @return webdriverio
        context.newClient = function () {
            // init client
            var client = webdriverio.remote(wdOptions)
                .init();

            // fix resolution
            if (options.wdResolution) {
                client
                    .setViewportSize(options.wdResolution, true);
            }
            runner.emit('new client', client, function next() {});

            // add extensions
            runner.extensions.forEach(function (extension) {
                Object.keys(extension).forEach(function (key) {
                    debug('+  Add command "%s"', key);
                    client.addCommand(key, extension[key]);
                });
            });

            return client;
        };

        // add globals
        options.global.forEach(function (globalName) {
            addGlobal(context, globalName);
        });
};

Runner.prototype._run = function () {
    var outputFile = this.options.toFile;
    // keep a reference to original write function
    // in case it is replaced
    var write = process.stdout.write;

    function captureStdout() {
        var stdo = fs.createWriteStream(outputFile, {encoding: 'utf8', flags: 'w', mode: '0755'});
        process.stdout.write = function capturedWrite(string, encoding, fd) {
            write.call(process.stdout, string);
            stdo.write(string);
        };
    }
    function releaseStdout(failures) {
        process.stdout.write = write;
        // We ave to forward failures
        return Promise.resolve(failures);
    }
    var runner = this;
    var promise = Promise.resolve()
        .then(function setupMocha() {
            debug('+ setup Mocha');
            var mocha   = runner.mocha = new Mocha();
            var options = runner.options;

            mocha.reporter(runner._reporter);
            mocha.suite.timeout(options.timeout);

            runner.files.forEach(function (filename) {
                debug('+  add file "%s"', filename);
                mocha.addFile(filename);
            });

            // Extend global context with some utilities
            //
            // newClient(),
            // url
            mocha.suite.on('pre-require', runner.prepareContext.bind(runner));

            runner.on('new client', function addTeardownWithMochaSuite(client, next) {
                // Once all mocha tests are done, just end the client
                after(function teardownWithMochaSuite(done) {
                    client
                        .end()
                        .call(done);
                });

                next();
            });

            return Promise.resolve(mocha);
        })
        .then(function () {
            return new Promise(function (resolve, reject) {
                    debug('run Mocha');

                    if (outputFile) {
                        captureStdout();
                    }

                    runner.mocha.run(function (failures) {
                        debug('+  runner exited');
                        resolve(failures);
                    });
                });
        });

    promise
        .then(releaseStdout, releaseStdout)
        .then(function (failures) {
            return Promise.resolve(failures);
        });

    return promise;
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



function addGlobal(context, globalName) {
    debug('load global "%s"', globalName);
    context[globalName] = searchModule(globalName);
}

function searchModule(moduleName) {
    var err;
    try {
        // try as a module
        return require(moduleName);
    } catch (e1) {
        err = new VError(e1, 'search module');
        try {
            // try in path
            return require(path.join(process.cwd(), moduleName));
        } catch (e2) {
            // last chance: in screenstory directory
            err = new VError(e2, err.message);
            try {
                return require(path.join(__dirname, '..', moduleName));
            } catch (e3) {
                throw new VError(e3, err.message);
            }
        }
    }
}
