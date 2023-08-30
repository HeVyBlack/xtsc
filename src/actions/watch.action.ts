import log from "../utils/logger.js";
import { PathLike } from "node:fs";
import path from "node:path";
import { watch } from "chokidar";
import { ChildProcess } from "node:child_process";
import spawnChild from "../child.js";
import { handleOnExitMainProcess } from "../utils/functions.js";

export function watchProjectWithOutTypeCheck(
  file: PathLike,
  fileArgs: string[] = []
) {
  let child: ChildProcess;

  // @ts-ignore
  handleOnExitMainProcess(child);

  function handleOnAnyWatchEvent() {
    log.clear();
    if (child && child.kill) child.kill();
    log.info("Initializing program...");
    if (child) {
      if (child.killed) child = spawnChild(file.toString());
      else {
        child.kill();
        child = spawnChild(file.toString());
      }
    } else child = spawnChild(file.toString(), fileArgs);
  }
  const dir = path.parse(file.toString()).dir;
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

  log.info("Starting watcher...");
  watcher.on("ready", () => {
    watcher.on("all", () => {
      handleOnAnyWatchEvent();
    });
    handleOnAnyWatchEvent();
  });
}
