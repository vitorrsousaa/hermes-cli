import chalk from "chalk";
import { loadContext } from "../lib/context.js";
import { DEFAULTS } from "../lib/defaults.js";
import { copyToClipboard } from "../lib/github.js";
import { updateIssueStatus } from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { withSpinner } from "../lib/spinner.js";
import { triggerDeployFeatureWorkflow } from "./deploy.js";

export async function testCommand(): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);
  const context = await loadContext();
  const { ticketId, branch } = context;

  const { url: runUrl } = await withSpinner(
    "Triggering ephemeral environment...",
    () =>
      triggerDeployFeatureWorkflow({
        branchReact: branch,
        buildCore: false,
        branchCore: "main",
        buildTimesheets: false,
        branchTimesheets: "main",
        enabledSocketio: true,
      })
  );

  await withSpinner("Moving ticket to DEV Testing...", () =>
    updateIssueStatus(ticketId, DEFAULTS.linear.statusDevTesting)
  );

  await copyToClipboard(runUrl);
  console.log(chalk.green("\n✓ Workflow triggered"));
  console.log(chalk.gray(`  ${runUrl}`));
  console.log(chalk.gray("  Copied to clipboard\n"));
}
