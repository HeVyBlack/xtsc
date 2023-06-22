import fs from "node:fs/promises";
import log from "../utils/logger.js";
import {
  bundleWithOutTypeCheck,
  bundleWithTypeCheck,
  watchBundleWithOutTypeCheck,
  watchBundleWithTypeCheck,
} from "../actions/bundle.action.js";

export default async function (src: string, out: string, args: string[]) {
  const stat = await fs.stat(src).catch(() => undefined);

  if (!stat) {
    log.error(`${src} doen't exist!`);
    process.exit(1);
  }

  if (!stat.isFile()) {
    log.error("Source must be a file!");
    process.exit(1);
  }

  if (args.includes("--wTs")) {
    if (args.includes("--watch")) watchBundleWithTypeCheck(src, out, args);
    else await bundleWithTypeCheck(src, out, args);
  } else if (args.includes("--watch"))
    await watchBundleWithOutTypeCheck(src, out);
  else await bundleWithOutTypeCheck(src, out);
}
