import { Options } from "@swc/core";
import { BuildOptions } from "esbuild";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const tsCompilerOptions = {
  target: "ESNext",
  module: "NodeNext",
  moduleResolution: "NodeNext",
  allowImportingTsExtensions: true,
  noEmit: true,
  strict: true,
  experimentalDecorators: true,
};

export const sourceDir = path.join(path.parse(import.meta.url).dir, "..");

export const platform = os.platform();

export const loaderPath =
  platform === "win32"
    ? path.join(sourceDir, "loader.js")
    : path.join(fileURLToPath(sourceDir), "loader.js");

export const requirePath = path.join(fileURLToPath(sourceDir), "require.cjs");

export const swcrcCommonJs: Options = {
  module: {
    type: "commonjs",
    ignoreDynamic: true,
    strictMode: false,
    importInterop: "swc",
    preserveImportMeta: true,
    strict: true,
    allowTopLevelThis: true,
  },
  jsc: {
    transform: {
      useDefineForClassFields: false,
      decoratorMetadata: true,
      legacyDecorator: true,
    },
    keepClassNames: true,
    preserveAllComments: true,
    target: "esnext",
    experimental: {
      keepImportAssertions: true,
    },
    parser: {
      syntax: "typescript",
      decorators: true,
      dynamicImport: true,
    },
  },
  isModule: "unknown",
  minify: process.argv.includes("--minify"),
  sourceMaps: process.argv.includes("--sourceMaps"),
};

export const swcrcModuleJs: Options = {
  module: {
    type: "nodenext",
    ignoreDynamic: true,
    strictMode: false,
    importInterop: "swc",
    preserveImportMeta: true,
    strict: true,
    allowTopLevelThis: true,
  },
  jsc: {
    transform: {
      useDefineForClassFields: false,
      decoratorMetadata: true,
      legacyDecorator: true,
    },
    keepClassNames: true,
    preserveAllComments: true,
    target: "esnext",
    experimental: {
      keepImportAssertions: true,
    },
    parser: {
      syntax: "typescript",
      decorators: true,
      dynamicImport: true,
    },
  },
  isModule: true,
  minify: process.argv.includes("--minify"),
  sourceMaps: process.argv.includes("--sourceMaps"),
};

export const esbuildConfig: BuildOptions = {
  platform: "node",
  bundle: true,
  packages: "external",
  sourcemap: process.argv.includes("--sourceMaps"),
  minify: process.argv.includes("--minify"),
  write: true,
  logLevel: "error",
  keepNames: true,
};

export const tsConfigBasic = {
  target: "ESNext",
  module: "NodeNext",
  moduleResolution: "NodeNext",
  sourceMap: true,
  esModuleInterop: true,
  allowImportingTsExtensions: true,
  noEmit: true,
  noEmitOnError: true,
};
