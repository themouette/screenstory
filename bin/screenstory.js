#!/usr/bin/env node
/* globals process, require */
'use strict';
var Mocha = require('mocha'),
    program = require('commander'),
    fs = require('fs'),
    glob = require('glob'),
    path = require('path'),
    webdriverjs = require('webdriverio'),
    screenstory = require('../index'),
    VError = require('verror');


function parseCapabilities(capabilities) {
    try {
        return JSON.parse(capabilities);
    } catch (e) {
        return { browserName: capabilities };
    }
}
function parseResolution(resolution) {
    var res = resolution.split('x') || [];

    return {
        width: res[0] ? parseInt(res[0]) : null,
        height: res[1] ? parseInt(res[1]) : null
    };
}

function collect(val, memo) {
  memo.push(val);
  return memo;
}

program
    .version('0.0.1')
    .usage('[options] <files ...>')

    .option('-u, --url [http://localhost:1337]', 'Specify test url [http://localhost:1337]', 'http://localhost:1337')
    .option('-s, --screenshots [tests/screenshots]', 'Specify screenshot destination', 'tests/screenshots')

    // selenium related options
    .option('-c, --wd-capabilities <phantomjs>', 'Specify desired capabilities (accept JSON or browserName)', parseCapabilities, parseCapabilities('phantomjs'))
    .option('--wd-host [127.0.0.1]', 'Specify selenium grid host', '127.0.0.1')
    .option('--wd-port [4444]', 'Specify selenium grid host', '4444')
    .option('--wd-username []', 'Specify selenium grid host')
    .option('--wd-key []', 'Specify selenium grid host')
    .option('--wd-log-level [silent]', 'Specify webdriverjs logLevel (verbose | silent | command | data | result)', 'silent')

    .option('-r, --wd-resolution [1024x768]', 'Specify window resolution (px)', parseResolution)

    .option('--browserstack', 'Use browserstack')
    .option('--saucelabs', 'Use browserstack')

    .option('-t, --timeout <10000>', 'Set timeout', parseInt, 10000)
    .option('--global <module>', 'Require <module> and add it to global path', collect, [])
    .option('--extension <module>', 'Require <module> a client extension', collect, [])

    .on('--help', function () {
        console.log('  Examples:');
        console.log('');
        console.log('    $ tests/runner -c {browserName: phantomjs}');
        console.log('    $ tests/runner -c firefox tests/specs/');
        console.log('    $ tests/runner -u http://localhost/');
        console.log('');
    })
    .parse(process.argv);

launch(program);

function launch(options) {
    var mocha = new Mocha();
    var thestory = screenstory(program.screenshots);

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

    // Add files on the mocha object.
    var files = [], patterns;
    // if argument is provided
    if (program.args.length) {
         patterns = program.args;
    } else {
        patterns = [path.join('tests', 'wd', 'specs', '**')];
    }
    patterns.forEach(function (pattern) {
        files = files.concat(glob.sync(pattern));
    });
    files.filter(function (file) {
            // Only keep the .js files
            return file.substr(-3) === '.js';
        })
        .forEach(function (file) {
            // Use the method "addFile" to add the file to mocha
            mocha.addFile(file);
        });

    // Extend global context with some utilities
    //
    // newClient(),
    // url
    mocha.suite.on('pre-require', function (context) {

        context.url = program.url;

        // @return webdriverjs
        context.newClient = function () {
            // init client
            var client = webdriverjs.remote({
                    desiredCapabilities: program.wdCapabilities,
                    host: program.wdHost,
                    port: program.wdPort,
                    user: program.wdUsername,
                    key: program.wdKey,
                    logLevel: program.wdLogLevel
                })
                .init();

            // fix resolution
            if (program.wdResolution) {
                client.windowHandleSize(program.wdResolution);
            }

            // add extensions
            require('../extensions/screenstory.js')(client, thestory);

            // add extensions
            program.extension.forEach(function (extensionName) {
                addExtension(client, extensionName);
            });

            return client;
        };

        // add globals
        program.global.forEach(function (globalName) {
            addGlobal(context, globalName);
        });
    });

    mocha.reporter('spec');
    mocha.suite.timeout(program.timeout);

    //mocha.bail(true);

    // Now, you can run the tests.
    mocha.run(function (failures) {
        thestory.generateReport(function () {
            process.on('exit', function () {
                process.exit(failures);
            });
        });
    });
}

function addGlobal(context, globalName) {
    context[globalName] = searchModule(globalName);
}
function addExtension(client, extensionName) {
    var extension = searchModule(extensionName);
    if ('function' === typeof extension) {
        extension = extension();
    }

    Object.keys(extension).forEach(function (key) {
        client.addCommand(key, extension[key]);
    });
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
