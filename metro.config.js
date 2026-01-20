const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable source maps and ts/tsx extensions
config.resolver.sourceExts.push('ts', 'tsx');

// Fix for broken HMRClient import in some versions
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === '@expo/metro/metro-runtime/modules/HMRClient') {
        return {
            filePath: path.resolve(__dirname, 'node_modules/metro-runtime/src/modules/HMRClient.js'),
            type: 'sourceFile',
        };
    }
    // Mock for LogBox on web
    if (moduleName.includes('LogBoxData') || moduleName.includes('parseLogBoxLog')) {
        if (context.originModulePath.includes('LogBox.web.ts')) {
            const mockPath = moduleName.includes('LogBoxData')
                ? 'src/mocks/LogBoxData.ts'
                : 'src/mocks/parseLogBoxLog.ts';
            return {
                filePath: path.resolve(__dirname, mockPath),
                type: 'sourceFile',
            };
        }
    }
    return context.resolveRequest(context, moduleName, platform);
};

// Simple server config with robust URL rewrites to fix JSC-safe error
config.server = {
    ...config.server,
    rewriteRequestUrl: (url) => {
        if (!url) return url;

        // Fix for "empty path" error: 
        // Metro HmrServer crashes if the entry point URL looks like "http://.../?platform=web"
        // We ensure it always has a path.
        if (url.startsWith('/?')) {
            return '/index.bundle' + url.substring(1);
        }

        return url;
    },
    enhanceMiddleware: (middleware) => {
        return (req, res, next) => {
            // Intercept root requests and point them to the proper bundle
            if (req.url === '/' || req.url === '/?platform=web') {
                req.url = '/index.bundle?platform=web&dev=true';
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            return middleware(req, res, next);
        };
    },
};

module.exports = config;
