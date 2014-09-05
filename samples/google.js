describe('Github test',function(done) {
    var client;
    var assert = require('assert');

    before(function (done) {
        client = newClient();
        client
            .foo()
            .url('https://github.com/')
            .screenstory('github')
            .call(done);
    });
    it('logo have expected size', function(done) {
        client
            .getElementSize('.header-logo-wordmark', function(err, result) {
                assert(err === null);
                assert(result.height === 32);
                assert(result.width === 89);
            })
            .call(done);
    });
    it('should have expected title', function(done) {
        client
            .getTitle(function(err, title) {
                assert(err === null);
                assert(title === 'GitHub · Build software better, together.');
            })
            .call(done);
    });
});
