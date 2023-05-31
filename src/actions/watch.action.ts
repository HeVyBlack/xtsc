import ts from "typescript";
import log from "../utils/logger.js";
import { readDefaultTsConfig, reportDiagnostic } from "../libs/typescript.js";
import { PathLike } from "node:fs";
import path from "node:path";
import { watch } from "chokidar";
import { ChildProcess } from "node:child_process";
import spawnChild from "../child.js";
import { handleOnExitMainProcess } from "../utils/functions.js";

export function watchProjectWithTypeCheck(
  file: PathLike,
  fileArgs: string[] = [],
  args: string[]
) {
  let child: ChildProcess;

  // @ts-ignore
  handleOnExitMainProcess(child);

  try {
    let tsConfig: ts.CompilerOptions & { configFilePath?: string };
    let tsConfigPath;

    if (args.includes("--tsconfig")) {
      tsConfigPath = args[args.indexOf("--tsconfig") + 1];
      tsConfig = readDefaultTsConfig(tsConfigPath);
    } else {
      tsConfigPath = path.join(process.cwd(), "tsconfig.json");
      tsConfig = readDefaultTsConfig(tsConfigPath);
    }

    tsConfig.configFilePath = String(tsConfigPath);

    if (!tsConfigPath) {
      log.error("A valid 'tsconfig.json' is needed!");
      process.exit(1);
    }

    log.info("Starting watcher...");

    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    const host = ts.createWatchCompilerHost(
      tsConfigPath,
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
      if (child && child.kill) child.kill();
      return origCreateProgram(rootNames, options, host, oldProgram);
    };

    host.afterProgramCreate = (program) => {
      const p = program.getProgram();
      const semanticDiagnostics = p.getSemanticDiagnostics();
      const syntacticDiagnostics = p.getSyntacticDiagnostics();

      const allDiagnostics = semanticDiagnostics.concat(syntacticDiagnostics);

      if (allDiagnostics.length) reportDiagnostic(allDiagnostics);
      else {
        log.success("Program is oK!");
        log.info("Initializing program...");
        child = spawnChild(file.toString(), fileArgs);
      }
    };

    ts.createWatchProgram(host);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

export function watchProjectWithOutTypeCheck(
  file: PathLike,
  fileArgs: string[] = []
) {
  let child: ChildProcess;

  // @ts-ignore
  handleOnExitMainProcess(child);

  function handleOnAnyWatchEvent() {
    log.clear();
    if (child && child.kill) child.kill();
    log.info("Initializing program...");
    if (child) {
      if (child.killed) child = spawnChild(file.toString());
      else {
        child.kill();
        child = spawnChild(file.toString());
      }
    } else child = spawnChild(file.toString(), fileArgs);
  }
  const dir = path.parse(file.toString()).dir;
  const watcher = watch(
    [
      `${dir}/**/*.ts`,
      `${dir}/**/*.mts`,
      `${dir}/**/*.cts`,
      `${dir}/**/*.json`,
    ],
    {
      ignored: /node_modules/,
    }
  );

  log.info("Starting watcher...");
  watcher.on("ready", () => {
    watcher.on("all", () => {
      handleOnAnyWatchEvent();
    });
    handleOnAnyWatchEvent();
  });
}
