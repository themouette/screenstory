/* globals describe:true, before:true, it:true, after:true, afterEach:true, brforeEach:true */
/* globals newClient */
/* globals assert */
describe('Github test',function(done) {
    var client;

    before(function (done) {
        client = newClient();
        client
            .url('https://github.com/')
            .setStory('Github')
            .call(done);
    });
    it('should call screenstory', function(done) {
        client
            .screenstory('main page')
            .call(done);
    });
    it('should include assert as global', function(done) {
        client
            .getTitle(function(err, title) {
                assert.ifError(err, 'Should not have error');
                assert(title === 'GitHub · Build software better, together.');
            })
            .call(done);
    });
    it('should go to screenstory repo', function(done) {
        client
            .url('https://github.com/themouette/screenstory')
            .screenstory('screenstory repository')
            .call(done);
    });
    it('should have foo method', function(done) {
        client
            .foo()
            .call(done);
    });
    it('should accept changes in story name', function(done) {
        client
            .setStory('random repo')
            .call(done);
    });
    it('should go to random repo', function(done) {
        var items = [
            'themouette/express-users',
            'themouette/screenstory',
            'davepacheco/node-verror',
            'webdriverio/webdriverio',
            'webdriverio/webdrivercss',
        ];
        var item = items[Math.floor(Math.random()*items.length)];

        client
            .url('https://github.com/' + item)
            .screenstory('random')
            .call(done);
    });
});
