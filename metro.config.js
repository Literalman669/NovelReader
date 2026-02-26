const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.transformer.unstable_allowRequireContext = true;

// Zustand ships an ESM build that uses import.meta which Metro can't handle
// as a non-module script. Force the CJS build on web.
const ZUSTAND_CJS = {
  "zustand": path.resolve(__dirname, "node_modules/zustand/index.js"),
  "zustand/vanilla": path.resolve(__dirname, "node_modules/zustand/vanilla.js"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && ZUSTAND_CJS[moduleName]) {
    return { filePath: ZUSTAND_CJS[moduleName], type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
