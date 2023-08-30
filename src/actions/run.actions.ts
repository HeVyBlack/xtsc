import spawnChild from "../child.js";
import { handleOnExitMainProcess } from "../utils/functions.js";
import log from "../utils/logger.js";

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
