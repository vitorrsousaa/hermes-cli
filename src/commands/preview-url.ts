import chalk from "chalk";
import { getCurrentBranch } from "../lib/git.js";
import { copyToClipboard } from "../lib/github.js";
import { getPreviewUrl } from "../lib/preview-url.js";

export interface PreviewUrlOptions {
  /** Branch to use (default: current branch) */
  branch?: string;
}

/**
 * Outputs the ephemeral preview URL for the current (or given) branch
 * and copies it to the clipboard. Uses the same sanitization as the
 * deploy-feature-env workflow; if the branch has -stg, the URL uses
 * the name without -stg.
 */
export async function previewUrlCommand(
  options: PreviewUrlOptions = {}
): Promise<void> {
  const branchName = options.branch ?? (await getCurrentBranch());
  const url = getPreviewUrl(branchName);
  await copyToClipboard(url);
  console.log(chalk.green(url));
  console.log(chalk.gray("  Copied to clipboard"));
}
