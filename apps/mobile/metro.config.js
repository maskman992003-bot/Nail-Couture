const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const rnwPath = fs.realpathSync(
  path.resolve(require.resolve('react-native-windows/package.json'), '..'),
);

const expoConfig = getDefaultConfig(projectRoot);

expoConfig.watchFolders = [monorepoRoot];
expoConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
expoConfig.resolver.disableHierarchicalLookup = true;
expoConfig.resolver.extraNodeModules = {
  '@nail-couture/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
};

const windowsConfig = {
  resolver: {
    blockList: [
      new RegExp(`${path.resolve(projectRoot, 'windows').replace(/[/\\]/g, '/')}.*`),
      new RegExp(`${rnwPath.replace(/[/\\]/g, '/')}/build/.*`),
      new RegExp(`${rnwPath.replace(/[/\\]/g, '/')}/target/.*`),
      /.*\.ProjectImports\.zip/,
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

const merged = mergeConfig(expoConfig, windowsConfig);

module.exports = withNativeWind(merged, { input: './global.css' });
