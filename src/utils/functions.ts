import { ChildProcess } from "child_process";
import fs from "fs/promises";
import path from "node:path";
import swc from "@swc/core";
import ts from "typescript";
import log from "./logger.js";

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

export function changeTsExtInText(text: string) {
  const regex =
    /((?:((import|require)(\s|\()|(from\s))["'](\.{1,2}\/){1,}.*\.(c|m)?)(?:ts))/g;
  const new_text = text.replace(regex, (match) => {
    return match.replace(/ts$/, "js");
  });
  return new_text;
}

export const handleTscEmitFile = (options: ts.CompilerOptions) =>
  function (
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
        });
        new_text = changeTsExtInText(new_text);

        ts.sys.writeFile(fileName, new_text, writeByteOrderMark);
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
        });

        new_text = changeTsExtInText(new_text);

        ts.sys.writeFile(fileName, new_text, writeByteOrderMark);
        break;
      }
      case ".js": {
        let new_text = respectDynamicImport(text);
        new_text = changeTsExtInText(new_text);

        ts.sys.writeFile(fileName, new_text, writeByteOrderMark);
        break;
      }
      default:
        ts.sys.writeFile(fileName, text, writeByteOrderMark);
        break;
    }
  };

export async function getTsFilesList(dir: string) {
  const extensionsRegex = /\.ts$|\.cts$|\.mts$/;
  let files: string[] = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory() && item.name !== "node_modules") {
      const res = await getTsFilesList(path.join(dir, item.name));
      res.forEach((f) => files.push(f));
    } else {
      if (extensionsRegex.test(path.extname(item.name)))
        files.push(path.join(dir, item.name));
    }
  }
  return files;
}

export async function getJsFilesList(dir: string) {
  const extensionsRegex = /\.js$|\.cjs$|\.mjs$/;
  let files: string[] = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory() && item.name !== "node_modules") {
      const res = await getJsFilesList(path.join(dir, item.name));
      res.forEach((f) => files.push(f));
    } else {
      if (extensionsRegex.test(path.extname(item.name)))
        files.push(path.join(dir, item.name));
    }
  }
  return files;
}

const regexFrom = /from\s*(['"])(.*?\.(?:ts|mts|cts))\1;/g;

const regexImport = /import\s*(['"])(.*?\.(?:ts|mts|cts))\1;/g;

const regexDynamicImport = /import\s*\(\s*(['"])(.*?\.(?:ts|mts|cts))\1\s*\)/g;

const regexRequire = /require\s*\(\s*(['"])(.*?\.(?:ts|mts|cts))\1\s*\)/g;

export function replaceTsExtensionsFromRegex(
  match: string,
  _: string,
  p2: string
) {
  if (p2) {
    if (p2.endsWith(".ts")) {
      const res = p2.replace(/\.ts$/, ".js");
      return match.replace(p2, res);
    } else if (p2.endsWith(".mts")) {
      const res = p2.replace(/\.mts$/, ".mjs");
      return match.replace(p2, res);
    } else if (p2.endsWith(".cts")) {
      const res = p2.replace(/\.cts$/, ".cjs");
      return match.replace(p2, res);
    } else {
      return match;
    }
  }
  return;
}

export async function changeTsExtInImportsInFile(file: string) {
  const code = await fs.readFile(file, { encoding: "utf-8" });
  const newCode = code
    // @ts-ignore
    .replace(regexFrom, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexImport, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexDynamicImport, replaceTsExtensionsFromRegex);

  await fs.writeFile(file, newCode);
}

export async function changeTsExtInRequireInfile(file: string) {
  const code = await fs.readFile(file, { encoding: "utf-8" });

  const newCode = code
    // @ts-ignore
    .replace(regexRequire, replaceTsExtensionsFromRegex)
    // @ts-ignore
    .replace(regexDynamicImport, replaceTsExtensionsFromRegex);

  await fs.writeFile(file, newCode);
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
  const code = await fs.readFile(src, { encoding: "utf-8" });
  const minify = await swc.minify(code, {
    ecma: 2022,
  });
  const mapPath = src + ".map";
  if (await fs.stat(mapPath).catch(() => undefined)) {
    const mapName = path.basename(mapPath);
    minify.code += `\n//# sourceMappingURL=${mapName}\n`;
  }
  await fs.writeFile(src, minify.code);
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
