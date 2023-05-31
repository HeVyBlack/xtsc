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
import { onlyTypeCheck, readDefaultTsConfig } from "../libs/typescript.js";

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

  if (parse.ext === ".ts") {
    if (format === "module") await bundleForModuleProject(src, out);
    if (format === "commonjs") await bundleForCommonProject(src, out);
  } else if (parse.ext === ".mts") {
    await bundleForModuleProject(src, out);
  } else if (parse.ext === ".cts") {
    await bundleForCommonProject(src, out);
  }
}
