module.exports = function (client, screenstory) {
    'use strict';

    client.addCommand('screenstory', function (id, cb) {
        this.screenshot(function addToScreenstory(err, image) {
            if (err) return cb(err);
            var options = {
                id: id,
                capabilities: client.desiredCapabilities,
                storyId: this.screenstoryId
            };
            screenstory.save(image, options, cb);
        });
    });

    client.addCommand('setStory', function (title, cb) {
        this.screenstoryId = title;
        cb();
    });
};
