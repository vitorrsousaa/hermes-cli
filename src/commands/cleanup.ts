import chalk from "chalk";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { getCurrentBranch } from "../lib/git.js";
import { triggerWorkflow, copyToClipboard } from "../lib/github.js";
import { DEFAULTS } from "../lib/defaults.js";
import { withSpinner } from "../lib/spinner.js";

export interface CleanupOptions {
  /** Branch name to clean up (default: current branch) */
  branch?: string;
}

export async function cleanupCommand(options: CleanupOptions = {}): Promise<void> {
  await checkPrerequisites(["gh"]);

  const branchName = options.branch ?? (await getCurrentBranch());

  const { url } = await withSpinner(
    `Cleaning up ephemeral namespace for ${chalk.cyan(branchName)}...`,
    () =>
      triggerWorkflow(
        DEFAULTS.github.cleanupWorkflow,
        { branch_name: branchName },
        { ref: "main", repo: DEFAULTS.github.repo }
      )
  );

  await copyToClipboard(url);
  console.log(chalk.green("\n✓ Cleanup Stale FE Namespaces workflow triggered."));
  console.log(chalk.gray(`  ${url}`));
  console.log(chalk.gray("  Copied to clipboard\n"));
}
