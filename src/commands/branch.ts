import chalk from "chalk";
import { execa } from "execa";
import { copyToClipboard } from "../lib/github.js";

async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

export async function branchCommand(options: {
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

  if (options.copy) {
    await copyToClipboard(branch);
    console.log(chalk.green(branch));
    console.log(chalk.gray("  Copied to clipboard"));
  } else {
    console.log(branch);
  }
}
