import { checkProject, watchCheckProject } from "../actions/check.action.js";

export default async function (args: string[]) {
  if (args.includes("--watch")) watchCheckProject(args);
  else checkProject(args);
}
