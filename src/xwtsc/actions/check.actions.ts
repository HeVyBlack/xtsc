import ts from "typescript";
import { xwtscReportDiagnostics } from "../../libs/typescript.js";

export class CheckProgram {
  rootNames: string[];
  options: ts.CompilerOptions;
  constructor(rootNames: string[], options: ts.CompilerOptions) {
    this.rootNames = rootNames;
    this.options = options;
  }

  check = () => {
    const program = ts.createProgram(this.rootNames, this.options);
    const allDiagnostics = ts.getPreEmitDiagnostics(program);
    xwtscReportDiagnostics(allDiagnostics);
  };
}
