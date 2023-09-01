import swc from "@swc/core";
import { ChildProcess } from "child_process";
import fs from "fs";
import path from "node:path";
import ts from "typescript";
import log from "./logger.js";
import { prepareSingleFileReplaceTscAliasPaths } from "tsc-alias";

export function handleOnExitMainProcess(child: ChildProcess) {
  ["SIGTERM", "SIGINT"].forEach((signal) => {
    process.on(signal, () => {
      if (child) child.kill();
      process.exit(0);
    });
  });
}

export function respectDynamicImport(code: string) {
  const regex = /((?:(require\()["'](\.{1,2}\/){1,}.*\.mts))/g;
  code = code.replace(regex, (match) => {
    return match.replace(/^require/, "import");
  });
  return code;
}

function changeTsExtInText(text: string, paths: ts.MapLike<string[]>) {
  const importsRegex =
    /(?:(import|export)\s.*from\s+['"]([^"']+)["'])|require\s*\(\s*['"]([^'"]+)["']\s*\)/g;

  const relativePath = /^(\/|\.{1,2}\/)/;

  const new_text = text.replace(
    importsRegex,
    (match, _: string, p2: string, p3: string) => {
      const imp = p2 || p3;

      let new_imp = imp;

      for (const p in paths) {
        const p_regex = new RegExp(`^${p}`);
        if (p_regex.test(imp)) new_imp = new_imp.replace(/ts$/, "js");
      }
      if (relativePath.test(imp)) new_imp = new_imp.replace(/ts$/, "js");

      return match.replace(imp, new_imp);
    }
  );

  return new_text;
}

export const handleTscEmitFile = (options: ts.CompilerOptions) => {
  const runFile = prepareSingleFileReplaceTscAliasPaths({
    resolveFullPaths: true,
    configFile: options["configFilePath"] as string,
  });
  const { paths = {} } = options;
  return async function (
    fileName: string,
    text: string,
    writeByteOrderMark: boolean,
    _?: (message: string) => void,
    sourceFiles?: readonly ts.SourceFile[]
  ) {
    const avoidDTsRegex = /\.d\.(c|m)?js$/;

    const ext = avoidDTsRegex.test(fileName) ? "" : path.extname(fileName);

    switch (ext) {
      case ".mjs": {
        if (!sourceFiles) return;
        if (!sourceFiles[0]) return;

        const code = sourceFiles[0].getSourceFile().text;

        let { outputText: new_text } = ts.transpileModule(code, {
          compilerOptions: {
            ...options,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ESNext,
          },
          transformers: {},
        });

        runFile.then((runFile) => {
          new_text = changeTsExtInText(text, paths);
          new_text = runFile({ fileContents: new_text, filePath: fileName });
          ts.sys.writeFile(fileName, new_text, writeByteOrderMark);
        });

        break;
      }
      case ".cjs": {
        if (!sourceFiles) return;
        if (!sourceFiles[0]) return;

        const code = sourceFiles[0].getSourceFile().text;

        let { outputText: new_text } = ts.transpileModule(code, {
          compilerOptions: {
            ...options,
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2017,
          },
          transformers: {},
        });

        runFile.then((runFile) => {
          new_text = changeTsExtInText(text, paths);
          new_text = runFile({ fileContents: new_text, filePath: fileName });
          ts.sys.writeFile(fileName, new_text, writeByteOrderMark);
        });

        break;
      }
      case ".js": {
        let new_text = respectDynamicImport(text);
        runFile.then((runFile) => {
          new_text = changeTsExtInText(text, paths);
          new_text = runFile({ fileContents: new_text, filePath: fileName });
          ts.sys.writeFile(fileName, new_text, writeByteOrderMark);
        });

        break;
      }
      default:
        ts.sys.writeFile(fileName, text, writeByteOrderMark);
        break;
    }
  };
};

export function getTsFilesList(dir: string) {
  const extensionsRegex = /\.ts$|\.cts$|\.mts$/;
  let files: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory() && item.name !== "node_modules") {
      const res = getTsFilesList(path.join(dir, item.name));
      res.forEach((f) => files.push(f));
    } else {
      if (extensionsRegex.test(path.extname(item.name))) {
        files.push(path.join(dir, item.name));
      }
    }
  }
  return files;
}

export async function getJsFilesList(dir: string) {
  const extensionsRegex = /\.js$|\.cjs$|\.mjs$/;
  let files: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory() && item.name !== "node_modules") {
      const res = await getJsFilesList(path.join(dir, item.name));
      res.forEach((f) => files.push(f));
    } else {
      if (extensionsRegex.test(path.extname(item.name))) {
        files.push(path.join(dir, item.name));
      }
    }
  }
  return files;
}

const regexFrom = /from\s*(['"])(.*?\.(?:ts|mts|cts))\1;/g;

const regexImport = /import\s*(['"])(.*?\.(?:ts|mts|cts))\1;/g;

const regexDynamicImport = /import\s*\(\s*(['"])(.*?\.(?:ts|mts|cts))\1\s*\)/g;

const regexRequire = /require\s*\(\s*(['"])(.*?\.(?:ts|mts|cts))\1\s*\)/g;

export async function changeTsExtInImportsInFile(file: string) {
  const code = fs.readFileSync(file, { encoding: "utf-8" });
  const newCode = code
    // @ts-ignore
    .replace(regexFrom, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexImport, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexDynamicImport, replaceTsExtensionsFromRegex);

  fs.writeFileSync(file, newCode);
}

export async function changeTsExtInRequireInfile(file: string) {
  const code = fs.readFileSync(file, { encoding: "utf-8" });

  const newCode = code
    // @ts-ignore
    .replace(regexRequire, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexDynamicImport, replaceTsExtensionsFromRegex);

  fs.writeFileSync(file, newCode);
}

export function changeTsExtInImportsInCode(code: string) {
  const newCode = code
    // @ts-ignore
    .replace(regexFrom, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexImport, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexDynamicImport, replaceTsExtensionsFromRegex);

  return newCode;
}

export function changeTsExtInRequireInCode(code: string) {
  const newCode = code
    // @ts-ignore
    .replace(regexRequire, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexDynamicImport, replaceTsExtensionsFromRegex);

  return newCode;
}

export async function minifyTsEmitJsFiles(src: string) {
  const code = fs.readFileSync(src, { encoding: "utf-8" });
  const minify = await swc.minify(code, {
    ecma: 2022,
  });
  const mapPath = src + ".map";
  if (fs.existsSync(mapPath)) {
    const mapName = path.basename(mapPath);
    minify.code += `\n//# sourceMappingURL=${mapName}\n`;
  }
  fs.writeFileSync(src, minify.code);
}

export function handleFileInArv(
  argv: string[],
  cwd: string
): {
  file: string;
  argvs: string[];
  optionsPath: string;
} {
  let fileName: string;
  const file = argv[0]!;
  if (!path.isAbsolute(file)) {
    fileName = path.join(cwd, file);
  } else fileName = file;

  const found = ts.sys.fileExists(fileName);

  if (!found) {
    log.error("File doesn't exist!");
    process.exit(1);
  }

  const re: { file: string; argvs: string[]; optionsPath: string } = {
    file: fileName,
    argvs: [],
    optionsPath: "tsconfig.json",
  };

  if (argv.includes("--args:")) {
    const index = argv.indexOf("--args:") + 1;
    const fileArgs = argv.slice(index);
    re.argvs = fileArgs;

    argv.splice(index - 1);
  }

  let optionsPath: string = "tsconfig.json";

  if (argv.includes("--tsconfig")) {
    optionsPath = argv[argv.indexOf("--tsconfig") + 1]!;
    if (!optionsPath) {
      log.error("Provied a valid tsconfig!");
      process.exit(1);
    }
    optionsPath = path.resolve(optionsPath);
  }

  re.optionsPath = optionsPath;

  return re;
}
