#!/usr/bin/env node
/* globals process, require */
'use strict';
var debug           = require('debug')('screenstory:bin');
var Mocha           = require('mocha');
var program         = require('commander');
var fs              = require('fs');
var glob            = require('glob');
var path            = require('path');
var webdriverjs     = require('webdriverio');
var screenstory     = require('../lib/screenstory');
var VError          = require('verror');
var yaml            = require('js-yaml');
var findup          = require('findup-sync');
var _               = require('lodash');


function loadConfigFile(filePath) {
    if (!filePath) {
        return {};
    }
    var config;

    try {
        config = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
        return config;
    } catch (e) {
        throw new VError(e, 'While parsing config file "%s".', filePath);
    }
}
var defaultConfig = _.extend(
    loadConfigFile(findup('screenstory.yml')),
    loadConfigFile(findup('screenstory.yml', {cwd: __dirname}))
);

debug("Loaded default config");

function parseCapabilities(capabilities) {
    try {
        return JSON.parse(capabilities);
    } catch (e) {
        if (defaultConfig.capabilities[capabilities]) {
            return defaultConfig.capabilities[capabilities];
        }

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

    .option('-p, --project-name <No Project>', 'Add a project name to story Ids', 'No Project')
    .option('-u, --url [http://localhost:1337]', 'Specify test url [http://localhost:1337]', 'http://localhost:1337')

    .option('-s, --screenshot-root [tests/screenshots]', 'Specify screenshot destination [tests/screenshots]', 'tests/screenshots')
    .option('--screenshot-width [1024]', 'Specify screen width (px)', collect, [])
    .option('--screenshot-orientation [PORTRAIT|LANDSCAPE]', 'Specify window resolution (px)', collect, [])

    // selenium related options
    .option('-c, --wd-capabilities <phantomjs>', 'Specify desired capabilities (accept JSON or browserName)', parseCapabilities, parseCapabilities('phantomjs'))
    .option('--wd-host [127.0.0.1]', 'Specify selenium grid host', '127.0.0.1')
    .option('--wd-port [4444]', 'Specify selenium grid host', '4444')
    .option('--wd-username []', 'Specify selenium grid host')
    .option('--wd-key []', 'Specify selenium grid host')
    .option('--wd-log-level [silent]', 'Specify webdriverjs logLevel (verbose | silent | command | data | result)', 'silent')

    .option('-r, --wd-resolution [1024x768]', 'Specify window resolution (px)', parseResolution)

    .option('--browserstack', 'Use browserstack')
    .option('--saucelabs', 'Use saucelabs')
    .option('--without-screenstory', 'Do not include screenstory extension')

    .option('--to-file <filepath>', 'Write tests results to file [null]', null)
    .option('-t, --timeout <10000>', 'Set timeout', parseInt, 10000)
    .option('--reporter <spec>', 'Mocha reporter [spec, xunit, dot, json, markdown...]', 'spec')
    .option('--global <module>', 'Require <module> and add it to global path', collect, [])
    .option('--extension <module>', 'Require <module> a client extension', collect, [])

    .option('--admin-panel <http://localhost:9000>', 'Send reports to a webdrivercss-adminpanel server', '')

    .on('--help', function () {
        console.log('  Examples:');
        console.log('');
        console.log('    $ tests/runner -c {browserName: phantomjs}');
        console.log('    $ tests/runner -c firefox tests/specs/');
        console.log('    $ tests/runner -u http://localhost/');
        console.log('');
    })
    .parse(process.argv);

// Add screenstory extension
if (!program.ignoreScreenstory) {
    program.extension.push(path.resolve(path.join(__dirname, '..', 'extensions', 'screenstory')));
}
var Runner = require('../lib/runner');
var runner = new Runner(program);
runner.run();
