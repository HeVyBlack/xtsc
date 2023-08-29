import path from "path";
import { readDefaultTsConfig } from "../../libs/typescript.js";
import log from "../../utils/logger.js";
import { CheckProgram } from "../actions/check.actions.js";
import { WatcherGenericProgram } from "../actions/generic.actions.js";

export default function (argv: string[]) {
  const options = readDefaultTsConfig();
  let optionsPath: string = "tsconfig.json";

  if (argv.includes("--tsconfig")) {
    optionsPath = argv[argv.indexOf("--tsconfig") + 1]!;
    if (!optionsPath) {
      log.error("Provied a valid tsconfig!");
      process.exit(1);
    }
    optionsPath = path.resolve(optionsPath);
  }

  if (argv.includes("--watch")) {
    new WatcherGenericProgram(optionsPath).init();
  } else new CheckProgram(options["rootNames"] as string[], options).check();
}
