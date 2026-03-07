const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
  watcher: {
    watchman: {
      deferStates: ['hg.update'],
    },
    healthCheck: {
      enabled: true,
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
