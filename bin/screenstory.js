#!/usr/bin/env node
/* globals process, require */
'use strict';
var Mocha = require('mocha'),
    program = require('commander'),
    fs = require('fs'),
    glob = require('glob'),
    path = require('path'),
    webdriverjs = require('webdriverio'),
    screenstory = require('../lib/screenstory'),
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
    .option('-s, --screenshot-root [tests/screenshots]', 'Specify screenshot destination [tests/screenshots]', 'tests/screenshots')

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
