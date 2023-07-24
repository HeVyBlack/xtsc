import repl from "node:repl";
import swc from "@swc/core";
import { swcrcModuleJs } from "./variables.js";
import ts from "typescript";
import { readDefaultTsConfig, reportDiagnostics } from "../libs/typescript.js";
import path from "node:path";
import vm from "node:vm";

export class tscRepl {
  constructor() {
    const defaultTsConfig = readDefaultTsConfig();

    this.#options = {
      module: ts.ModuleKind.Node16,
      lib: [
        ...(defaultTsConfig.lib ? defaultTsConfig.lib : []),
        "lib.es2021.d.ts",
        "lib.dom.d.ts",
      ],
      target: ts.ScriptTarget.ES2021,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      alwaysStrict: false,
    };
  }

  private cache: {
    fileExist: { [key: string]: boolean };
    readFile: { [key: string]: string };
    getSourceFile: { [key: string]: ts.SourceFile };
  } = {
    fileExist: {},
    readFile: {},
    getSourceFile: {},
  };

  #ctx = "";

  #cwd = process.cwd();

  #options: ts.CompilerOptions;

  #replName = path.join(this.#cwd, "<repl>.ts");

  #typeCheck(code: string) {
    const host = this.#getHost(code);

    const program: ts.Program = ts.createProgram(
      [this.#replName],
      this.#options,
      host
    );

    const allDiagnostics = ts.getPreEmitDiagnostics(program);

    if (allDiagnostics.length > 0) {
      reportDiagnostics(allDiagnostics);
      return false;
    }

    return true;
  }

  #getHost(replCode: string): ts.CompilerHost {
    const defaultHost = ts.createCompilerHost({});

    const replSourceFile = ts.createSourceFile(
      this.#replName,
      replCode,
      ts.ScriptTarget.Latest
    );

    const fileExists = (fileName: string): boolean => {
      if (fileName === this.#replName) return true;
      const index = fileName as keyof (typeof this.cache)["fileExist"];
      if (this.cache["fileExist"][index])
        return this.cache["fileExist"][index]!;
      else {
        const r = defaultHost.fileExists(fileName)!;
        this.cache["fileExist"][index] = r;
        return r;
      }
    };

    const readFile = (fileName: string): string | undefined => {
      if (fileName === this.#replName) return replCode;
      const index = fileName as keyof (typeof this.cache)["readFile"];
      if (this.cache["readFile"][index]) return this.cache["readFile"][index];
      else {
        const r = defaultHost.readFile(fileName)!;
        this.cache["readFile"][index] = r;
        return r;
      }
    };

    const getSourceFile = (
      fileName: string,
      languageVersion: ts.ScriptTarget
    ) => {
      if (fileName === this.#replName) {
        return replSourceFile;
      }
      const index = fileName as keyof (typeof this.cache)["getSourceFile"];
      if (this.cache["getSourceFile"][index]) {
        return this.cache["getSourceFile"][index];
      } else {
        const r = defaultHost.getSourceFile(fileName, languageVersion)!;
        this.cache["getSourceFile"][index] = r;
        return r;
      }
    };

    const host: ts.CompilerHost = {
      ...defaultHost,
      getSourceFile,
      fileExists,
      readFile,
    };

    return host;
  }

  #customEval = (
    cmd: string,
    context: vm.Context,
    filename: string,
    cb: (err: Error | null, result: any) => void
  ) => {
    try {
      const aux = this.#ctx.concat(cmd);
      const isOk = this.#typeCheck(aux);

      if (isOk) {
        this.#ctx = aux;
        const transpile = ts.transpileModule(cmd, {
          compilerOptions: { ...this.#options, module: ts.ModuleKind.CommonJS },
        });

        const result = vm.runInContext(transpile["outputText"], context, {
          filename,
          displayErrors: true,
        });
        cb(null, result);
      } else process.stdout.write("> ");
    } catch (e) {
      //@ts-ignore
      cb(e.message, null);
    }
  };

  initRepl = () => {
    this.#typeCheck(this.#ctx);

    console.log(
      `Welcome to Node.js ${process.version}.\n` +
        'Type ".help" for more information.'
    );

    repl.start({
      ignoreUndefined: true,
      useColors: true,
      eval: this.#customEval,
    });
  };
}

export function initRepl() {
  console.log(
    `Welcome to Node.js ${process.version}.\n` +
      'Type ".help" for more information.'
  );

  const nodeRepl = repl.start();

  const { eval: defaultEval } = nodeRepl;

  // @ts-ignore
  const preEval = async function (code, context, filename, callback) {
    const transformed = await swc
      .transform(code, {
        ...swcrcModuleJs,
        filename,
        isModule: true,
      })
      .catch((error) => {
        console.error(error.message);
        return { code: "\n" };
      });

    return defaultEval.call(
      // @ts-ignore
      this,
      transformed.code,
      context,
      filename,
      callback
    );
  };

  // @ts-ignore
  nodeRepl.eval = preEval;
}
