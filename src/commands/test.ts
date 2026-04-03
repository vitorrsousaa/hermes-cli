import chalk from "chalk";
import { DEFAULTS } from "../lib/defaults.js";
import { copyToClipboard } from "../lib/github.js";
import { getCurrentBranch, stripStgBranchSuffix } from "../lib/git.js";
import { updateIssueStatus, extractIssueIdFromBranch } from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { withSpinner } from "../lib/spinner.js";
import { triggerDeployFeatureWorkflow } from "./deploy.js";

function debug(...args: unknown[]): void {
  if (process.env.HERMES_DEBUG === "1") {
    console.error(chalk.gray("[hermes:debug]"), ...args);
  }
}


function resolveCore(options: TestOptions): { build: boolean; branch: string } {
  const c = options.core;
  if (!c) return { build: false, branch: "main" };
  if (c === true) return { build: true, branch: "main" };
  return { build: true, branch: c };
}

function resolveTimesheets(options: TestOptions): { build: boolean; branch: string } {
  const t = options.timesheets;
  if (!t) return { build: false, branch: "main" };
  if (t === true) return { build: true, branch: "main" };
  return { build: true, branch: t };
}

export interface TestOptions {
  /** Skip triggering ephemeral environment deploy */
  skipDeploy?: boolean;
  /** Build cw-core; optional branch (default: main) */
  core?: boolean | string;
  /** Build cw-ms-timesheets; optional branch (default: main) */
  timesheets?: boolean | string;
}

export async function testCommand(options: TestOptions = {}): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);

  const branch = await getCurrentBranch();
  const branchForEphemeral = stripStgBranchSuffix(branch);
  const ticketId = extractIssueIdFromBranch(branch);
  const { build: buildCore, branch: branchCore } = resolveCore(options);
  const { build: buildTimesheets, branch: branchTimesheets } = resolveTimesheets(options);

  debug(
    "branch:",
    branch,
    "branchForEphemeral:",
    branchForEphemeral,
    "ticketId:",
    ticketId,
    "core:",
    branchCore,
    "timesheets:",
    branchTimesheets
  );

  let runUrl: string | undefined;
  if (!options.skipDeploy) {
    const result = await withSpinner(
      "Triggering ephemeral environment...",
      () =>
        triggerDeployFeatureWorkflow({
          branchReact: branchForEphemeral,
          buildCore,
          branchCore,
          buildTimesheets,
          branchTimesheets,
          enabledSocketio: true,
        })
    );
    runUrl = result.url;
  } else {
    console.log(chalk.gray("\n  Skipping ephemeral environment deploy (--skip-deploy)."));
  }

  if (ticketId) {
    await withSpinner("Moving ticket to DEV Testing...", () =>
      updateIssueStatus(ticketId, DEFAULTS.linear.statusDevTesting)
    );
  } else {
    console.log(chalk.gray("\n  Skipping Linear status update (branch name is not feat/XXX or fix/XXX)."));
  }

  if (runUrl) {
    await copyToClipboard(runUrl);
    console.log(chalk.green("\n✓ Workflow triggered"));
    console.log(chalk.gray(`  ${runUrl}`));
    console.log(chalk.gray("  Copied to clipboard\n"));
  }

}
