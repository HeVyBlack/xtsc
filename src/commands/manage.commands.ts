import watchCommand from "./watch.command.js";
import buildCommand from "./build.command.js";
import checkCommand from "./check.command.js";
import bundleCommand from "./bundle.command.js";
import runCommand from "./run.command.js";
import fs from "fs/promises";
import log from "../utils/logger.js";
import path from "path";
import { tsConfigBasic } from "../utils/variables.js";

const commands = {
  bundle: (args: string[]) => {
    const src = args[0];
    const out = args[1];

    if (!src) {
      log.error("Provied a source file!");
      process.exit(1);
    }

    if (!out) {
      log.error("Provied a out file!");
      process.exit(1);
    }

    const srcPath = path.isAbsolute(src)
      ? src
      : path.resolve(process.cwd(), src);

    const outPath = path.isAbsolute(out)
      ? out
      : path.resolve(process.cwd(), out);

    bundleCommand(srcPath, outPath, args.splice(2));
  },
  watch: async (args: string[]) => {
    const file = args[0];

    if (!file) {
      log.error("Provied a source file!");
      process.exit(1);
    }

    await watchCommand(file.toString(), args.slice(1));
  },
  build: async (args: string[]) => {
    await buildCommand(args);
  },
  check: (args: string[]) => {
    checkCommand(args);
  },
  init: async () => {
    const tsConfigPath = path.join(process.cwd(), "tsconfig.json");
    if (!(await fs.stat(tsConfigPath).catch(() => undefined))) {
      log.info("Creating a tsconfig.json file...");
      const tsConfig = tsConfigBasic;

      await fs.writeFile(
        tsConfigPath,
        JSON.stringify({ compilerOptions: tsConfig }, null, 2)
      );

      log.success("tsconfig.json created!");
    } else {
      log.warning("tsconfig.json file already exists!");
      process.exit(0);
    }
  },
  run: async (args: string[]) => {
    const file = args[0];

    if (!file) {
      log.error("Provied a source file!");
      process.exit(1);
    }

    await runCommand(file, args.slice(1));
  },
};

Object.freeze(commands);

export default function (args: string[]) {
  const command = args[0];
  if (!command) throw new Error("An command is needed!");
  if (command in commands) {
    const index = command as keyof typeof commands;
    if (commands[index]) commands[index](args.slice(1));
  } else {
    commands.run(args);
  }
}
