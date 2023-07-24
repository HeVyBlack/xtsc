import path from "path";
import log from "../../utils/logger.js";
import ts from "typescript";
import { pathToFileURL } from "url";
import { bundleAction, watchBundle } from "../actions/bundle.actions.js";
import { getPackageType } from "../../loader.js";

function handleBundleFileInArv(
  argv: string[],
  cwd: string
): {
  f_in: string;
  f_out: string;
  optionsPath: string;
} {
  let fileIn: string;
  let aux = argv[2];
  if (!aux) {
    log.error("Provied a source file!");
    process.exit(1);
  }
  if (!path.isAbsolute(aux)) {
    fileIn = path.join(cwd, aux);
  } else fileIn = aux;

  const foundIn = ts.sys.fileExists(fileIn);

  if (!foundIn) {
    log.error("File doesn't exist!");
    process.exit(1);
  }
  let fileOut: string;
  aux = argv[3];
  if (!aux) {
    log.error("Provied a out file!");
    process.exit(1);
  }
  if (!path.isAbsolute(aux)) {
    fileOut = path.join(cwd, aux);
  } else fileOut = aux;

  const re: { f_in: string; f_out: string; optionsPath: string } = {
    f_in: fileIn,
    f_out: fileOut,
    optionsPath: "tsconfig.json",
  };

  let optionsPath: string = "tsconfig.json";

  if (argv.includes("--tsconfig")) {
    optionsPath = argv[argv.indexOf("--tsconfig") + 1]!;
    if (!optionsPath) {
      log.error("Provied a valid tsconfig!");
      process.exit(1);
    }
    optionsPath = path.resolve(optionsPath);
  }

  re.optionsPath = optionsPath;

  return re;
}

export default async function (argv: string[], cwd: string) {
  const options = handleBundleFileInArv(argv, cwd);

  const type = await getPackageType(pathToFileURL(options.f_in).href);

  if (argv.includes("--watch")) {
    watchBundle({ ...options, type, argv });
  } else {
    bundleAction({ ...options, type, argv });
  }
}
