import path from "node:path";
import log from "../../utils/logger.js";
import { WatcherGenericProgram } from "../actions/generic.actions.js";
import { handleTscEmitFile } from "../../utils/functions.js";
import ts from "typescript";
import { readDefaultTsConfig } from "../../libs/typescript.js";
import { BuildProgram } from "../actions/build.actions.js";

export default function (argv: string[]) {
  if (argv.includes("--watch")) {
    let optionsPath: string = "tsconfig.json";

    if (argv.includes("--tsconfig")) {
      optionsPath = argv[argv.indexOf("--tsconfig") + 1]!;
      if (!optionsPath) {
        log.error("Provied a valid tsconfig!");
        process.exit(1);
      }
      optionsPath = path.resolve(optionsPath);
    }

    new WatcherGenericProgram(optionsPath).init(
      undefined,
      (program, compilerOptions) => {
        compilerOptions.noEmit = false;
        compilerOptions.noEmitOnError = false;
        program.emit(void 0, handleTscEmitFile(compilerOptions));
        compilerOptions.noEmit = true;
        compilerOptions.noEmitOnError = true;
      }
    );
  } else {
    let tsConfigPath: string | undefined;
    let options: ts.CompilerOptions;

    if (argv.includes("--tsconfig")) {
      tsConfigPath = argv[argv.indexOf("--tsconfig") + 1];
      options = readDefaultTsConfig(tsConfigPath);
    } else {
      tsConfigPath = path.join(process.cwd(), "tsconfig.json");
      options = readDefaultTsConfig(tsConfigPath);
    }
    new BuildProgram(options["rootNames"] as string[], {
      ...options,
      noEmit: true,
      noEmitOnError: false,
    }).emit();
  }
}
