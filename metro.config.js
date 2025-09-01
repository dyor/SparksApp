const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable Hermes for web to avoid import.meta issues
config.transformer.hermesParser = false;

module.exports = config;