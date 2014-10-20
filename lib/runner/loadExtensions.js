// Load extensions
var VError          = require('verror');
var path            = require('path');
var async           = require('async');

module.exports = function loadExtensions(extensions, runner, options, next) {
    if (!extensions) {
        extensions = [];
    }
    if (!Array.isArray(extensions)) {
        extensions = [extensions];
    }
    async.map(extensions, loadExtension.bind(this, runner, options), function (err, loadedExtensions) {
        if (err) {
            return next(err);
        }
        next(null, loadedExtensions.filter(identity));
    });
};

// Used to filter extensions
function identity(item) {
    return item;
}

function loadExtension(runner, options, moduleName, cb) {
    try {
        var extension = searchModule(moduleName);

        if ('function' === typeof extension) {
            extension = extension(runner, options);
        }

        cb(null, extension);
    } catch (e) {
        cb(new VError(e, 'While loading extension "%s".', moduleName));
    }
}

function searchModule(moduleName) {
    var err;
    try {
        // try as a module
        return require(moduleName);
    } catch (e1) {
        err = new VError(e1, 'search module');
        try {
            // try in path
            return require(path.join(process.cwd(), moduleName));
        } catch (e2) {
            // last chance: in screenstory directory
            err = new VError(e2, err.message);
            try {
                return require(path.join(__dirname, '..', '..', moduleName));
            } catch (e3) {
                throw new VError(e3, err.message);
            }
        }
    }
}
