import ts from "typescript";
import { xwtscReportDiagnostics } from "../../libs/typescript.js";
import { handleTscEmitFile } from "../../utils/functions.js";

export class BuildProgram {
  currentDirectoryFiles: string[] = [];

  options: ts.CompilerOptions;

  program: ts.Program;

  constructor(currentDirectoryFiles: string[], options: ts.CompilerOptions) {
    this.currentDirectoryFiles = currentDirectoryFiles;
    this.options = options;
    this.program = ts.createProgram(this.currentDirectoryFiles, options);
  }

  emit = () => {
    const allDiagnostics = ts.getPreEmitDiagnostics(this.program);

    if (allDiagnostics.length > 0) {
      xwtscReportDiagnostics(allDiagnostics);
    } else {
      const compilerOptions = this.program.getCompilerOptions();
      compilerOptions.noEmit = false;
      compilerOptions.noEmitOnError = false;
      this.program.emit(
        undefined,
        handleTscEmitFile(this.options),
        undefined,
        undefined,
        {}
      );
    }
  };
}
