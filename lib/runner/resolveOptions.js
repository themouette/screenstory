// Resolve General Options.
//
// If an option is not defined in runner option but is avilable in
// screenstory.yml, then the default one is used.
module.exports = function resolveOptions(screenstoryConfig, options) {
    var config = screenstoryConfig.env || {};
    Object.keys(config).forEach(function (key) {
        if (typeof config[key] === "string") {
            // only copy first level properties
            if (!(key in options)) {
                options[key] = config[key];
            }
        }
    });

    // parse special options
    if (options.resolution && typeof options.resolution === 'string') {
        options.resolution = parseResolution(options.resolution);
    }

    return options;
};


function parseResolution(resolution) {
    var res = resolution.split('x') || [];

    return {
        width: res[0] ? parseInt(res[0]) : null,
        height: res[1] ? parseInt(res[1]) : null
    };
}
