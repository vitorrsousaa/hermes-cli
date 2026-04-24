import chalk from "chalk";
import { DEFAULTS } from "../lib/defaults.js";
import { getCurrentBranch, pushBranch, stripStgBranchSuffix } from "../lib/git.js";
import {
  copyToClipboard,
  triggerWorkflow,
  type TriggerWorkflowResult,
} from "../lib/github.js";
import { checkPrerequisites } from "../lib/prerequisites.js";

export interface DeployWorkflowInputs {
  branchReact: string;
  buildCore: boolean;
  branchCore: string;
  buildTimesheets: boolean;
  branchTimesheets: string;
  enabledSocketio: boolean;
}

export async function triggerDeployFeatureWorkflow(
  inputs: DeployWorkflowInputs
): Promise<TriggerWorkflowResult> {
  const workflowInputs: Record<string, string> = {
    branch: inputs.branchReact,
    build_core: String(inputs.buildCore),
    core_branch: inputs.branchCore,
    enabled_socketio: String(inputs.enabledSocketio),
    build_timesheets: String(inputs.buildTimesheets),
    timesheets_branch: inputs.branchTimesheets,
  };
  return triggerWorkflow(
    DEFAULTS.github.deployFeatureWorkflowId,
    workflowInputs,
    { ref: "main", repo: DEFAULTS.github.repo }
  );
}

export interface DeployOptions {
  /** React branch (default: current branch) */
  react?: string;
  /** Build cw-core; if true, use coreBranch (default: main) */
  core?: boolean | string;
  /** Use same branch for cw-core as cw-react */
  sameCore?: boolean;
  /** Build cw-ms-timesheets; if true, use timesheetsBranch (default: main) */
  timesheets?: boolean | string;
  /** Enable Socket.IO (default: true) */
  socketio?: boolean;
}

function resolveCore(options: DeployOptions): { build: boolean; branch: string } {
  const c = options.core;
  if (!c) return { build: true, branch: "main" };
  if (c === true) return { build: true, branch: "main" };
  return { build: true, branch: c };
}

function resolveTimesheets(
  options: DeployOptions
): { build: boolean; branch: string } {
  const t = options.timesheets;
  if (!t) return { build: true, branch: "main" };
  if (t === true) return { build: true, branch: "main" };
  return { build: true, branch: t };
}

export async function deployCommand(options: DeployOptions): Promise<void> {
  await checkPrerequisites(["gh"]);

  const branchReact = stripStgBranchSuffix(
    options.react ?? (await getCurrentBranch())
  );
  const coreResolved = options.sameCore
    ? { build: true, branch: branchReact }
    : resolveCore(options);
  const { build: buildCore, branch: branchCore } = coreResolved;
  const { build: buildTimesheets, branch: branchTimesheets } =
    resolveTimesheets(options);
  const enabledSocketio = options.socketio !== false;

  console.log(chalk.bold("\n  Deploying feature environment\n"));
  console.log(chalk.gray(`  React:        ${branchReact}`));
  console.log(chalk.gray(`  Core:         ${buildCore ? branchCore : "—"}`));
  console.log(chalk.gray(`  Timesheets:   ${buildTimesheets ? branchTimesheets : "—"}`));
  console.log(chalk.gray(`  Socket.IO:    ${enabledSocketio ? "on" : "off"}`));
  console.log("");

  console.log(chalk.gray(`  Pushing branch ${branchReact}...`));
  await pushBranch(branchReact);
  console.log(chalk.green("✓ Branch pushed\n"));

  console.log(chalk.gray("  Triggering workflow..."));
  let url: string;
  try {
    const result = await triggerDeployFeatureWorkflow({
      branchReact,
      buildCore,
      branchCore,
      buildTimesheets,
      branchTimesheets,
      enabledSocketio,
    });
    url = result.url;
    console.log(chalk.green("✓ Workflow triggered"));
  } catch (err) {
    throw err;
  }

  await copyToClipboard(url);
  console.log(chalk.gray(`  ${url}`));
  console.log(chalk.gray("  Copied to clipboard\n"));
}
