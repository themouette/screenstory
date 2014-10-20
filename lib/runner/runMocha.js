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
    mocha.suite.timeout(options.timeout);

    screenstoryRunner.files.forEach(function (filename) {
        debug('+  add file "%s"', filename);
        mocha.addFile(filename);
    });

    // Extend global context with some utilities
    //
    // newClient(),
    // url
    mocha.suite.on('pre-require', prepareContext.bind(screenstoryRunner, screenstoryRunner, options));

    screenstoryRunner.on('new client', function addTeardownWithMochaSuite(client, next) {
        // Once all mocha tests are done, just end the client
        after(function teardownWithMochaSuite(done) {
            client
                .end()
                .call(done);
        });

        next();
    });
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
        screenstoryRunner.emit('new client', client, function next() {});

        // add extensions
        screenstoryRunner.extensions.forEach(function (extension) {
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



