import path from "path";
import spawnChild from "../child.js";
import { onlyTypeCheck, readDefaultTsConfig } from "../libs/typescript.js";
import { handleOnExitMainProcess } from "../utils/functions.js";
import log from "../utils/logger.js";

export function runFileWithTypeCheck(
  file: string,
  fileArgs: string[],
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
    const child = spawnChild(file, fileArgs);
    child.on("spawn", () => {
      log.info("Initializing program...");
    });
    child.on("close", () => {
      log.info("Closing the program...");
    });
    handleOnExitMainProcess(child);
  }
}

export function runFileWithOutTypeCheck(file: string, args: string[]) {
  const child = spawnChild(file, args);
  child.on("spawn", () => {
    log.info("Initializing program...");
  });
  child.on("close", () => {
    log.info("Closing the program...");
  });

  handleOnExitMainProcess(child);
}
