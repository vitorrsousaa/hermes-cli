import chalk from "chalk";
import inquirer from "inquirer";
import { getCurrentBranch } from "../lib/git.js";
import {
  fetchIssue,
  getTicketIdFromBranch,
  updateIssueStatus,
} from "../lib/linear.js";
import { LINEAR_WORKFLOW_STATUSES } from "../lib/defaults.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { HermesError } from "../lib/errors.js";
import { withSpinner } from "../lib/spinner.js";

export interface TaskMoveOptions {
  /** Branch to derive ticket from (default: current branch) */
  branch?: string;
}

/**
 * Changes the status of the current task (Linear ticket).
 * User selects the new status from a list (LINEAR_WORKFLOW_STATUSES).
 */
export async function taskMoveCommand(
  options: TaskMoveOptions = {}
): Promise<void> {
  await checkPrerequisites(["linear"]);

  const branch = options.branch ?? (await getCurrentBranch());
  const ticketId = getTicketIdFromBranch(branch);

  if (!ticketId) {
    throw new HermesError(
      "Could not extract ticket ID from branch.",
      "Use a branch like feat/ENG-4321, fix/ENG-4321, or pass -b <branch>."
    );
  }

  const issue = await withSpinner("Fetching ticket…", () => fetchIssue(ticketId));
  console.log(chalk.gray(`Current status: ${issue.status}`));

  const { newStatus } = await inquirer.prompt<{ newStatus: string }>([
    {
      type: "list",
      name: "newStatus",
      message: "Novo status:",
      choices: [...LINEAR_WORKFLOW_STATUSES],
    },
  ]);

  await withSpinner(
    `Moving ticket to ${chalk.cyan(newStatus)}…`,
    () => updateIssueStatus(ticketId, newStatus)
  );

  console.log(chalk.green(`\n✓ Ticket moved to ${newStatus}`));
}
