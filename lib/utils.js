var VError          = require('verror');
var path            = require('path');

module.exports.searchModule = function searchModule(moduleName) {
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
                return require(path.join(__dirname, '..', moduleName));
            } catch (e3) {
                throw new VError(e3, err.message);
            }
        }
    }
};
