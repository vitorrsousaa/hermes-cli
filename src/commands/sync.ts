import chalk from "chalk";
import { execa, type ExecaError } from "execa";
import ora from "ora";

const DEFAULT_STG_SUFFIX = "-stg";

async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

async function branchExists(branch: string): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--verify", branch], { reject: false });
    return true;
  } catch {
    return false;
  }
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
    throw err;
  }
}

export async function syncCommand(options: {
  suffix?: string;
  stagingBranch?: string;
}): Promise<void> {
  const suffix = options.suffix ?? DEFAULT_STG_SUFFIX;
  const stagingBranch = options.stagingBranch ?? "staging";

  const current = await getCurrentBranch();

  if (current.endsWith(suffix)) {
    console.error(
      chalk.red(`You're already on the staging branch (${current}). Run this from the main branch.`)
    );
    process.exit(1);
  }

  const stgBranch = `${current}${suffix}`;

  console.log(chalk.bold(`\n  Syncing ${current} → ${stgBranch}\n`));

  try {
    // 1. Push current branch
    await runStep(`Push ${current}`, async () => {
      await execa("git", ["push", "origin", current]);
    });

    // 2. Fetch to get latest remote state
    await runStep("Fetch remote", async () => {
      await execa("git", ["fetch", "origin"]);
    });

    // 3. Checkout or create -stg branch
    const remoteStg = `origin/${stgBranch}`;
    const stgExistsRemote = await branchExists(remoteStg);
    const stgExistsLocal = await branchExists(stgBranch);

    if (stgExistsRemote || stgExistsLocal) {
      await runStep(`Checkout ${stgBranch}`, async () => {
        if (stgExistsLocal) {
          await execa("git", ["checkout", stgBranch]);
        } else {
          await execa("git", ["checkout", "-b", stgBranch, remoteStg]);
        }
      });

      // 4. Pull -stg (in case there are remote updates)
      await runStep(`Pull ${stgBranch}`, async () => {
        await execa("git", ["pull", "origin", stgBranch]);
      });
    } else {
      await runStep(`Create ${stgBranch}`, async () => {
        await execa("git", ["checkout", "-b", stgBranch]);
      });
    }

    // 5. Merge main branch into -stg
    await runStep(`Merge ${current} into ${stgBranch}`, async () => {
      await execa("git", ["merge", current, "-m", `Merge ${current} into ${stgBranch}`]);
    });

    // 6. Pull staging into -stg
    await runStep(`Pull ${stagingBranch} into ${stgBranch}`, async () => {
      await execa("git", ["pull", "origin", stagingBranch]);
    });

    // 7. Push -stg (use -u to set upstream on first push)
    await runStep(`Push ${stgBranch}`, async () => {
      await execa("git", ["push", "-u", "origin", stgBranch]);
    });

    // 8. Switch back to main branch
    await runStep(`Checkout ${current}`, async () => {
      await execa("git", ["checkout", current]);
    });

    console.log(chalk.green.bold(`\n  Done. ${stgBranch} is synced and pushed.\n`));
  } catch {
    process.exit(1);
  }
}
