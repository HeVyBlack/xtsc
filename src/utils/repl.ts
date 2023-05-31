import repl from "node:repl";
import swc from "@swc/core";
import { swcrcModuleJs } from "./variables.js";

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
