import chalk from "chalk";
import { execa, type ExecaError } from "execa";
import ora from "ora";
import { getCurrentBranch } from "../lib/git.js";

type Target = "main" | "stg";

function resolveBranch(target: Target): string {
  return target === "stg" ? "staging" : "main";
}

async function runStep(label: string, fn: () => Promise<void>): Promise<void> {
  const spinner = ora(label).start();
  try {
    await fn();
    spinner.succeed(chalk.green(label));
  } catch (err) {
    spinner.fail(chalk.red(label));
    const execaErr = err as ExecaError;
    const msg = execaErr.stderr || execaErr.stdout || execaErr.message;
    if (msg) {
      console.error(chalk.gray(`  ${String(msg).trim().split("\n").join("\n  ")}`));
    }
    if (/CONFLICT|merge conflict/i.test(String(msg))) {
      console.error(chalk.yellow("\n  Resolve conflicts manually, then run: git add . && git commit"));
    }
    throw err;
  }
}

export async function updateCommand(options: {
  target?: Target;
}): Promise<void> {
  const target = options.target ?? "main";
  const branch = resolveBranch(target);
  const remoteBranch = `origin/${branch}`;

  console.log(chalk.bold(`\n  Updating branch with ${branch}\n`));

  try {
    await runStep(`Fetch ${branch}`, () =>
      execa("git", ["fetch", "origin", branch])
    );

    await runStep(`Merge ${remoteBranch}`, () =>
      execa("git", ["merge", "--no-commit", "--no-ff", remoteBranch])
    );

    const currentBranch = await getCurrentBranch();
    await runStep(`Commit merge`, () =>
      execa("git", [
        "commit",
        "--no-verify",
        "-m",
        `Merge branch '${branch}' into ${currentBranch}`,
      ])
    );

    console.log(chalk.green.bold(`\n  Done. Branch updated with ${branch}.\n`));
  } catch {
    process.exit(1);
  }
}
