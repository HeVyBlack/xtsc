import { handleFileInArv } from "../../utils/functions.js";
import watchAction from "../actions/watch.action.js";

export default function (argv: string[], cwd: string) {
  const { file, argvs, optionsPath } = handleFileInArv(argv.slice(2), cwd);

  watchAction(optionsPath, file, argvs);
}
