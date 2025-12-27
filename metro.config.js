const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

// Fix for "JSC-safe format" error when using tunnel in Codespaces
config.server = {
    ...config.server,
    rewriteRequestUrl: (url) => {
        if (url.startsWith('/?')) {
            return url.replace('/?', '/index.bundle?');
        }
        return url;
    },
    // Ensure proper hostname for Codespaces
    enhanceMiddleware: (middleware) => {
        return (req, res, next) => {
            // Allow CORS for Codespaces port forwarding
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            return middleware(req, res, next);
        };
    },
};

module.exports = config;