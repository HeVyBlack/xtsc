import { fork } from "node:child_process";
import { tscHooksPath } from "../utils/variables.js";
import { CompilerOptions } from "typescript";

export default function (
  file: string,
  options: CompilerOptions,
  fileArgs: string[] = []
) {
  const child = fork(file, fileArgs, {
    execArgv: ["--no-warnings", `--loader=${tscHooksPath}`],
    env: {
      ...process.env,
      XWTSC_OPTIONS: JSON.stringify(options),
    },
  });

  return child;
}
