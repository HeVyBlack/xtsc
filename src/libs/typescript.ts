import ts from "typescript";
import log from "../utils/logger.js";
import path from "node:path";
import * as fs from "node:fs/promises";
import {
  changeTsExtInImportsInFile,
  changeTsExtInRequireInfile,
  getJsFilesList,
  minifyTsCompOutJsFile,
} from "../utils/functions.js";
import { getPackageType } from "../loader.js";

export function reportDiagnostic(diagnostic: ReadonlyArray<ts.Diagnostic>) {
  const diagnosticLength = diagnostic.length;

  if (!diagnosticLength) return;

  if (diagnosticLength === 1) log.error(`Found ${diagnostic.length} error.`);
  else log.error(`Found ${diagnostic.length} errors:`);

  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostic, {
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

  if (allDiagnostics.length) reportDiagnostic(allDiagnostics);
  else {
    const emitDiagnostics = program.emit().diagnostics;

    if (emitDiagnostics.length) reportDiagnostic(emitDiagnostics);
    else {
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
        if (process.argv.includes("--minify")) await minifyTsCompOutJsFile(f);
      });
    }
  }
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
    reportDiagnostic(allDiagnostics);
    return false;
  } else {
    log.success("The project is oK!");
    return true;
  }
}
