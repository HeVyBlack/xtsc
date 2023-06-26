import { readFile } from "node:fs/promises";
import { dirname, extname, resolve as resolvePath } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import swc from "@swc/core";
import { swcrcModuleJs } from "./utils/variables.js";

const baseURL = pathToFileURL(`${cwd()}/`).href;

const extensionsRegex = /\.ts$|\.cts$|\.mts$/;
const ctsRegex = /\.cts$/;
const mtsRegex = /\.mts$/;

// @ts-ignore
export async function resolve(specifier, context, nextResolve) {
  if (extensionsRegex.test(specifier)) {
    const { parentURL = baseURL } = context;

    return {
      shortCircuit: true,
      url: new URL(specifier, parentURL).href,
    };
  }

  return nextResolve(specifier);
}

// @ts-ignore
export async function load(url, context, nextLoad) {
  if (extensionsRegex.test(url)) {
    let format;

    if (ctsRegex.test(url)) format = "commonjs";
    else if (mtsRegex.test(url)) format = "module";
    else format = await getPackageType(url);

    if (format === "commonjs") {
      return {
        format,
        shortCircuit: true,
      };
    }

    const transformedSource = swc.transformFileSync(
      fileURLToPath(url),
      swcrcModuleJs
    );
    return {
      format,
      shortCircuit: true,
      source: transformedSource.code,
    };
  }

  return nextLoad(url);
}

// @ts-ignore
export async function getPackageType(url: string) {
  const isFilePath = !!extname(url);

  const dir = isFilePath ? dirname(fileURLToPath(url)) : url;

  const packagePath = resolvePath(dir, "package.json");

  const type = await readFile(packagePath, { encoding: "utf8" })
    .then((filestring) => {
      const res = JSON.parse(filestring);
      return res.type || "commonjs";
    })
    .catch((err) => {
      if (err?.code !== "ENOENT") console.error(err);
    });

  if (type) return type;

  return dir.length > 1 && getPackageType(resolvePath(dir, ".."));
}
