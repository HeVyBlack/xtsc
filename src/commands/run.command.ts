import fs from "node:fs/promises";
import log from "../utils/logger.js";
import {
  runFileWithTypeCheck,
  runFileWithOutTypeCheck,
} from "../actions/run.actions.js";
import path from "node:path";

export default async function (file: string, args: string[]) {
  const filePath = path.isAbsolute(file)
    ? file
    : path.resolve(process.cwd(), file);

  const stat = await fs.stat(String(filePath)).catch(() => undefined);

  if (!stat) {
    log.error(`${file} doesn't exists!`);
    process.exit(1);
  }

  if (!stat.isFile) {
    log.error(`${file} must be a file!`);
    process.exit(1);
  }

  let fileArgs: string[] = [];

  if (args.includes("--args="))
    fileArgs = args.splice(args.indexOf("--args=") + 1);

  if (args.includes("--wTs"))
    runFileWithTypeCheck(filePath as string, fileArgs, args);
  else runFileWithOutTypeCheck(filePath, fileArgs);
}
