// Resolve capabilities from id
//
// The runner accepts capabilities by id, this service enrich the options with
// real capabilities.
var _       = require('lodash');
var VError  = require('verror');

var SERVER_SAUCELABS    = 'sauce';
var SERVER_BROWSERSTACK = 'browserstack';
var SERVER_LOCAL        = 'local';

module.exports = function resolveWdOptions(screenstoryConfig, options) {
    var serverType = resolveServerType(options);
    var capabilitiesDictionary = getCapabilitiesDictionaryFromServerType(screenstoryConfig, serverType);

    // set wd options (host, port,...)
    options = resolveGridConfiguration(screenstoryConfig, options, serverType);

    // Extract capabilities
    options.wdCapabilities = resolveCapabilities(options.wdCapabilities, capabilitiesDictionary);

    return options;
};

function resolveServerType(options) {
    if (options.saucelabs) {
        return SERVER_SAUCELABS;
    } else if (options.browserstack) {
        return SERVER_BROWSERSTACK;
    } else {
        return SERVER_LOCAL;
    }
}

function resolveGridConfiguration(screenstoryConfig, options, serverType) {
    switch (serverType) {
        case SERVER_SAUCELABS:
            options.wdUsername  = (options.wdUsername || process.env.SAUCE_USERNAME);
            options.wdKey       = (options.wdKey || process.env.SAUCE_ACCESS_KEY);
            options.wdHost      = 'ondemand.saucelabs.com';
            options.wdPort      = '80';
            break;

        case SERVER_BROWSERSTACK:
            options.wdUsername  = (options.wdUsername || process.env.BROWSERSTACK_USERNAME);
            options.wdKey       = (options.wdKey || process.env.BROWSERSTACK_ACCESS_KEY);
            options.wdHost      = 'hub.browserstack.com';
            options.wdPort      = '80';
            break;

        case SERVER_LOCAL:
            var wd = screenstoryConfig.wd || {};
            // Add config from file
            options.wdUsername  = options.wdUsername || wd.username;
            options.wdKey       = options.wdKey || wd.key;
            options.wdHost      = options.wdHost || wd.host;
            options.wdPort      = options.wdPort || wd.port;
            break;

        default:
            throw new VError('Unknown server type "%s".', serverType);
    }

    return options;
}

function getCapabilitiesDictionaryFromServerType(screenstoryConfig, serverType) {
    // Ensure capabilities are defined
    screenstoryConfig.capabilities = screenstoryConfig.capabilities || {};
    switch (serverType) {
        case SERVER_SAUCELABS:
            return _.defaults(
                {},
                screenstoryConfig.capabilities.saucelabs,
                screenstoryConfig.capabilities.all
            );

        case SERVER_BROWSERSTACK:
            return _.defaults(
                {},
                screenstoryConfig.capabilities.browserstack,
                screenstoryConfig.capabilities.all
            );

        case SERVER_LOCAL:
            return screenstoryConfig.capabilities.all || {};

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
