(function (module) {
    "use stirct";
    var Q = require('q');
    var _ = require('lodash');
    var gm = require('gm');
    var exec = require('child_process').exec;

    function Resizer(config) {
        this.config = _.defaults(config || {}, {
            // destination repository
            repository: null
        });
        this.validateConfig(this.config);
        this.repository = this.config.repository;
    }
    // validate processed configuration meets expectations
    Resizer.prototype.validateConfig = function (configuration) {
        if (!configuration.repository) {
            throw new Error('repository configuration is mandatory');
        }
    };
    Resizer.prototype.resize = function (image, size) {
        var repository = this.repository;
        return Q.all([image, size])
            .then(function resize(results) {
                var image = results[0];
                var size = results[1];
                var resized = gm(image.path)
                    .resize(size.width, size.height, "!")
                    .noProfile();
                return Q.all([resized, image.filename]);
            }).then(function (results) {
                var resized = results[0];
                var key = results[1];
                return Q(repository.persist(resized, key, 'gm'));
            });
    };

    function Uniformizer(config) {
        this.config = _.defaults(config || {}, {
            // destination repository
            resizer: null
        });
        this.validateConfig(this.config);
        this.resizer = this.config.resizer;
    }
    // validate processed configuration meets expectations
    Uniformizer.prototype.validateConfig = function (configuration) {
        if (!configuration.resizer) {
            throw new Error('resizer configuration is mandatory');
        }
    };
    Uniformizer.prototype.uniformize = function (images) {
        var size = this.getOptimalSize(images);
        return this.resize(images, size);
    };
    // retrieve optimal size to resize all images to enable merge.
    Uniformizer.prototype.getOptimalSize = function (images) {
        return Q.when(images)
            .then(function (images) {
                return Q.all(images.map(function (image) {
                    return image.getSize();
                }));
            }).then(function (sizes) {
                var optimal = {
                    width: 0,
                    height: 0
                };
                sizes.forEach(function (current) {
                    optimal.width = Math.max(optimal.width, current.width);
                    optimal.height = Math.max(optimal.height, current.height);
                });
                // pass the optimal size for resolution
                return Q(optimal);
            }).then(function (optimal) {
                console.log('optimal size: %sx%s', optimal.width, optimal.height);
                return optimal;
            });
    };
    // resize for all images
    Uniformizer.prototype.resize = function (images, size) {
        var resizer = this.resizer;
        return Q.all([images, size])
            .then(function (results) {
                var images = results[0];
                var size = results[1];
                return Q.all(images.map(function (image, index) {
                    return resizer.resize(image, size);
                }));
            }).then(function (resized) {

                console.log('images resized');
                return resized;
            });
    };

    function Average(config) {
        this.config = _.defaults(config || {}, {
            // destination repository
            repository: null,
            // algorithm to use.
            // mean|median
            // refer to imagemagick [doc](http://www.imagemagick.org/Usage/layers/#evaluate-sequence)
            algorithm: "mean"
        });
        this.validateConfig(this.config);
        this.repository = this.config.repository;
    }
    // validate processed configuration meets expectations
    Average.prototype.validateConfig = function (configuration) {
        if (!configuration.repository) {
            throw new Error('repository configuration is mandatory');
        }
    };
    Average.prototype.average = function (images) {
        var avg = this;
        return Q.when(images)
            .then(this.compute)
            .then(this.persist)
            .fail(function (err, stdout, stderr) {
                console.error(stderr);
            });
    };
    Average.prototype.compute = function (images) {
        var algorithm = this.options.algorithm;
        // launch convert command
        return Q.when(images)
            .then(function (images) {
                var filename = [resizedDirectory, 'homepage_avg-'+type+'.png'].join('/');
                var origin = _.pluck(images, 'path');
                var command = [
                    'convert'].concat(origin).concat([
                        '-evaluate-sequence', algorithm, filename
                ]).join(' ');
                return Q.ninvoke(exec, command)
                    .then(Q([filename, 'homepage_avg-'+type+'.png']));
            });
    };
    Average.prototype.persist = function (filename, key) {
        var repository = this.repository;
        return repository.persist(filename, key, 'existing');
    };

    module.exports = {
        resizer: Resizer,
        uniformizer: Uniformizer,
        average: Average
    };
})(module);
