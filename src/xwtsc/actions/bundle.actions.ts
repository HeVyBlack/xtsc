import ts from "typescript";
import esbuild from "esbuild";
import {
  readDefaultTsConfig,
  xwtscReportDiagnostics,
} from "../../libs/typescript.js";
import { WatcherGenericProgram } from "./generic.actions.js";

export const tscPlugin = (options: ts.CompilerOptions): esbuild.Plugin => ({
  name: "tscPlugin",
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, (args) => {
      const file = ts.sys.readFile(args.path, "utf-8")!;
      const { outputText: transpile } = ts.transpileModule(file, {
        compilerOptions: options,
      });
      return {
        contents: transpile,
        loader: "js",
      };
    });
  },
});

function bundleTheProject({
  options,
  f_in,
  f_out,
  argv,
  type,
}: {
  options: ts.CompilerOptions;
  f_in: string;
  f_out: string;
  argv: string[];
  type: any;
}) {
  esbuild
    .build({
      entryPoints: [f_in],
      bundle: true,
      outfile: f_out,
      packages: "external",
      platform: "node",
      write: true,
      logLevel: "error",
      keepNames: true,
      minify: argv.includes("--minify"),
      plugins: [tscPlugin(options)],
      format: type == "module" ? "esm" : "cjs",
      sourcemap: options.sourceMap || false,
    })
    .catch(() => {});
}

export function watchBundle({
  argv,
  f_in,
  f_out,
  optionsPath,
  type,
}: {
  optionsPath: string;
  f_in: string;
  f_out: string;
  argv: string[];
  type: string;
}) {
  new WatcherGenericProgram(optionsPath).init(undefined, (_, options) => {
    bundleTheProject({ options, f_in, f_out, argv, type });
  });
}

export function bundleAction({
  optionsPath,
  f_in,
  f_out,
  argv,
  type,
}: {
  optionsPath: string;
  f_in: string;
  f_out: string;
  argv: string[];
  type: any;
}) {
  const options: ts.CompilerOptions = readDefaultTsConfig(optionsPath);

  const program = ts.createProgram(options.fileNames as string[], options);

  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length === 0)
    bundleTheProject({ options, f_in, f_out, argv, type });
  else xwtscReportDiagnostics(diagnostics);
}
