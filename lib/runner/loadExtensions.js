// Load extensions
var VError          = require('verror');
var path            = require('path');
var async           = require('async');
var searchModule    = require('../utils').searchModule;

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
