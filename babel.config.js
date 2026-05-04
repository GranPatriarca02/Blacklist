module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated debe ir SIEMPRE al final del array de plugins
      'react-native-reanimated/plugin',
    ],
  };
};
