import chalk from "chalk";
import { execa, type ExecaError } from "execa";
import { checkoutBranch, createAndCheckoutBranch } from "../lib/git.js";

export interface CheckoutOptions {
  /** Create new branch (-b): checkout main, pull, then create branch */
  create?: boolean;
}

export async function checkoutCommand(
  branch: string,
  options: CheckoutOptions
): Promise<void> {
  try {
    if (options.create) {
      await execa("git", ["checkout", "main"]);
      await execa("git", ["pull", "origin", "main", "--ff-only"]);
      await createAndCheckoutBranch(branch);
      console.log(chalk.green(`✓ Created and checked out branch ${chalk.bold(branch)} (from main)`));
    } else {
      await checkoutBranch(branch);
      console.log(chalk.green(`✓ Checked out branch ${chalk.bold(branch)}`));
    }
  } catch (err) {
    const execaErr = err as ExecaError;
    const msg = execaErr.stderr || execaErr.stdout || execaErr.message;
    if (msg) {
      console.error(chalk.red(String(msg).trim().split("\n").join("\n  ")));
    }
    process.exit(1);
  }
}
