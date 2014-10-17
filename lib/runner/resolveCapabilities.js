// Resolve capabilities from id
//
// The runner accepts capabilities by id, this service enrich the options with
// real capabilities.
var _       = require('lodash');
var VError  = require('verror');

var SERVER_SAUCELABS    = 'sauce';
var SERVER_BROWSERSTACK = 'browserstack';
var SERVER_LOCAL        = 'local';

module.exports = function resolveOptionsCapabilities(screenstoryConfig, options) {
    var serverType, capabilitiesDictionary;
    if (options.saucelabs) {
        serverType = SERVER_SAUCELABS;
    } else if (options.browserstack) {
        serverType = SERVER_BROWSERSTACK;
    } else {
        serverType = SERVER_LOCAL;
    }

    capabilitiesDictionary = getCapabilitiesDictionaryFromServerType(screenstoryConfig, serverType);

    options.wdCapabilities = resolveCapabilities(options.wdCapabilities, capabilitiesDictionary);

    return options;
};

function getCapabilitiesDictionaryFromServerType(screenstoryConfig, serverType) {
    switch (serverType) {
        case SERVER_SAUCELABS:
            return _.defaults(
                screenstoryConfig.capabilities.saucelabs,
                screenstoryConfig.capabilities.all
            );

        case SERVER_BROWSERSTACK:
            return _.defaults(
                screenstoryConfig.capabilities.browserstack,
                screenstoryConfig.capabilities.all
            );

        case SERVER_LOCAL:
            return screenstoryConfig.capabilities.all;

        default:
            throw new VError('Unknown server type "%s".', serverType);
    }

}

// Actual resolution for capabilities.
function resolveCapabilities(capabilities, capabilitiesDictionary) {
    if (typeof capabilities !== "string") {
        // we do not know how to parse non string capabilities, let's assume it
        // is selenium compliant capabilities and return it.
        return capabilities;
    }

    // try to parse as a JSON string
    try {
        return JSON.parse(capabilities);
    } catch (e) { }


    // No luck with JSON assumption.
    // Try to read from configuration.
    if (capabilities in capabilitiesDictionary) {
        return capabilitiesDictionary[capabilities];
    }

    // still no luck ?
    // assume this is browserName...
    return { browserName: capabilities };
}
