const { getDefaultConfig } = require("@expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro.js");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  return getSentryExpoConfig(__dirname, config);
})();
