const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Expo web can resolve zustand's ESM build (middleware.mjs), which uses
// import.meta.env and throws "Cannot use 'import.meta' outside a module" in the browser.
const zustandRoot = path.dirname(require.resolve("zustand/package.json"));
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    const subpath =
      moduleName === "zustand"
        ? "index.js"
        : `${moduleName.slice("zustand/".length)}.js`;
    return {
      type: "sourceFile",
      filePath: path.join(zustandRoot, subpath),
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
