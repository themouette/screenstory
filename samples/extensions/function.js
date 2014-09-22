/* global assert */
module.exports = function(runner, options) {
    var called = {};

    runner.on('setup', function (next) {
        console.log('called "setup"');
        called.setup = true;
        next(null);
    });
    runner.on('new client', function (client, next) {
        console.log('called "new client"');
        called.newClient = true;
        next(null);
    });
    runner.on('report', function (failures, next) {
        console.log('called "report"');
        called.report = true;
        next(null, []);
    });
    runner.on('done', function (failures, next) {
        console.log('called "done"');
        assert(called.setup, 'should have called "setup" event');
        assert(called.newClient, 'should have called "new client" event');
        assert(called.report, 'should have called "report" event');
        console.log('did call all events');
    });
};
