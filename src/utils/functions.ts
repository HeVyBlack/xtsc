import { ChildProcess } from "child_process";
import fs from "fs/promises";
import path from "node:path";
import swc from "@swc/core";

export function handleOnExitMainProcess(child: ChildProcess) {
  ["SIGTERM", "SIGINT"].forEach((signal) => {
    process.on(signal, () => {
      if (child) child.kill();
      process.exit(0);
    });
  });
}

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

export async function minifyTsCompOutJsFile(src: string) {
  const code = await fs.readFile(src, { encoding: "utf-8" });
  const minify = await swc.minify(code);
  const mapPath = src + ".map";
  if (await fs.stat(mapPath).catch(() => undefined)) {
    const mapName = path.basename(mapPath);
    minify.code += `\n//# sourceMappingURL=${mapName}\n`;
  }
  await fs.writeFile(src, minify.code);
}
