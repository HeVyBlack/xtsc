import path from "node:path";
import {
  readDefaultTsConfig,
  typeCheckAndEmit,
  watchTypeCheckAndEmit,
} from "../libs/typescript.js";
import {
  changeTsExtInImportsInCode,
  changeTsExtInRequireInCode,
  getTsFilesList,
} from "../utils/functions.js";
import swc from "@swc/core";
import { getPackageType } from "../loader.js";
import { swcrcCommonJs, swcrcModuleJs } from "../utils/variables.js";
import fs from "node:fs/promises";
import ts from "typescript";
import { pathToFileURL } from "node:url";
import { watch } from "chokidar";
import log from "../utils/logger.js";

export async function buildWithTypeCheck(args: string[]) {
  type TsConfig = ts.CompilerOptions & { configFilePath: string };
  let tsConfig: ts.CompilerOptions & { configFilePath?: string };
  let tsConfigPath;

  if (args.includes("--tsconfig")) {
    tsConfigPath = args[args.indexOf("--tsconfig") + 1];
    tsConfig = readDefaultTsConfig(tsConfigPath);
  } else {
    tsConfigPath = path.join(process.cwd(), "tsconfig.json");
    tsConfig = readDefaultTsConfig(tsConfigPath);
  }

  tsConfig.configFilePath = String(tsConfigPath);

  if (args.includes("--watch"))
    return await watchTypeCheckAndEmit(tsConfig as TsConfig);

  await typeCheckAndEmit(tsConfig.files as string[], tsConfig);
}

export async function buildWithOutTypeCheck(src: string, out: string) {
  const files = await getTsFilesList(src);

  const format = await getPackageType(src);
  log.info("Building...");
  files.forEach(async (f) => {
    const parse = path.parse(f);
    if (!parse.base.endsWith(".d.ts")) {
      let transform;
      try {
        if (parse.ext === ".ts") {
          if (format === "commonjs") {
            transform = swc.transformFileSync(f, swcrcCommonJs);
            transform.code = changeTsExtInRequireInCode(transform.code);
          }
          if (format === "module") {
            transform = swc.transformFileSync(f, swcrcModuleJs);
            transform.code = changeTsExtInImportsInCode(transform.code);
          }
        } else if (parse.ext === ".cts") {
          transform = swc.transformFileSync(f, swcrcCommonJs);
          transform.code = changeTsExtInRequireInCode(transform.code);
        } else if (parse.ext === ".mts") {
          transform = swc.transformFileSync(f, swcrcModuleJs);
          transform.code = changeTsExtInImportsInCode(transform.code);
        }
      } catch (e: unknown) {
        type CError = { message: string };
        if ("message" in (e as CError))
          log.error((e as CError).message as string);
        else {
          console.error(e);
          process.exit(1);
        }
      }

      if (transform) {
        const split = f.split(src)[1];
        const newPath = path.join(out, String(split));
        const parseNewPath = path.parse(newPath);
        await fs.mkdir(parseNewPath.dir, { recursive: true }).catch(() => {});
        saveSwcOutPut(transform, newPath);
      }
    }
  });
  log.info("Build has finish");
}

export async function watchBuildWithOutTypeCheck(src: string, out: string) {
  const watcher = watch(
    [
      `${src}/**/*.ts`,
      `${src}/**/*.mts`,
      `${src}/**/*.cts`,
      `${src}/**/*.json`,
    ],
    {
      ignored: /node_modules/,
    }
  );

  watcher.on("ready", async () => {
    watcher.on("all", async () => {
      log.clear();
      await buildWithOutTypeCheck(src, out);
      log.info("Watching for changes...");
    });
    log.clear();
    await buildWithOutTypeCheck(src, out);
    log.info("Watching for changes...");
  });
}

export async function buildFileWithOutTypeCheck(src: string, out: string) {
  const format = await getPackageType(pathToFileURL(src).host);
  const parse = path.parse(src);
  log.info("Building file...");
  if (!parse.base.endsWith(".d.ts")) {
    let transform;
    if (parse.ext === ".ts") {
      if (format === "commonjs") {
        transform = swc.transformFileSync(src, swcrcCommonJs);
        transform.code = changeTsExtInRequireInCode(transform.code);
      }
      if (format === "module") {
        transform = swc.transformFileSync(src, swcrcModuleJs);
        transform.code = changeTsExtInImportsInCode(transform.code);
      }
    } else if (parse.ext === ".cts") {
      transform = swc.transformFileSync(src, swcrcCommonJs);
      transform.code = changeTsExtInRequireInCode(transform.code);
    } else if (parse.ext === ".mts") {
      transform = swc.transformFileSync(src, swcrcModuleJs);
      transform.code = changeTsExtInImportsInCode(transform.code);
    }

    if (transform) {
      const split = src.split(src)[1];
      const newPath = path.join(out, String(split));
      const parseNewPath = path.parse(newPath);
      await fs.mkdir(parseNewPath.dir, { recursive: true }).catch(() => {});
      saveSwcOutPut(transform, newPath);
      log.success("File builded");
    }
  }
}

export function watchBuildFileWithOutTypeCheck(src: string, out: string) {
  const watcher = watch(src, { ignored: /node_modules/ });
  watcher.on("ready", async () => {
    watcher.on("all", async () => {
      log.clear();
      await buildFileWithOutTypeCheck(src, out);
      log.info("Watching for changes...");
    });
    log.clear();
    await buildFileWithOutTypeCheck(src, out);
    log.info("Watching for changes...");
  });
}

function saveSwcOutPut({ code, map }: swc.Output, out: string) {
  if (out.endsWith(".ts")) out = out.replace(/\.ts$/, ".js");
  if (out.endsWith(".mts")) out = out.replace(/\.mts$/, ".cjs");
  if (out.endsWith(".cts")) out = out.replace(/\.cts$/, ".mjs");

  if (map) {
    const mapPath = out + ".map";
    const mapName = path.parse(mapPath).base;
    fs.writeFile(mapPath, map);
    code += `\n//# sourceMappingURL=${mapName}\n`;
  }

  fs.writeFile(out, code);
}
