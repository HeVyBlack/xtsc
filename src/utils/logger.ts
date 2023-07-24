import chalk from "chalk";

const log = {
  info(message: string) {
    console.info(chalk.cyan("Info:"), message);
  },
  error(message: string) {
    console.error(chalk.redBright("Error:"), message);
  },
  success(message: string) {
    console.log(chalk.green("Success:"), message);
  },
  warning(message: string) {
    console.warn(chalk.yellow("Warning:"), message);
  },
  clear() {
    if (!process.argv.includes("--noClear")) console.clear();
  },
};

export default log;
