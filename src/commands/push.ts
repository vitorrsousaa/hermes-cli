import chalk from "chalk";
import { execa, type ExecaError } from "execa";
import ora from "ora";

async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

export async function pushCommand(): Promise<void> {
  const branch = await getCurrentBranch();

  console.log(chalk.bold(`\n  Pushing ${chalk.cyan(branch)} to origin\n`));

  const spinner = ora(`Push origin ${branch}`).start();

  try {
    await execa("git", ["push", "-u", "origin", branch]);
    spinner.succeed(chalk.green(`Pushed ${chalk.cyan(branch)} to origin`));
    console.log(chalk.gray(`  ${branch} → origin/${branch}\n`));
  } catch (err) {
    spinner.fail(chalk.red("Push failed"));
    const execaErr = err as ExecaError;
    const msg = execaErr.stderr || execaErr.stdout || execaErr.message;
    if (msg) {
      console.error(chalk.gray(`  ${String(msg).trim().split("\n").join("\n  ")}`));
    }
    process.exit(1);
  }
}
