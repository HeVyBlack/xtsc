import ts from "typescript";
import { xwtscReportDiagnostics } from "../../libs/typescript.js";
import log from "../../utils/logger.js";

export class WatcherGenericProgram {
  constructor(optionsPath: string) {
    this.configPath = ts.findConfigFile("./", ts.sys.fileExists, optionsPath);

    if (!this.configPath) {
      log.error("Cannot find a valid tsconfig.json!");
      process.exit(1);
    }

    this.host = ts.createWatchCompilerHost(
      this.configPath,
      undefined,
      ts.sys,
      this.createProgram,
      (diagnostic) => {
        xwtscReportDiagnostics([diagnostic]);
        this.diagnostics++;
      }
    );

    this.defaultCreateProgram = this.host.createProgram;
    this.defaultAfterCreateProgram = this.host.afterProgramCreate!;
  }

  configPath: string | undefined;

  createProgram = ts.createSemanticDiagnosticsBuilderProgram;

  diagnostics = 0;

  host: ts.WatchCompilerHostOfConfigFile<ts.SemanticDiagnosticsBuilderProgram>;

  defaultCreateProgram: ts.CreateProgram<ts.SemanticDiagnosticsBuilderProgram>;
  defaultAfterCreateProgram: (program: ts.SemanticDiagnosticsBuilderProgram) => void;

  init = (
    createHook: () => void = () => {},
    afterHook: (
      program: ts.SemanticDiagnosticsBuilderProgram,
      options: ts.CompilerOptions,
      ctx: WatcherGenericProgram
    ) => void = () => {}
  ) => {
    this.host.createProgram = (
      rootNammes,
      options,
      host,
      oldProgram,
      configFileParsingDiagnostics,
      projectReferences
    ) => {
      createHook();
      this.diagnostics = 0;
      return this.defaultCreateProgram(
        rootNammes,
        options,
        host,
        oldProgram,
        configFileParsingDiagnostics,
        projectReferences
      );
    };

    this.host.afterProgramCreate = (program) => {
      const compilerOptions = program.getCompilerOptions();
      compilerOptions.noEmit = true;
      compilerOptions.noEmitOnError = true;
      this.defaultAfterCreateProgram(program);

      if (this.diagnostics === 0) {
        afterHook(program, compilerOptions, this);
      }
    };

    ts.createWatchProgram(this.host);
  };
}
