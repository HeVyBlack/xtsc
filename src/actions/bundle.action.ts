import esbuild from "esbuild";
import swc from "@swc/core";
import { getPackageType } from "../loader.js";
import { pathToFileURL } from "node:url";
import path from "node:path";
import {
  esbuildConfig,
  swcrcCommonJs,
  swcrcModuleJs,
} from "../utils/variables.js";
import {
  onlyTypeCheck,
  readDefaultTsConfig,
  reportDiagnostics,
} from "../libs/typescript.js";
import { watch } from "chokidar";
import log from "../utils/logger.js";
import ts from "typescript";

export let swcPluginModule = {
  name: "swcPluginModule",
  setup(build: esbuild.PluginBuild) {
    build.onLoad({ filter: /\.ts$|\.cts$|\.mts$/ }, async (args) => {
      try {
        const { code } = await swc.transformFile(args.path, swcrcModuleJs);
        return {
          contents: code,
          loader: "js",
        };
      } catch (e) {
        return {
          contents: "",
          loader: "js",
        };
      }
    });
  },
};

export let swcPluginCommon = {
  name: "swcPluginCommon",
  setup(build: esbuild.PluginBuild) {
    build.onLoad({ filter: /\.ts$|\.cts$|\.mts$/ }, async (args) => {
      try {
        const { code } = await swc.transformFile(args.path, swcrcCommonJs);
        return {
          contents: code,
          loader: "js",
        };
      } catch (e) {
        return {
          contents: "",
          loader: "js",
        };
      }
    });
  },
};

async function bundleForModuleProject(src: string, out: string) {
  await esbuild.build({
    ...esbuildConfig,
    entryPoints: [src],
    outfile: out,
    format: "esm",
  });
}

async function bundleForCommonProject(src: string, out: string) {
  await esbuild.build({
    ...esbuildConfig,
    entryPoints: [src],
    outfile: out,
    format: "cjs",
  });
}

export async function bundleWithTypeCheck(
  src: string,
  out: string,
  args: string[]
) {
  let tsConfigPath;
  let tsConfig;
  if (args.includes("--tsconfig")) {
    tsConfigPath = args[args.indexOf("--tsconfig") + 1];
    tsConfig = readDefaultTsConfig(tsConfigPath);
  } else {
    tsConfigPath = path.join(process.cwd(), "tsconfig.json");
    tsConfig = readDefaultTsConfig(tsConfigPath);
  }

  tsConfig.configFilePath = tsConfigPath;

  const isOk = onlyTypeCheck(tsConfig.files as string[], tsConfig);

  if (isOk) {
    const format = await getPackageType(pathToFileURL(src).href);
    const parse = path.parse(src);

    log.info("Bundling program...");
    if (parse.ext === ".ts") {
      if (format === "module") await bundleForModuleProject(src, out);
      if (format === "commonjs") await bundleForCommonProject(src, out);
    } else if (parse.ext === ".mts") {
      await bundleForModuleProject(src, out);
    } else if (parse.ext === ".cts") {
      await bundleForCommonProject(src, out);
    }
  }
}

export async function bundleWithOutTypeCheck(src: string, out: string) {
  const format = await getPackageType(pathToFileURL(src).href);
  const parse = path.parse(src);

  log.info("Bundling program...");
  if (parse.ext === ".ts") {
    if (format === "module") await bundleForModuleProject(src, out);
    if (format === "commonjs") await bundleForCommonProject(src, out);
  } else if (parse.ext === ".mts") {
    await bundleForModuleProject(src, out);
  } else if (parse.ext === ".cts") {
    await bundleForCommonProject(src, out);
  }
}

export async function watchBundleWithOutTypeCheck(src: string, out: string) {
  const dir = path.parse(src).dir;

  const watcher = watch(
    [
      `${dir}/**/*.ts`,
      `${dir}/**/*.mts`,
      `${dir}/**/*.cts`,
      `${dir}/**/*.json`,
    ],
    {
      ignored: /node_modules/,
    }
  );
  log.info("Watching for changes...");
  watcher.on("ready", () => {
    watcher.on("all", () => {
      bundleWithOutTypeCheck(src, out);
    });
    bundleWithOutTypeCheck(src, out);
  });
}

export async function watchBundleWithTypeCheck(
  src: string,
  out: string,
  args: string[]
) {
  let tsConfigPath;
  let tsConfig;
  if (args.includes("--tsconfig")) {
    tsConfigPath = args[args.indexOf("--tsconfig") + 1];
    tsConfig = readDefaultTsConfig(tsConfigPath);
  } else {
    tsConfigPath = path.join(process.cwd(), "tsconfig.json");
    tsConfig = readDefaultTsConfig(tsConfigPath);
  }

  tsConfig.configFilePath = tsConfigPath;

  try {
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    const host = ts.createWatchCompilerHost(
      tsConfig.configFilePath as string,
      {},
      ts.sys,
      createProgram,
      undefined,
      function () {},
      {},
      [
        {
          extension: ".cts",
          isMixedContent: false,
        },
        {
          extension: ".mts",
          isMixedContent: false,
        },
      ]
    );

    const origCreateProgram = host.createProgram;
    host.createProgram = (rootNames, options, host, oldProgram) => {
      log.clear();
      return origCreateProgram(rootNames, options, host, oldProgram);
    };

    host.afterProgramCreate = (program) => {
      const p = program.getProgram();
      const allDiagnostics = ts.getPreEmitDiagnostics(p);

      if (allDiagnostics.length) reportDiagnostics(allDiagnostics);
      else {
        log.success("Program is oK!");
        log.info("Bundling program...");

        const compilerOptions = p.getCompilerOptions();

        compilerOptions.noEmitOnError = true;
        compilerOptions.noEmit = false;

        // Avoid error caused by having allowImportingTsExtensions in true, and noEmit in false
        compilerOptions.noEmit = true;

        bundleWithOutTypeCheck(src, out);
      }
    };

    ts.createWatchProgram(host);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
