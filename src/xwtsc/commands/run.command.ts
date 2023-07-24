import { handleFileInArv } from "../../utils/functions.js";
import runActions from "../actions/run.actions.js";

export default function (argv: string[], cwd: string) {
  const { file, argvs, optionsPath } = handleFileInArv(argv.splice(2), cwd);

  runActions(optionsPath, file, argvs);
}
