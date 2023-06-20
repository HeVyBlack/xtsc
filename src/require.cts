import { Options } from "@swc/core";

const { Module } = require("node:module");
const swc = require("@swc/core");

interface ModuleType {
  id: string;
  path: string;
  exports: object;
  filename: string;
  loaded: boolean;
  children: string[];
  paths: string[];
  _compile(code: string, filename: string): void;
}

const swcrc: Options = {
  module: {
    type: "commonjs",
    ignoreDynamic: true,
    strictMode: false,
    importInterop: "node",
    preserveImportMeta: true,
    strict: false,
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
    parser: {
      syntax: "typescript",
      decorators: true,
      dynamicImport: true,
    },
  },
  isModule: "unknown",
};

Module._extensions[".ts"] = function (module: ModuleType, filename: string) {
  const { code } = swc.transformFileSync(filename, swcrc);
  module._compile(code, filename);
};

Module._extensions[".cts"] = function (module: ModuleType, filename: string) {
  const { code } = swc.transformFileSync(filename, swcrc);

  module._compile(code, filename);
};
