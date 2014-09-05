describe('Github test',function(done) {
    var client;

    before(function (done) {
        client = newClient();
        client
            .url('https://github.com/')
            .screenstory('github')
            .call(done);
    });
    it('should have foo method', function(done) {
        client
            .foo()
            .call(done);
    });
    it('should have expected title', function(done) {
        client
            .getTitle(function(err, title) {
                assert.ifError(err, 'Should not have error');
                assert(title === 'GitHub · Build software better, together.');
            })
            .call(done);
    });
});
