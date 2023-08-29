import ts from "typescript";
import {
  readDefaultTsConfig,
  xwtscReportDiagnostics,
} from "../../libs/typescript.js";
import child from "../child.js";

export default function (
  optionsPath: string,
  f_in: string,
  fileArgvs: string[]
) {
  const options: ts.CompilerOptions = readDefaultTsConfig(optionsPath);

  const program = ts.createProgram(options["rootNames"] as string[], options);

  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length === 0) child(f_in, options, fileArgvs);
  else xwtscReportDiagnostics(diagnostics);
}
