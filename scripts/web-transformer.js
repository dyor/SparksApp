const metroTransformer = require('@expo/metro-config/babel-transformer');

module.exports.transform = async ({ src, filename, options, ...rest }) => {
    // Only target web platform for this hack
    if (options.platform === 'web') {
        // Replace import.meta with a safe object to avoid syntax errors in non-module context
        // and bypass Hermes's lack of support for it on web.
        if (src.includes('import.meta')) {
            // Use a safe replacement that won't break if accessed
            src = src.replace(/import\.meta/g, '({url:""})');
        }
    }

    return metroTransformer.transform({ src, filename, options, ...rest });
};
