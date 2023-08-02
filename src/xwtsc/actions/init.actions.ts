import path from "path";
import ts from "typescript";
import log from "../../utils/logger.js";
import { tsConfigBasic } from "../../utils/variables.js";

export default function (cwd: string) {
  const tsConfigPath = path.join(cwd, "tsconfig.json");

  const exists = ts.sys.fileExists(tsConfigPath);

  if (!exists) {
    log.info("Creating a tsconfig.json file...");
    const tsConfig = tsConfigBasic;

    ts.sys.writeFile(
      tsConfigPath,
      JSON.stringify({ compilerOptions: tsConfig }, null, 2)
    );

    log.success("tsconfig.json created!");
  } else {
    log.warning("tsconfig.json file already exists!");
    process.exit(0);
  }
}
