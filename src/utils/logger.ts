import chalk from "chalk";

function info(message: string) {
  console.info(chalk.cyan("Info:"), message);
}

function error(message: string) {
  console.error(chalk.redBright("Error:"), message);
}

function success(message: string) {
  console.log(chalk.green("Success:"), message);
}

function warning(message: string) {
  console.warn(chalk.yellow("Warning:"), message);
}

function clear() {
  if (!process.argv.includes("--noClear")) console.clear();
}

export default {
  error,
  success,
  info,
  warning,
  clear
};
