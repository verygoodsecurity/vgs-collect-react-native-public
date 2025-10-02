const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Watch root folder
config.watchFolders = [path.resolve(__dirname, '..')];

// 2. Ensure symlinks are followed
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

module.exports = config;