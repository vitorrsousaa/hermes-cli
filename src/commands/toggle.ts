import chalk from "chalk";
import { execa, type ExecaError } from "execa";

const DEFAULT_STG_SUFFIX = "-stg";

async function getCurrentBranch(): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function toggleCommand(options: {
  suffix?: string;
}): Promise<void> {
  const suffix = options.suffix ?? DEFAULT_STG_SUFFIX;

  const current = await getCurrentBranch();

  if (!current) {
    console.error(chalk.red("Not a valid Git repository."));
    process.exit(1);
  }

  const isStgBranch = current.endsWith(suffix);

  if (isStgBranch) {
    const root = current.slice(0, -suffix.length);
    console.log(chalk.gray(`Switching from ${current} → ${root}`));
    try {
      await execa("git", ["checkout", root]);
    } catch (err) {
      const execaErr = err as ExecaError;
      console.error(chalk.red(`Failed to checkout ${root}`));
      if (execaErr.stderr) {
        console.error(chalk.gray(execaErr.stderr));
      }
      process.exit(1);
    }
  } else {
    const stg = `${current}${suffix}`;
    console.log(chalk.gray(`Switching from ${current} → ${stg}`));
    try {
      await execa("git", ["checkout", stg]);
    } catch (err) {
      const execaErr = err as ExecaError;
      console.error(chalk.red(`Failed to checkout ${stg}`));
      if (execaErr.stderr) {
        console.error(chalk.gray(execaErr.stderr));
      }
      process.exit(1);
    }
  }
}
