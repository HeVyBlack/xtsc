import log from "../utils/logger.js";
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildFileWithOutTypeCheck,
  buildWithOutTypeCheck,
  buildWithTypeCheck,
  watchBuildFileWithOutTypeCheck,
  watchBuildWithOutTypeCheck,
} from "../actions/build.action.js";

export default async function (args: string[]) {
  if (!args.includes("--wTs")) {
    const srcDir = args[0];
    const outDir = args[1];
    if (!srcDir) {
      log.error("Provied a source directory!");
      process.exit(1);
    }

    if (!outDir) {
      log.error("Provied a out directory/file!");
      process.exit(1);
    }

    const srcDirPath = path.isAbsolute(srcDir)
      ? srcDir
      : path.resolve(process.cwd(), srcDir);

    const stat = await fs.stat(srcDirPath).catch(() => undefined);

    if (!stat) {
      log.error(`The directory/file ${srcDir} doesn't exist!`);
      process.exit(1);
    }

    const outDirPath = path.isAbsolute(outDir)
      ? outDir
      : path.resolve(process.cwd(), outDir);

    if (!stat.isDirectory()) {
      if (stat.isFile()) {
        if (args.includes("--watch"))
          return watchBuildFileWithOutTypeCheck(srcDirPath, outDirPath);
        return await buildFileWithOutTypeCheck(srcDirPath, outDirPath);
      }
      log.error(`${srcDir} is not a directory!`);
      process.exit(1);
    }

    if (args.includes("--watch")) {
      watchBuildWithOutTypeCheck(srcDirPath, outDirPath);
    } else buildWithOutTypeCheck(srcDirPath, outDirPath);
  } else {
    const tsConfigPath = args.includes("--tsconfig")
      ? args[args.indexOf("--tsconfig") + 1]
      : path.join(process.cwd(), "tsconfig.json");

    if (!tsConfigPath) {
      log.error("Specified the tsconfig path!");
      process.exit(1);
    }

    await buildWithTypeCheck(args);
  }
}
