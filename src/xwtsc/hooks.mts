import { Module } from "node:module";
import ts from "typescript";
import { dirname, extname, resolve as resolvePath, sep } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const options = JSON.parse(process.env["XWTSC_OPTIONS"]!) as ts.CompilerOptions;

interface ModuleType {
  id: string;
  path: string;
  exports: object;
  filename: string;
  loaded: boolean;
  children: string[];
  paths: string[];
  _compile(code: string, filename: string): void;
}

interface Module extends NodeModule {
  _extensions: {
    [key: string]: (module: ModuleType, filename: string) => void;
  };
}

const TypedModule = Module as unknown as Module;

function respectDynamicImport(code: string) {
  const regex = /((?:(require\()["'](\.{1,2}\/){1,}.*\.mts))/g;
  code = code.replace(regex, (match) => {
    return match.replace(/^require/, "import");
  });
  return code;
}

function handleFileTranspilation(module: ModuleType, filename: string) {
  const file = ts.sys.readFile(filename, "utf-8")!;
  const transpile = ts.transpileModule(file, {
    compilerOptions: {
      ...options,
      module: ts.ModuleKind.CommonJS,
    },
  });

  module._compile(respectDynamicImport(transpile["outputText"]), filename);
}

TypedModule._extensions[".ts"] = handleFileTranspilation;
TypedModule._extensions[".cts"] = handleFileTranspilation;

const baseURL = pathToFileURL(`${cwd()}${sep}`).href;

const extensionsRegex = /\.ts$|\.cts$|\.mts$/;

type ResolveContext = {
  conditions: string[];
  importAssertions: Object;
  parentURL: string;
};

type NextResolve = (specifier: string) => Promise<void>;

export async function resolve(
  specifier: string,
  context: ResolveContext,
  nextResolve: NextResolve,
) {
  if (extensionsRegex.test(specifier)) {
    const { parentURL = baseURL } = context;

    return {
      shortCircuit: true,
      url: new URL(specifier, parentURL).href,
    };
  }

  return nextResolve(specifier);
}

type LoadContext = { format: string | undefined; importAssertions: Object };

type NextLoad = (url: string) => Promise<void>;

let format: string;

const ctsRegex = /\.cts$/;
const mtsRegex = /\.mts$/;

export async function load(
  url: string,
  _context: LoadContext,
  nextLoad: NextLoad,
): Promise<
  {
    format: string;
    shortCircuit: boolean;
    source?: string;
  } | void
> {
  if (extensionsRegex.test(url)) {
    if (ctsRegex.test(url)) format = "commonjs";

    if (mtsRegex.test(url)) format = "module";

    if (!format) format = await getPackageType(url) || "commonjs";

    if (format === "commonjs") {
      return {
        format,
        shortCircuit: true,
      };
    }

    const file = ts.sys.readFile(fileURLToPath(url), "utf-8")!;

    const compilerOptions: ts.CompilerOptions = { ...options };

    if (format === "module") {
      compilerOptions.module = ts.ModuleKind.ESNext;
      compilerOptions.target = ts.ScriptTarget.ESNext;
    }

    const transpile = ts.transpileModule(file, {
      compilerOptions,
    });

    return {
      format,
      shortCircuit: true,
      source: transpile["outputText"],
    };
  }

  return nextLoad(url);
}

export function getPackageType(url: string): any {
  const isFilePath = !!extname(url);

  const dir = isFilePath ? dirname(fileURLToPath(url)) : url;

  const packagePath = resolvePath(dir, "package.json");

  const file = ts.sys.readFile(packagePath, "utf-8")!;

  if (!file) return dir.length > 1 && getPackageType(resolvePath(dir, ".."));

  const type = JSON.parse(file).type || "commonjs";

  if (type) return type;

  return dir.length > 1 && getPackageType(resolvePath(dir, ".."));
}
