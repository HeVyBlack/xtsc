import ts from "typescript";
import { xwtscReportDiagnostics } from "../../libs/typescript.js";

export class CheckProgram {
  rootFileNames: string[];
  options: ts.CompilerOptions;
  constructor(rootFileNames: string[], options: ts.CompilerOptions) {
    this.rootFileNames = rootFileNames;
    this.options = options;
  }

  check = () => {
    const program = ts.createProgram(this.rootFileNames, this.options);
    const allDiagnostics = ts.getPreEmitDiagnostics(program);
    xwtscReportDiagnostics(allDiagnostics);
  };
}
