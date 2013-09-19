(function (module) {
    "use stirct";
    var fs = require('fs');
    var Q = require('q');
    var _ = require('lodash');
    var gm = require('gm');

    function Finder(config) {
        this.config = _.defaults(config || {}, {
            directory: null
        });
        this.validateConfig(this.config);
    }
    // validate processed configuration meets expectations
    Finder.prototype.validateConfig = function (configuration) {
        if (!configuration.directory) {
            throw new Error('directory configuration is mandatory');
        }
        if (!fs.existsSync(configuration.directory)) {
            throw new Error('directory "'+configuration.directory+'" does not exist');
        }
    };
    // retreive all screenshots
    // TODO filter screenshots with filter.
    Finder.prototype.findAll = function (filter) {
        var finder = this;
        return Q
            .nfcall(fs.readdir, this.config.directory)
            .then(function convertFilenameToScreenshot(files) {
                var screenshots = [];
                files.forEach(function (f) {
                    var screenshot = finder.screenshotFactory(f);
                    screenshots.push(screenshot);
                });
                return Q(screenshots);
            });
    };
    Finder.prototype.findOne = function (filename) {
        var record = Q.defer();
        var fullname = this.fullpath(filename);
        fs.exists(fullname, function (exists) {
            if (!exists) {
                record.reject(new Error('Unknown file '+fullname));
                return ;
            }
            record.resolve(finder.screenshotFactory(filename));
        });
        return record;
    };
    // create screenshot object from filename
    Finder.prototype.screenshotFactory = function (filename) {
        return {
            id: filename,
            filename: filename,
            directory: this.config.directory,
            path: this.fullpath(filename),
            getSize: function () {
                return Q.ninvoke(gm(this.path), 'size');
            }
        };
    };
    Finder.prototype.fullpath = function (filename) {
        return [this.config.directory, filename].join('/');
    };

    function Repository (config) {
        this.config = _.defaults(config || {}, {
            directory: null
        });
        this.validateConfig(this.config);
    }
    // validate processed configuration meets expectations
    Repository.prototype.validateConfig = function (configuration) {
        if (!configuration.directory) {
            throw new Error('directory configuration is mandatory');
        }
        if (!fs.existsSync(configuration.directory)) {
            throw new Error('directory "'+configuration.directory+'" does not exist');
        }
    };
    // persist source
    Repository.prototype.persist = function (source, key, type) {
        switch(type) {
            case 'existing':
                return this.persistExisting(source, key);
            case 'gm':
                return this.persistGm(source, key);
            case 'base64':
            default:
                return this.persistBase64(source, key);
        }
    };
    Repository.prototype.persistBase64 = function (source, key) {
    };
    Repository.prototype.persistGm = function (source, key) {
        var repository = this;
        return Q.all([source, key])
            .then(function (results) {
                var source = results[0];
                var key = results[1];
                return Q.all([
                    key,
                    Q.ninvoke(source, 'write', repository.fullpath(key))
                ]);
            }).then(function (results) {
                var key = results[0];
                return Q(repository.screenshotFactory(key));
            });
    };
    Repository.prototype.persistExisting = function (source, key) {
        return Q(repository.screenshotFactory(key));
    };
    // create screenshot object from filename
    Repository.prototype.screenshotFactory = function (filename) {
        filename = this.canonize(filename);
        return {
            id: filename,
            filename: filename,
            directory: this.config.directory,
            path: this.fullpath(filename),
            getSize: function () {
                return Q.ninvoke(gm(this.path), 'size');
            }
        };
    };
    Repository.prototype.fullpath = function (filename) {
        return [this.config.directory, filename].join('/');
    };
    Repository.prototype.getPath = function () {
        return this.config.directory;
    };
    Repository.prototype.canonize = function (filename) {
        var path = this.getPath();
        if (filename.indexOf(path) === 0) {
            var canonized = filename.substr(path.length);
            if (canonized.charAt(0) === "/") {
                return canonized.substr(1, canonized.length);
            }
            return canonized;
        }
        return filename;
    };

    module.exports = {
        finder: Finder,
        repository: Repository
    };
})(module);
