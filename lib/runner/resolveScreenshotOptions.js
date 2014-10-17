// Resolve screenshot options
//
// merge runner options with the ones in config file
// see screenstory config file for a full documentation of possible options
module.exports = function resolveScreenshotOptions(screenstoryConfig, options) {

    var screenshot = screenstoryConfig.screenshot || {};
    // Add config from file
    options.screenshotRoot        = options.screenshotRoot || screenshot.root;
    options.screenshotOrientation = options.screenshotOrientation || screenshot.orientation;
    options.screenshotWidth       = options.screenshotWidth || screenshot.width;

    return options;
};
