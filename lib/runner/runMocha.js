var Mocha           = require('mocha');
var fs              = require('fs');
var async           = require('async');
var debug           = require('debug')('screenstory:runner:runMocha');
var webdriverio     = require('webdriverio');
var searchModule    = require('../utils').searchModule;

module.exports = function runMocha(options, files, screenstoryRunner, next) {

    async.waterfall([
        function seedParams(cb) {cb(null, options, files, screenstoryRunner);},
        setupReporter,
        setupMocha,
        runTests
    ], function (err, failures) {
        if (err) {
            return next(err);
        }
        next(null, failures);
    });
};

function setupReporter(options, files, screenstoryRunner, cb) {
    var reporter = require('../reporter')(screenstoryRunner, options);
    screenstoryRunner._reporter    = reporter;

    cb(null, options, files, screenstoryRunner, reporter);
}

function setupMocha(options, files, screenstoryRunner, reporter, next) {
    var mocha   = new Mocha();

    mocha.reporter(screenstoryRunner._reporter);
    mocha.useColors(options.mochaColors);
    mocha.suite.timeout(options.timeout);
    mocha.suite.enableTimeouts(options.timeout.toString() !== '0');

    screenstoryRunner.files.forEach(function (filename) {
        debug('+  add file "%s"', filename);
        mocha.addFile(filename);
    });

    // Extend global context with some utilities
    //
    // newClient(),
    // url
    mocha.suite.on('pre-require', prepareContext.bind(screenstoryRunner, screenstoryRunner, options));

    next(null, options, files, mocha);
}

function runTests(options, files, mocha, next) {
    mocha.run(function (failures) {
        debug('+  runner exited');
        next(null, failures);
    });
}

// prepare context before given file runs
//
// see mocha runner `pre-require` event
function prepareContext(screenstoryRunner, options, context, file, mochaRunner) {
    debug('prepare context for %s', file);
    var wdOptions = {
                desiredCapabilities: options.wdCapabilities,
                host: options.wdHost,
                port: options.wdPort,
                user: options.wdUsername,
                key: options.wdKey,
                logLevel: options.wdLogLevel
            };

    context.url = options.url;

    // @return webdriverio
    context.newClient = function () {
        // init client
        var client = webdriverio.remote(wdOptions)
            .init();

        // fix resolution
        if (options.resolution) {
            client
                .setViewportSize(options.resolution, true);
        }

        // add extensions
        screenstoryRunner.extensions.forEach(function (extension) {
            Object.keys(extension).forEach(function (key) {
                debug('+  Add command "%s"', key);
                client.addCommand(key, extension[key]);
            });
        });
        screenstoryRunner.emitAsync('new client', client, function (err) {
            if (err) {
                debug('While executing "new client" event, following error occured');
                debug(err);
                console.log(err);
            }
        });

        return client;
    };

    // add globals
    options.global.forEach(function (globalName) {
        addGlobal(context, globalName);
    });
}

function addGlobal(context, globalName) {
    debug('load global "%s"', globalName);
    var moduleName = globalName, exposedName = globalName;
    if (-1 !== globalName.indexOf(':')) {
        moduleName = globalName.split(':', 1);
        exposedName = globalName.split(':').pop();
    }
    if (-1 !== globalName.indexOf('/')) {
        exposedName = globalName.split('/').pop();
    }
    context[exposedName] = searchModule(moduleName);
}



