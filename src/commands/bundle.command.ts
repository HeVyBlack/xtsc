import fs from "node:fs/promises";
import log from "../utils/logger.js";
import {
  bundleWithOutTypeCheck,
  bundleWithTypeCheck,
} from "../actions/bundle.action.js";

export default async function (src: string, out: string, args: string[]) {
  const stat = await fs.stat(src).catch(() => undefined);

  if (!stat) {
    log.error(`${src} doen't exist!`);
    process.exit(1);
  }

  if (!stat.isFile()) {
    log.error("Source file must be a file!");
    process.exit(1);
  }

  if (args.includes("--wTs")) await bundleWithTypeCheck(src, out, args);
  else await bundleWithOutTypeCheck(src, out);
}
