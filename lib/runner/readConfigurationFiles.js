// Retrieve configuration files and load content.
//
// File is searched in current working directory and up.
// Result (if any) is merged with default configuration located in screenstory
// root directory
var fs              = require('fs');
var yaml            = require('js-yaml');
var findup          = require('findup-sync');
var _               = require('lodash');
var VError          = require('verror');


module.exports = function readConfigurationFiles(filename) {
    filename = (filename || 'screenstory.yml');
    var defaultConfig = _.extend(
        loadConfigFile(findup(filename)),
        loadConfigFile(findup(filename, {cwd: __dirname}))
    );

    return defaultConfig;
};

function loadConfigFile(filePath) {
    if (!filePath) {
        return {};
    }
    var config;

    try {
        config = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
        return config;
    } catch (e) {
        throw new VError(e, 'While parsing config file "%s".', filePath);
    }
}
