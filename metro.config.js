const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { getDefaultConfig } = require("@expo/metro-config");

const config = getSentryExpoConfig(__dirname);

// Extend the default Expo config with Sentry configuration
const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  ...config,
};
