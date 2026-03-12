import chalk from "chalk";
import { execa, type ExecaError } from "execa";
import ora from "ora";

export async function mainCommand(): Promise<void> {
  const spinner = ora("Checkout main").start();

  try {
    await execa("git", ["checkout", "main"]);
    spinner.succeed(chalk.green("Checked out main"));

    const pullSpinner = ora("Pull origin main (ff-only)").start();
    await execa("git", ["pull", "origin", "main", "--ff-only"]);
    pullSpinner.succeed(chalk.green("Pulled origin main"));
    console.log(chalk.gray("\n  main is up to date.\n"));
  } catch (err) {
    spinner.fail();
    const execaErr = err as ExecaError;
    const msg = execaErr.stderr || execaErr.stdout || execaErr.message;
    if (msg) {
      console.error(chalk.red(String(msg).trim().split("\n").join("\n  ")));
    }
    process.exit(1);
  }
}
