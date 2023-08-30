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
import { watch } from "chokidar";
import log from "../utils/logger.js";

let swcPluginModule = {
  name: "swcPluginModule",
  setup(build: esbuild.PluginBuild) {
    build.onLoad({ filter: /\.ts$|\.cts$|\.mts$/ }, (args) => {
      try {
        const { code } = swc.transformFileSync(args.path, swcrcModuleJs);
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

let swcPluginCommon = {
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

async function bundleForModuleProject(
  src: string,
  out: string,
  sourcemap: boolean = process.argv.includes("--sourceMaps")
) {
  try {
    await esbuild.build({
      ...esbuildConfig,
      entryPoints: [src],
      outfile: out,
      format: "esm",
      plugins: [swcPluginModule],
      sourcemap,
    });
  } catch (e) {
    throw e;
  }
}

async function bundleForCommonProject(
  src: string,
  out: string,
  sourcemap: boolean = process.argv.includes("--sourceMaps")
) {
  try {
    await esbuild.build({
      ...esbuildConfig,
      entryPoints: [src],
      outfile: out,
      format: "cjs",
      plugins: [swcPluginCommon],
      sourcemap,
    });
  } catch (e) {
    throw e;
  }
}

export async function bundleWithOutTypeCheck(
  src: string,
  out: string,
  sourcemap: boolean = process.argv.includes("--sourceMaps")
) {
  const format = await getPackageType(pathToFileURL(src).href);
  const parse = path.parse(src);

  log.info("Bundling program...");
  try {
    if (parse.ext === ".ts") {
      if (format === "module")
        await bundleForModuleProject(src, out, sourcemap);
      if (format === "commonjs")
        await bundleForCommonProject(src, out, sourcemap);
    } else if (parse.ext === ".mts") {
      await bundleForModuleProject(src, out, sourcemap);
    } else if (parse.ext === ".cts") {
      await bundleForCommonProject(src, out, sourcemap);
    }
    log.info("Bundle has finish");
  } catch {}
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
  watcher.on("ready", async () => {
    watcher.on("all", async () => {
      log.clear();
      await bundleWithOutTypeCheck(src, out);
      log.info("Watching for changes...");
    });
    log.clear();
    await bundleWithOutTypeCheck(src, out);
    log.info("Watching for changes...");
  });
}
