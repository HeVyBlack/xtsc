import ts from "typescript";
import esbuild from "esbuild";
import {
  readDefaultTsConfig,
  xwtscReportDiagnostics,
} from "../../libs/typescript.js";
import { WatcherGenericProgram } from "./generic.actions.js";
import { join } from "path";

export const tscPlugin = (options: ts.CompilerOptions): esbuild.Plugin => ({
  name: "tscPlugin",
  setup(build) {
    const { paths, baseUrl = process.cwd() } = options;
    const moduleAliases: {
      multi_files: Record<string, string[]>;
      single_file: Record<string, string>;
    } = {
      multi_files: {},
      single_file: {},
    };
    if (paths) {
      for (const i in paths) {
        if (i.endsWith("/*")) {
          const i_replace = i.replace("/*", "");
          const path_files = paths[i];
          if (path_files) {
            const p_files = [];
            for (const p of path_files) {
              const p_replace = p.replace("/*", "");
              const p_join = join(baseUrl, p_replace);
              p_files.push(p_join);
            }
            moduleAliases.multi_files[i_replace] = p_files;
          }
        } else {
          const path_join = join(baseUrl, paths[i]![0]!);
          moduleAliases.single_file[i] = path_join;
        }
      }
    }

    build.onLoad({ filter: /\.ts$/ }, (args) => {
      const file = ts.sys.readFile(args.path, "utf-8")!;
      const { outputText: transpile } = ts.transpileModule(file, {
        compilerOptions: {
          ...options,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ESNext,
        },
      });
      return {
        contents: transpile,
        loader: "js",
      };
    });

    build.onResolve({ filter: /.*/ }, (args) => {
      const specifier = args.path;
      const extensionsRegex = /\.ts$|\.cts$|\.mts$/;
      if (extensionsRegex.test(args.path)) {
        for (const i in moduleAliases.multi_files) {
          if (specifier.includes(i)) {
            const aliases = moduleAliases.multi_files[i]!;

            for (const a of aliases) {
              const a_replace = specifier.replace(i, a);
              const a_exists = ts.sys.fileExists(a_replace);
              if (a_exists) {
                return {
                  path: a_replace,
                };
              } else continue;
            }
          }
        }
      } else {
        for (const i in moduleAliases.single_file) {
          if (specifier.includes(i)) {
            const alias = moduleAliases.single_file[i];
            if (alias) {
              return { path: alias };
            }
          }
        }
      }

      return;
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
  type: string;
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

  const program = ts.createProgram(options["rootNames"] as string[], options);

  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length === 0)
    bundleTheProject({ options, f_in, f_out, argv, type });
  else xwtscReportDiagnostics(diagnostics);
}
