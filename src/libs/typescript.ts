import ts from "typescript";
import log from "../utils/logger.js";
import path from "node:path";
import * as fs from "node:fs/promises";
import {
  changeTsExtInImportsInFile,
  changeTsExtInRequireInfile,
  getJsFilesList,
  minifyTsEmitJsFiles,
} from "../utils/functions.js";
import { getPackageType } from "../loader.js";

export function reportDiagnostic(diagnostic: Readonly<ts.Diagnostic>) {
  reportDiagnostics([diagnostic]);
}

export function reportDiagnostics(diagnostics: ReadonlyArray<ts.Diagnostic>) {
  const diagnosticLength = diagnostics.length;

  if (!diagnosticLength) return;

  if (diagnosticLength === 1) log.error(`Found 1 error.`);
  else log.error(`Found ${diagnostics.length} errors:`);

  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: ts.sys.useCaseSensitiveFileNames
        ? (filename) => filename
        : (filename) => filename.toLowerCase(),
      getNewLine: () => ts.sys.newLine,
    })
  );
}

export function readDefaultTsConfig(
  tsConfigPath = path.join(process.cwd(), "tsconfig.json")
) {
  let compilerOptions: Partial<
    ts.CompilerOptions & { fallbackToTs: (path: string) => boolean }
  > = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    sourceMap: true,
    esModuleInterop: true,
  };

  if (!tsConfigPath) {
    return compilerOptions;
  }

  const fullTsConfigPath = path.resolve(tsConfigPath);

  if (!fs.stat(fullTsConfigPath).catch(() => undefined)) {
    return compilerOptions;
  }

  try {
    const { config } = ts.readConfigFile(fullTsConfigPath, ts.sys.readFile);

    const { options, errors, fileNames } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      path.dirname(fullTsConfigPath)
    );

    if (!errors.length) {
      compilerOptions = options;
      compilerOptions.files = fileNames;
    } else {
      console.info(
        log.error(
          `Convert compiler options from json failed, ${errors
            .map((d) => d.messageText)
            .join("\n")}`
        )
      );
    }
  } catch (e) {
    console.info(
      log.error(`Read ${tsConfigPath} failed: ${(e as Error).message}`)
    );
  }

  return compilerOptions;
}

export async function typeCheckAndEmit(
  fileNames: string[],
  options: ts.CompilerOptions & {
    configFilePath?: string;
  } = readDefaultTsConfig(path.join(process.cwd(), "tsconfig.json"))
) {
  const program = ts.createProgram(fileNames, {
    ...options,
  });

  if (!options.outDir) {
    log.error("Please, in tsconfig provied an 'outDir'");
    process.exit(1);
  }

  const codeToAvoid = [5096];

  program.getCompilerOptions().noEmit = false;
  program.getCompilerOptions().noEmitOnError = true;

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((v) => !codeToAvoid.includes(v.code));

  if (allDiagnostics.length) reportDiagnostics(allDiagnostics);
  else {
    const emitDiagnostics = program.emit().diagnostics;

    if (emitDiagnostics.length) reportDiagnostics(emitDiagnostics);
    else {
      await handlePostTsCompile(program);
    }
  }
}

export async function watchTypeCheckAndEmit(
  tsConfig: ts.CompilerOptions & {
    configFilePath: string;
  }
) {
  try {
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    const host = ts.createWatchCompilerHost(
      tsConfig.configFilePath,
      {},
      ts.sys,
      createProgram,
      undefined,
      function () {},
      {},
      [
        {
          extension: ".cts",
          isMixedContent: false,
        },
        {
          extension: ".mts",
          isMixedContent: false,
        },
      ]
    );

    const origCreateProgram = host.createProgram;
    host.createProgram = (rootNames, options, host, oldProgram) => {
      log.clear();
      return origCreateProgram(rootNames, options, host, oldProgram);
    };

    host.afterProgramCreate = (program) => {
      const p = program.getProgram();
      const allDiagnostics = ts.getPreEmitDiagnostics(p);

      if (allDiagnostics.length) reportDiagnostics(allDiagnostics);
      else {
        log.success("Program is oK!");
        log.info("Compiling program...");

        const compilerOptions = p.getCompilerOptions();
        compilerOptions.noEmitOnError = true;
        compilerOptions.noEmit = false;

        p.emit();

        // Avoid error caused by having allowImportingTsExtensions in true, and noEmit in false
        compilerOptions.noEmit = true;

        handlePostTsCompile(p);
      }
    };

    ts.createWatchProgram(host);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

export async function watchTypeCheckAndEmitFile(
  src: string,
  tsConfig: ts.CompilerOptions & {
    configFilePath: string;
  }
) {
  try {
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    const host = ts.createWatchCompilerHost(
      tsConfig.configFilePath,
      {},
      ts.sys,
      createProgram,
      undefined,
      function () {},
      {},
      [
        {
          extension: ".cts",
          isMixedContent: false,
        },
        {
          extension: ".mts",
          isMixedContent: false,
        },
      ]
    );

    const origCreateProgram = host.createProgram;
    host.createProgram = (rootNames, options, host, oldProgram) => {
      log.clear();
      return origCreateProgram(rootNames, options, host, oldProgram);
    };

    host.afterProgramCreate = (program) => {
      const p = program.getProgram();
      const allDiagnostics = ts.getPreEmitDiagnostics(p);

      if (allDiagnostics.length) reportDiagnostics(allDiagnostics);
      else {
        log.success("Program is oK!");
        log.info("Compiling file...");

        handlePostTsFileCompile(src, p);
      }
    };

    ts.createWatchProgram(host);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

export async function handlePostTsFileCompile(
  src: string,
  program: Pick<ts.Program, "getCompilerOptions">
) {
  const outDir = program.getCompilerOptions().outDir || process.cwd();

  const format = await getPackageType(String(outDir));

  const parse = path.parse(src);

  if (parse.ext === ".js") {
    if (format === "commonjs") await changeTsExtInRequireInfile(src);
    if (format === "module") await changeTsExtInImportsInFile(src);
  } else if (parse.ext === ".mjs") await changeTsExtInImportsInFile(src);
  else if (parse.ext === ".cjs") await changeTsExtInRequireInfile(src);
  if (process.argv.includes("--minify")) await minifyTsEmitJsFiles(src);
}

export async function handlePostTsCompile(
  program: Pick<ts.Program, "getCompilerOptions">
) {
  const outDir = program.getCompilerOptions().outDir || process.cwd();

  const files = await getJsFilesList(String(outDir));
  const format = await getPackageType(String(outDir));

  files.forEach(async (f) => {
    const parse = path.parse(f);
    if (parse.ext === ".js") {
      if (format === "commonjs") await changeTsExtInRequireInfile(f);
      if (format === "module") await changeTsExtInImportsInFile(f);
    } else if (parse.ext === ".mjs") await changeTsExtInImportsInFile(f);
    else if (parse.ext === ".cjs") await changeTsExtInRequireInfile(f);
    if (process.argv.includes("--minify")) await minifyTsEmitJsFiles(f);
  });
}

export function onlyTypeCheck(
  fileNames: string[],
  options: ts.CompilerOptions & {
    configFilePath?: string;
  } = readDefaultTsConfig(path.join(process.cwd(), "tsconfig.json"))
) {
  const program = ts.createProgram(fileNames, {
    ...options,
  });

  program.getCompilerOptions().noEmit = false;
  program.getCompilerOptions().noEmitOnError = true;

  let allDiagnostics = ts.getPreEmitDiagnostics(program);

  if (allDiagnostics.length) {
    reportDiagnostics(allDiagnostics);
    return false;
  } else {
    log.success("The project is oK!");
    return true;
  }
}

export async function watchOnlyTypeCheck(
  tsConfig: ts.CompilerOptions & {
    configFilePath: string;
  }
) {
  try {
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    const host = ts.createWatchCompilerHost(
      tsConfig.configFilePath,
      {},
      ts.sys,
      createProgram,
      undefined,
      function () {},
      {},
      [
        {
          extension: ".cts",
          isMixedContent: false,
        },
        {
          extension: ".mts",
          isMixedContent: false,
        },
      ]
    );

    const origCreateProgram = host.createProgram;
    host.createProgram = (rootNames, options, host, oldProgram) => {
      log.clear();
      return origCreateProgram(rootNames, options, host, oldProgram);
    };

    host.afterProgramCreate = (program) => {
      const p = program.getProgram();
      const allDiagnostics = ts.getPreEmitDiagnostics(p);

      if (allDiagnostics.length) reportDiagnostics(allDiagnostics);
      else {
        log.success("Program is oK!");
      }
    };

    ts.createWatchProgram(host);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
