import chalk from "chalk";
import { copyToClipboard } from "../lib/github.js";
import { getCurrentBranch } from "../lib/git.js";

export async function copybCommand(options: {
  stg?: boolean;
  copy?: boolean;
}): Promise<void> {
  let branch = await getCurrentBranch();
  const isStgBranch = branch.endsWith("-stg");

  if (options.stg && !isStgBranch) {
    branch = `${branch}-stg`;
  } else if (!options.stg && isStgBranch) {
    branch = branch.slice(0, -4);
  }

  // Copy by default; --no-copy disables it
  if (options.copy !== false) {
    await copyToClipboard(branch);
    console.log(chalk.green(branch));
    console.log(chalk.gray("  Copied to clipboard"));
  } else {
    console.log(branch);
  }
}
