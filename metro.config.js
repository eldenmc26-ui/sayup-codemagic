const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);
  
  defaultConfig.resolver.blockList = [
    /[/\\]android[/\\]/,
    /[/\\]ios[/\\]/,
  ].concat(defaultConfig.resolver.blockList || []);

  defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    if (
      moduleName.startsWith('event-target-shim') &&
      context.originModulePath.includes('react-native-webrtc')
    ) {
      const dir = path.dirname(context.originModulePath);
      const eventTargetShimPath = require.resolve(moduleName, { paths: [dir] });
      return { filePath: eventTargetShimPath, type: 'sourceFile' };
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  return defaultConfig;
})();

