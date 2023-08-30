import fs from "node:fs/promises";
import {
  watchProjectWithOutTypeCheck,
} from "../actions/watch.action.js";
import path from "node:path";
import log from "../utils/logger.js";

export default async function (file: string, args: string[]) {
  const filePath = path.isAbsolute(file)
    ? file
    : path.resolve(process.cwd(), file);

  const stat = await fs.stat(filePath).catch(() => undefined);

  if (!stat) {
    log.error(`The file: ${file}, doesn't exist!`);
    process.exit(1);
  }

  if (!stat.isFile()) {
    log.error(`The file: ${file} is not a valid file!`);
    process.exit(1);
  }

  let fileArgs: string[] = [];

  if (args.includes("--args="))
    fileArgs = args.splice(args.indexOf("--args=") + 1);

  watchProjectWithOutTypeCheck(filePath, fileArgs);
}
