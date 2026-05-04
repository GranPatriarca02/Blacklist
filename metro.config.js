// Metro config para Expo SDK 52.
// Habilita la resolución del alias `@/*` definido en tsconfig.json.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Soporte de path aliases (`@/...` -> `src/...`).
// Expo lee tsconfig paths nativamente en SDK >= 51, pero lo dejamos
// explícito para evitar sorpresas en CI o entornos antiguos.
config.resolver.alias = {
  ...(config.resolver.alias ?? {}),
  '@': path.resolve(__dirname, 'src'),
};

module.exports = config;
