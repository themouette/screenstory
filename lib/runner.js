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
var glob            = require('glob');
var webdriverio     = require('webdriverio');
var path            = require('path');
var fs              = require('fs');

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

// Run tests.
// This is the main function
Runner.prototype.run = function () {
    return this
        ._configure()
        .then(this._findTestFiles.bind(this), debug)
        .then(this._setup.bind(this), debug)
        .then(this._run.bind(this), debug)
        .then(this._teardown.bind(this), debug)
        .catch(function (err) {
            console.log(err.stack);
            process.exit(1);
        });
};

Runner.prototype._configure = function () {
    debug('configure');

    var options = this.options;

    if (options.browserstack) {
        options.wdUsername || (options.wdUsername = process.env.BROWSERSTACK_USERNAME);
        options.wdKey || (options.wdKey = process.env.BROWSERSTACK_ACCESS_KEY);
        options.wdHost = 'hub.browserstack.com';
        options.wdPort = '80';
    } else if (options.saucelabs) {
        options.wdUsername || (options.wdUsername = process.env.SAUCE_USERNAME);
        options.wdKey || (options.wdKey = process.env.SAUCE_ACCESS_KEY);
        options.wdHost = 'ondemand.saucelabs.com';
        options.wdPort = '80';
    }

    return Promise.resolve(options);
};

Runner.prototype._findTestFiles = function (options) {
    var promise = new Promise(function (resolve, reject) {
        debug('findTestFiles');
        // Add files on the mocha object.
        var files = [], patterns;
        // if argument is provided
        if (options.args.length) {
            patterns = options.args;
        } else {
            patterns = [path.join('tests', 'wd', 'specs', '**')];
        }
        patterns.forEach(function (pattern) {
            files = files.concat(glob.sync(pattern));
        });
        files = files.filter(function (file) {
            // Only keep the .js files
            return file.substr(-3) === '.js';
        });

        resolve(files);
    }.bind(this))
    .then(function storeFiles(files) {
        this.files = files;
    }.bind(this));

    return promise;
};

Runner.prototype._setup = function (files) {
    debug('setup');

    return Promise
        .resolve()
        .then(function setupReporter() {
            this._reporter = require('./reporter')(this, this.options);
            return Promise.resolve(this._reporter);
        }.bind(this))
        .then(function loadExtensions() {
            this.extensions = [];
            this.options.extension.forEach(function (extensionName) {
                debug('+  load extension "%s"', extensionName);
                var extension = searchModule(extensionName);

                if ('function' === typeof extension) {
                    extension = extension(this, this.options);
                }

                if (extension) {
                    this.extensions.push(extension);
                }

            }.bind(this));

            return Promise.resolve();
        }.bind(this))
        .then(function emitAsyncSetupEvents() {
            debug('+ emit "setup" event');
            var promise = Promise.resolve();
            this.emit('setup', function next(err) {
                promise
                    .then(function () {
                        if (err) { return Promise.reject(err); }
                        return Promise.resolve();
                    })
                    .catch(function (err) {
                        debug(new VError(err, 'While executing "setup" event'));
                        return Promise.resolve();
                    });
            });
            return promise;
        }.bind(this))
        .then(function hydrateWithOptions() {
            debug('+ setup event end');
            return Promise.resolve(this.options);
        }.bind(this));
};

// prepare context before given file runs
//
// see mocha runner `pre-require` event
Runner.prototype.prepareContext = function (context, file, mochaRunner) {
        debug('prepare context for %s', file);
        var runner = this;
        var options = this.options;
        context.url = options.url;

        // @return webdriverio
        context.newClient = function () {
            // init client
            var client = webdriverio.remote({
                    desiredCapabilities: options.wdCapabilities,
                    host: options.wdHost,
                    port: options.wdPort,
                    user: options.wdUsername,
                    key: options.wdKey,
                    logLevel: options.wdLogLevel
                })
                .init();

            // fix resolution
            if (options.wdResolution) {
                client.setViewportSize(options.wdResolution);
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
    var promise = Promise.resolve()
        .then(function setupMocha() {
            debug('+ setup Mocha');
            var mocha   = this.mocha = new Mocha();
            var options = this.options;

            mocha.reporter(this._reporter);
            mocha.suite.timeout(options.timeout);

            this.files.forEach(function (filename) {
                debug('+  add file "%s"', filename);
                mocha.addFile(filename);
            });

            // Extend global context with some utilities
            //
            // newClient(),
            // url
            mocha.suite.on('pre-require', this.prepareContext.bind(this));

            this.on('new client', function addTeardownWithMochaSuite(client, next) {
                // Once all mocha tests are done, just end the client
                after(function teardownWithMochaSuite(done) {
                    client
                        .end()
                        .call(done);
                });

                next();
            });

            return Promise.resolve(mocha);
        }.bind(this))
        .then(function () {
            return new Promise(function (resolve, reject) {
                    debug('run Mocha');

                    if (outputFile) {
                        captureStdout();
                    }

                    this.mocha.run(function (failures) {
                        debug('+  runner exited');
                        resolve(failures);
                    });
                }.bind(this));
        }.bind(this));

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
