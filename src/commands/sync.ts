import chalk from "chalk";
import { execa, type ExecaError } from "execa";
import ora from "ora";
import { getCurrentBranch, branchExists } from "../lib/git.js";

const DEFAULT_STG_SUFFIX = "-stg";

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
  const isOnStg = current.endsWith(suffix);

  const mainBranch = isOnStg ? current.slice(0, -suffix.length) : current;
  const stgBranch = isOnStg ? current : `${current}${suffix}`;

  console.log(chalk.bold(`\n  Syncing ${mainBranch} → ${stgBranch}\n`));

  try {
    // 1. Push main branch
    await runStep(`Push ${mainBranch}`, async () => {
      await execa("git", ["push", "origin", mainBranch]);
    });

    // 2. Fetch to get latest remote state
    await runStep("Fetch remote", async () => {
      await execa("git", ["fetch", "origin"]);
    });

    // 3. Checkout or create -stg branch (skip if already on it)
    const remoteStg = `origin/${stgBranch}`;
    const stgExistsRemote = await branchExists(remoteStg);
    const stgExistsLocal = await branchExists(stgBranch);

    if (!isOnStg) {
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
          await execa("git", ["pull", "--no-rebase", "origin", stgBranch]);
        });
      } else {
        await runStep(`Create ${stgBranch}`, async () => {
          await execa("git", ["checkout", "-b", stgBranch]);
        });
      }
    } else {
      // Already on -stg: pull updates from remote
      await runStep(`Pull ${stgBranch}`, async () => {
        await execa("git", ["pull", "--no-rebase", "origin", stgBranch]);
      });
    }

    // 5. Merge main branch into -stg (brings fix commits)
    await runStep(`Merge ${mainBranch} into ${stgBranch}`, async () => {
      await execa("git", ["merge", mainBranch, "-m", `Merge ${mainBranch} into ${stgBranch}`]);
    });

    // 6. Merge staging into -stg (normal merge, not squash - squash can bring unrelated files from staging's history)
    await runStep(`Merge ${stagingBranch} into ${stgBranch}`, async () => {
      await execa("git", ["merge", `origin/${stagingBranch}`, "-m", `Merge ${stagingBranch} into ${stgBranch}`]);
    });

    // 7. Push -stg (use -u to set upstream on first push)
    await runStep(`Push ${stgBranch}`, async () => {
      await execa("git", ["push", "-u", "origin", stgBranch]);
    });

    // 8. Switch back to main branch (only if we weren't on it)
    if (!isOnStg) {
      await runStep(`Checkout ${mainBranch}`, async () => {
        await execa("git", ["checkout", mainBranch]);
      });
    }

    console.log(chalk.green.bold(`\n  Done. ${stgBranch} is synced and pushed.\n`));
  } catch {
    process.exit(1);
  }
}
