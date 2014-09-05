## Screenstory

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

Declare an extension that will be renewed for every test file
``` javascript
module.exports = function () {
    return {
        bar: function (cb) {
            cb();
        }
    }
}
```
