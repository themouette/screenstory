// Resolve the current environment configuration from screenstory.yml
//
// Up to now returns the default project configuration
module.exports = function resolveEnvConfiguration(screenstoryConfig) {
    return screenstoryConfig.project;
};
