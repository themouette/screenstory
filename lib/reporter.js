// Use mocha reporters via a proxy.

var fs = require('fs');
var Base = require('mocha/lib/reporters/base');
var EventEmitter = require('events').EventEmitter;

exports = module.exports = function createMochaReporterProxy(screenstoryRunner, screenstoryOtions) {

  var runner = new EventEmitter();
  var Reporter = loadReporter(screenstoryOtions.reporter);
  var reporter = new Reporter(runner);
  var outputFile = screenstoryOtions.toFile;


  /**
  * Initialize a new `ProxyReporter` reporter.
  *
  * @param {Runner} runner
  * @api public
  */

  function ForwardMochaReporter(mochaRunner, options) {
    Base.call(this, mochaRunner, options);
    forwardEvent(mochaRunner, runner, 'start');
    forwardEvent(mochaRunner, runner, 'suite');
    forwardEvent(mochaRunner, runner, 'suite end');
    forwardEvent(mochaRunner, runner, 'pending');
    forwardEvent(mochaRunner, runner, 'pass');
    forwardEvent(mochaRunner, runner, 'fail');
    // when runner output should be captured, it is done for the end event only.
    mochaRunner.on('end', function () {
        try {
            if (outputFile) {
                console.log(outputFile);
                captureStdout(outputFile);
            }
            var args = Array.prototype.slice.call(arguments, 0);
            runner.emit.apply(runner, ['end'].concat(args));
            releaseStdout();
        } catch (e) {
            releaseStdout();
        }
    });
  }

  return ForwardMochaReporter;
};

function forwardEvent(from, to, eventName) {
  from.on(eventName, function () {
    var args = Array.prototype.slice.call(arguments, 0);
    to.emit.apply(to, [eventName].concat(args));
  });
}

function loadReporter(reporter){
  var _reporter;
  if ('function' === typeof reporter) {
    return reporter;
  }

  reporter = reporter || 'spec';
  try { _reporter = require('mocha/lib/reporters/' + reporter); } catch (err) {}
  if (!_reporter) { try { _reporter = require(reporter); } catch (err) {}}

  if (!_reporter) { throw new Error('invalid reporter "' + reporter + '"'); }
  return _reporter;
}

// keep a reference to original write function
// in case it is replaced
var write = process.stdout.write;

function captureStdout(outputFile) {
    var stdo = fs.createWriteStream(outputFile, {encoding: 'utf8', flags: 'w', mode: '0755'});
    process.stdout.write = function capturedWrite(string, encoding, fd) {
        write.call(process.stdout, string);
        stdo.write(string);
    };
}
function releaseStdout() {
    process.stdout.write = write;
}
