#!/usr/bin/env node

process.env["IS_XTSC"] = "true";
import { tscRepl } from "./utils/repl.js";
import buildCommand from "./xwtsc/commands/build.command.js";
import bundleCommand from "./xwtsc/commands/bundle.command.js";
import initActions from "./xwtsc/actions/init.actions.js";
import watchCommand from "./xwtsc/commands/watch.command.js";
import runCommand from "./xwtsc/commands/run.command.js";
import checkCommand from "./xwtsc/commands/check.command.js";

const cwd = process.cwd();

const commands = {
  run(argv: string[]) {
    runCommand(argv, cwd);
  },
  watch(argv: string[]) {
    watchCommand(argv, cwd);
  },
  build(argv: string[]) {
    buildCommand(argv);
  },
  bundle(argv: string[]) {
    bundleCommand(argv, cwd);
  },
  check(argv: string[]) {
    checkCommand(argv);
  },
  init() {
    initActions(cwd);
  },
};

if (process.argv.length === 2) new tscRepl().initRepl();
else {
  const argv = process.argv;

  const command = argv[2]!;
  if (command in commands) {
    const index = command as keyof typeof commands;
    commands[index](argv.slice(1));
  } else commands["run"](argv);
}
