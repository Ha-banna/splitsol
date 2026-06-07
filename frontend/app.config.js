/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const easProfile = process.env.EAS_BUILD_PROFILE;
const useDevClient =
  process.env.EXPO_USE_DEV_CLIENT === '1' ||
  easProfile === 'development' ||
  easProfile === 'preview';

const plugins = (appJson.expo.plugins ?? []).filter((plugin) => {
  const name = Array.isArray(plugin) ? plugin[0] : plugin;
  return useDevClient || name !== 'expo-dev-client';
});

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
  },
};
