// Use mocha reporters via a proxy.

var Base = require('mocha/lib/reporters/base');
var EventEmitter = require('events').EventEmitter;

exports = module.exports = function createMochaReporterProxy(screenstoryRunner, screenstoryOtions) {

  var runner = new EventEmitter();
  var Reporter = loadReporter(screenstoryOtions.reporter);
  var reporter = new Reporter(runner);


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
    forwardEvent(mochaRunner, runner, 'end');
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
