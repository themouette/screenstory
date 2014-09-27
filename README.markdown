## Screenstory

[![Build
Status](https://travis-ci.org/themouette/screenstory.svg?branch=master)](https://travis-ci.org/themouette/screenstory)

A cli to run webdriverio tests on several browsers.

``` bash
screenstory tests/wd

# show help
screenstory -h
```

## Write tests

Up to now, only mocha runner is available. In the future, other runner might be
supported (PRs welcome).

``` javascript
describe('Google.com', function () {
    var chai = require('chai');
    var client;

    before(function () {
        client = newClient();
        // set the story name for all further screenshots
        client.setStory('Google');
    });

    after(function (done) {
        client.end(done);
    });

    it('should be accessible', function (done) {
        client
            .url('https://google.fr')
            .screenstory('lading')
            .call(done)
    });

    it('should have a search form', function (done) {
        client
            .sendKeys('screenstory', 'form[action="/search"] .q')
            .screenstory('instant-search')
            .call(done);
    });
});
```

## Extensions

Simply add your own webdriverio methods using the `--extension` flag:

``` bash
screenstory --extension foo/bar --extension foo/baz tests/wd
```

An extension is a simple json object or a function.

``` javascript
module.exports = {
    foo: function (cb) {
        cb();
    }
};
```

Declare an extension that will be executed once at load time

``` javascript
module.exports = function (runner, options) {
    // runner is the screenstory runner instance
    // options are the one provided to cli
    runner.on('setup', function doSomething(next) { });
    runner.on('done', function doSomething(failures, next) { });
    return {
        bar: function (cb) {
            cb();
        }
    }
}
```

### Bundled Extensions

* Chai: a [chaijs](http://chaijs.com/) based extension to add some assertions
* Screenstory: the default screenstory extension

## Runner events

* "setup": function (next) {}
* "new client": function (client, next) {}
* "report": function (failures, next) {next(err, ['report/file/path'])}
* "done": function (next) {}
