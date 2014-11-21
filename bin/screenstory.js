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



debug("Loaded default config");

function collect(val, memo) {
  if (!memo) {
      memo = [];
  }
  memo.push(val);
  return memo;
}

program
    .version(require('../package.json').version)
    .usage('[options] <files ...>')

    .option('-p, --project-name <No Project>', 'Add a project name to story Ids')
    .option('-u, --url [http://localhost:1337]', 'Specify test url [http://localhost:1337]')
    .option('-r, --resolution [1024x768]', 'Specify window resolution (px)')

    .option('-s, --screenshot-root [tests/screenshots]', 'Specify screenshot destination [tests/screenshots]')
    .option('--screenshot-width [1024]', 'Specify screen width (px)', collect)
    .option('--screenshot-orientation [PORTRAIT|LANDSCAPE]', 'Specify window resolution (px)', collect)
    .option('--screenshot-diff', 'Compute screenshot diff')

    // selenium related options
    .option('-c, --wd-capabilities <phantomjs>', 'Specify desired capabilities (browserName or id as defined in screenstory.yml)', 'phantomjs')
    .option('--wd-host [127.0.0.1]', 'Specify selenium grid host', '127.0.0.1')
    .option('--wd-port [4444]', 'Specify selenium grid host', '4444')
    .option('--wd-username []', 'Specify selenium grid host')
    .option('--wd-key []', 'Specify selenium grid host')
    .option('--wd-log-level [silent]', 'Specify webdriverjs logLevel (verbose | silent | command | data | result)', 'silent')

    .option('--browserstack', 'Use browserstack')
    .option('--saucelabs', 'Use saucelabs')
    .option('--without-screenstory', 'Do not include screenstory extension')

    .option('--to-file <filepath>', 'Write tests results to file [null]', null)
    .option('-t, --timeout <10000>', 'Set timeout', parseInt)
    .option('--reporter <spec>', 'Mocha reporter [spec, xunit, dot, json, markdown...]', 'spec')
    .option('--no-mocha-colors', 'disable colors in mocha reporter')
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
