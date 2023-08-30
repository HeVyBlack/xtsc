import ts from "typescript";
import log from "../utils/logger.js";
import path from "node:path";

import {
  changeTsExtInImportsInFile,
  changeTsExtInRequireInfile,
  getJsFilesList,
  getTsFilesList,
  minifyTsEmitJsFiles,
} from "../utils/functions.js";
import { getPackageType } from "../loader.js";

export function reportDiagnostic(diagnostic: Readonly<ts.Diagnostic>) {
  reportDiagnostics([diagnostic]);
}

export function reportDiagnostics(
  diagnostics: ReadonlyArray<ts.Diagnostic>,
  cwd: string = process.cwd()
) {
  const diagnosticLength = diagnostics.length;

  if (!diagnosticLength) return;

  if (diagnosticLength === 1) log.error(`Found 1 error.`);
  else log.error(`Found ${diagnostics.length} errors:`);

  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => cwd,
      getCanonicalFileName: ts.sys.useCaseSensitiveFileNames
        ? (filename) => filename
        : (filename) => filename.toLowerCase(),
      getNewLine: () => ts.sys.newLine,
    })
  );
}

export function xwtscReportDiagnostics(
  diagnostics: ReadonlyArray<ts.Diagnostic>
) {
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
): ts.CompilerOptions {
  let compilerOptions: Partial<
    ts.CompilerOptions & { fallbackToTs: (path: string) => boolean }
  > = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Classic,
    sourceMap: true,
    esModuleInterop: true,
  };

  if (!tsConfigPath) {
    return compilerOptions;
  }

  const fullTsConfigPath = path.resolve(tsConfigPath);

  if (!ts.sys.fileExists(fullTsConfigPath)) {
    return {
      ...compilerOptions,
      rootNames: getTsFilesList(process.cwd()),
    } as unknown as ts.CompilerOptions;
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
      compilerOptions["rootNames"] = fileNames;
      compilerOptions["configFilePath"] = fullTsConfigPath;
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
  rootNames: string[],
  options: ts.CompilerOptions & {
    configFilePath?: string;
  } = readDefaultTsConfig(path.join(process.cwd(), "tsconfig.json"))
) {
  const program = ts.createProgram(rootNames, {
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
  rootnames: string[],
  options: ts.CompilerOptions & {
    configFilePath?: string;
  } = readDefaultTsConfig(path.join(process.cwd(), "tsconfig.json"))
) {
  const program = ts.createProgram(rootnames, {
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
      tsConfig.configFilePath || path.resolve("tsconfig.json"),
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

function ChangeTsImportVisitor(pathAliases: ts.MapLike<string[]> = {}) {
  function getNewText(string: ts.StringLiteral) {
    // Will search for all the routes. Ej: ./index.ts | ../index.ts
    const isTsImportRgx = /(\.{1,2}\/){1,}.*\.(c|m)?(?:ts)/;
    // Get the text from the specifier
    const text = string.text;

    // Using the regex, will replace all the ts extensions with js extensions
    let new_text = text.replace(isTsImportRgx, (match) => {
      const replace = match.replace(/ts$/, "js");
      return replace;
    });

    /**
     * The next for loop, will be searching for path alias
     * and, will change the .ts extension with .js extension
     * leaving the work of resolve it to tsc-alias
     */

    // Check if the route is a alias
    // Loop through all the pathAliases
    for (const i in pathAliases) {
      // Create a regex expresion with the key
      const i_regex = new RegExp(`^${i}`);
      // Check if the route is a path alias
      if (i_regex.test(new_text)) {
        // change the .ts extension to .js extension
        new_text = new_text.replace(/ts$/, "js");
        break;
      }
    }

    return new_text;
  }

  return function (node: ts.Node): ts.Node {
    if (ts.isImportDeclaration(node)) {
      // Check that the specifier is a stringLiteral
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        // Using the regex, will replace all the ts extensions with js extensions

        const new_text = getNewText(node.moduleSpecifier);
        node.moduleSpecifier.text = new_text;
        return ts.factory.updateImportDeclaration(
          node,
          node.modifiers,
          node.importClause,
          node.moduleSpecifier,
          node.assertClause
        );
      }
    }
    if (ts.isExportDeclaration(node)) {
      if (!node.moduleSpecifier) return node;

      // Check that the specifier is a stringLiteral
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const new_text = getNewText(node.moduleSpecifier);

        node.moduleSpecifier.text = new_text;

        /**
         * Return a new export node, with the new route, but, with all
         * other options comming from the old node
         */
        return ts.factory.updateExportDeclaration(
          node,
          node.modifiers,
          node.isTypeOnly,
          node.exportClause,
          node.moduleSpecifier,
          node.assertClause
        );
      }
    }
    return node;
  };
}

export function ChangeTsImportsTransformer(ctx: ts.TransformationContext) {
  // Get paths alias from compilerOptions
  const pathAliases = ctx.getCompilerOptions().paths;
  return {
    transformSourceFile(sourceFile: ts.SourceFile): ts.SourceFile {
      // Will be like a loop. Each node has certain childs
      // and, with ts.visitEachChild we will do the loop
      // On every lopp, visitor will be called
      return ts.visitEachChild(
        sourceFile,
        ChangeTsImportVisitor(pathAliases),
        ctx
      );
    },
    transformBundle(node: ts.Bundle): ts.Bundle {
      return node;
    },
  };
}

export function ChangeTsImportsTransformerForTransformModule(
  options: ts.CompilerOptions
) {
  const pathAliases = options.paths;
  return function (ctx: ts.TransformationContext) {
    return {
      transformSourceFile(sourceFile: ts.SourceFile): ts.SourceFile {
        // Will be like a loop. Each node has certain childs
        // and, with ts.visitEachChild we will do the loop
        // On every lopp, visitor will be called
        return ts.visitEachChild(
          sourceFile,
          ChangeTsImportVisitor(pathAliases),
          ctx
        );
      },
      transformBundle(node: ts.Bundle): ts.Bundle {
        return node;
      },
    };
  };
}
