import { ChildProcess } from "child_process";
import ts from "typescript";
import log from "../../utils/logger.js";
import child from "../child.js";
import { WatcherGenericProgram } from "./generic.actions.js";

export default function (
  optionsPath: string,
  f_in: string,
  fileArgvs: string[]
) {
  let app: ChildProcess;

  function createHook() {
    if (app) app.kill();
  }

  function afterHook(
    _: ts.SemanticDiagnosticsBuilderProgram,
    options: ts.CompilerOptions
  ) {
    if (app) app.kill();
    process.stdout.write("\n");
    log.info("Initializing child...\n");
    app = child(f_in, options, fileArgvs);
  }

  new WatcherGenericProgram(optionsPath).init(createHook, afterHook);
}
