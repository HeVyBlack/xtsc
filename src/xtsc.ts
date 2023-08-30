#!/usr/bin/env node

process.env["IS_XTSC"] = "true";
import manageCommands from "./commands/manage.commands.js";
import { initRepl } from "./utils/repl.js";

const option = process.argv[2];

if (option) {
  manageCommands(process.argv.slice(2));
} else initRepl();
