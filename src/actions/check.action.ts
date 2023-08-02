import path from "node:path";
import {
  onlyTypeCheck,
  readDefaultTsConfig,
  watchOnlyTypeCheck,
} from "../libs/typescript.js";
import log from "../utils/logger.js";
import { CompilerOptions } from "typescript";

export function checkProject(args: string[]) {
  let tsConfigPath: string;
  let tsConfig;
  if (args.includes("--tsconfig")) {
    tsConfigPath = args[args.indexOf("--tsconfig") + 1] as string;
    tsConfig = readDefaultTsConfig(tsConfigPath);
    args = args.filter((a) => a !== "--tsconfig" && a !== tsConfigPath);
  } else {
    tsConfigPath = path.join(process.cwd(), "tsconfig.json");
    tsConfig = readDefaultTsConfig(tsConfigPath);
  }

  tsConfig.configFilePath = tsConfigPath;

  onlyTypeCheck(tsConfig.rootNames as string[], tsConfig);
}

export function watchCheckProject(args: string[]) {
  let tsConfigPath: string;
  let tsConfig;
  if (args.includes("--tsconfig")) {
    tsConfigPath = args[args.indexOf("--tsconfig") + 1] as string;
    tsConfig = readDefaultTsConfig(tsConfigPath);
    args = args.filter((a) => a !== "--tsconfig" && a !== tsConfigPath);
  } else {
    tsConfigPath = path.join(process.cwd(), "tsconfig.json");
    tsConfig = readDefaultTsConfig(tsConfigPath);
  }

  tsConfig.configFilePath = tsConfigPath;

  log.info("Watching for changes...");
  watchOnlyTypeCheck(tsConfig as CompilerOptions & { configFilePath: string });
}
