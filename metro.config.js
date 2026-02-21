const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK fix: the `firebase/*` wrapper packages (e.g. firebase/auth)
// re-export from internal `@firebase/*` packages via `export * from '@firebase/auth'`.
// npm hoists @firebase/* to the root node_modules/, but Metro resolves them
// relative to the importing file inside node_modules/firebase/, producing:
//   ENOENT node_modules/firebase/node_modules/@firebase/auth/package.json
//
// Fix: intercept every @firebase/* resolution and resolve from root node_modules.
const rootNodeModules = path.resolve(__dirname, 'node_modules');
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@firebase/')) {
    // Rewrite the resolution context so Metro looks in root node_modules
    const newContext = {
      ...context,
      nodeModulesPaths: [rootNodeModules],
    };
    if (originalResolveRequest) {
      return originalResolveRequest(newContext, moduleName, platform);
    }
    return context.resolveRequest(newContext, moduleName, platform);
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
