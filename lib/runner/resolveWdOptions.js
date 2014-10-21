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
    var capabilitiesDictionary = getCapabilitiesDictionaryFromServerType(screenstoryConfig.capabilities, serverType);

    // Extract capabilities
    options.wdCapabilities = resolveCapabilities(options.wdCapabilities, capabilitiesDictionary);

    // set wd options (host, port,...)
    options = resolveGridConfiguration(screenstoryConfig.env, options, serverType);

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

function resolveGridConfiguration(envConfig, options, serverType) {
    var wd = envConfig.wd || {};
    switch (serverType) {
        case SERVER_SAUCELABS:
            options.wdUsername  = (options.wdUsername || process.env.SAUCE_USERNAME);
            options.wdKey       = (options.wdKey || process.env.SAUCE_ACCESS_KEY);
            options.wdHost      = 'ondemand.saucelabs.com';
            options.wdPort      = '80';

            // Fix screensresolution
            // See https://docs.saucelabs.com/reference/test-configuration/#specifying-the-screen-resolution
            var platform = options.wdCapabilities.platform;
            options.wdCapabilities['screen-resolution']
                    = ['Windows 8', 'Windows 8.1'].indexOf(platform) === -1
                        ? '1920x1200'
                        : '1280x1024';
            break;

        case SERVER_BROWSERSTACK:
            options.wdUsername  = (options.wdUsername || process.env.BROWSERSTACK_USERNAME);
            options.wdKey       = (options.wdKey || process.env.BROWSERSTACK_ACCESS_KEY);
            options.wdHost      = 'hub.browserstack.com';
            options.wdPort      = '80';
            break;

        case SERVER_LOCAL:
            // Add config from file
            options.wdUsername  = options.wdUsername || wd.username;
            options.wdKey       = options.wdKey || wd.key;
            options.wdHost      = options.wdHost || wd.host;
            options.wdPort      = options.wdPort || wd.port;
            break;

        default:
            throw new VError('Unknown server type "%s".', serverType);
    }

    Object.keys(wd).forEach(function (key) {
        var wdKey = 'wd' + key.charAt(0).toUpperCase() + key.slice(1);
        if (!(wdKey in options)) {
            options[wdKey] = wd[key];
        }
    });

    return options;
}

function getCapabilitiesDictionaryFromServerType(capabilities, serverType) {
    // Ensure capabilities are defined
    capabilities = capabilities || {};
    switch (serverType) {
        case SERVER_SAUCELABS:
            return _.defaults(
                {},
                capabilities.saucelabs,
                capabilities.all
            );

        case SERVER_BROWSERSTACK:
            return _.defaults(
                {},
                capabilities.browserstack,
                capabilities.all
            );

        case SERVER_LOCAL:
            return capabilities.all || {};

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
