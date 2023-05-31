import { spawn } from "node:child_process";
import { loaderPath, requirePath } from "./utils/variables.js";

export default function (file: string, fileArgs?: string[]) {
  let args = [];

  if (file) args.push(file.toString());

  if (fileArgs) args = args.concat(fileArgs);

  return spawn(
    process.execPath,
    [
      "--no-warnings",
      `--require=${requirePath}`,
      `--loader=${loaderPath}`,
      ...args,
    ],
    {
      stdio: "inherit",
    }
  );
}
