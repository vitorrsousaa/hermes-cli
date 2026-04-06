import chalk from "chalk";
import { DEFAULTS } from "../lib/defaults.js";
import { getCurrentBranch, stripStgBranchSuffix, pushBranch } from "../lib/git.js";
import { copyToClipboard, triggerWorkflow } from "../lib/github.js";
import { checkPrerequisites } from "../lib/prerequisites.js";

export interface RebuildOptions {
  /** cw-react branch — if provided, enables cw-react build (default: current branch, -stg stripped) */
  react?: string;
  /** cw-core branch — if provided, enables cw-core build */
  core?: string;
  /** cw-ms-timesheets branch — if provided, enables timesheets build */
  timesheets?: string;
}

export async function rebuildCommand(options: RebuildOptions = {}): Promise<void> {
  await checkPrerequisites(["gh"]);

  const branchReact = options.react ?? stripStgBranchSuffix(await getCurrentBranch());
  const buildCore = options.core !== undefined;
  const buildTimesheets = options.timesheets !== undefined;

  console.log(chalk.bold("\n  Rebuilding ephemeral environment\n"));
  console.log(chalk.gray(`  React:      ${branchReact}`));
  console.log(chalk.gray(`  Core:       ${buildCore ? options.core : "—"}`));
  console.log(chalk.gray(`  Timesheets: ${buildTimesheets ? options.timesheets : "—"}`));
  console.log("");

  console.log(chalk.gray(`  Pushing branch ${branchReact}...`));
  await pushBranch(branchReact);
  console.log(chalk.green("✓ Branch pushed\n"));

  console.log(chalk.gray("  Triggering workflow..."));

  const workflowInputs: Record<string, string> = {
    branch: branchReact,
    build_cw_react: "true",
    build_core: String(buildCore),
    core_branch: options.core ?? "main",
    enabled_socketio: "false",
    build_timesheets: String(buildTimesheets),
    timesheets_branch: options.timesheets ?? "main",
  };

  const { url } = await triggerWorkflow(
    DEFAULTS.github.buildOrReuseWorkflowId,
    workflowInputs,
    { ref: "main" }
  );

  console.log(chalk.green("✓ Workflow triggered"));
  console.log(chalk.gray(`  ${url}`));
  await copyToClipboard(url);
  console.log(chalk.gray("  URL copied to clipboard\n"));
}
