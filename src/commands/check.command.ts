import path from "node:path";
import { onlyTypeCheck, readDefaultTsConfig } from "../libs/typescript.js";

export default async function (args: string[]) {
  let tsConfigPath: string;
  let tsConfig;
  if (args.includes("--tsconfig")) {
    tsConfigPath = args[args.indexOf("--tsconfig") + 1] as string;
    tsConfig = readDefaultTsConfig(tsConfigPath);
    args = args.filter((a) => a !== "--tsconfig" && a !== tsConfigPath);
  } else {
    tsConfigPath = path.join(process.cwd(), "tsconfig.json");
    tsConfig = readDefaultTsConfig(tsConfigPath);
  }

  tsConfig.configFilePath = tsConfigPath;

  onlyTypeCheck(tsConfig.files as string[], tsConfig);
}
