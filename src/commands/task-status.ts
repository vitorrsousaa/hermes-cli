import chalk from "chalk";
import { getCurrentBranch } from "../lib/git.js";
import { fetchIssue, getTicketIdFromBranch } from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { HermesError } from "../lib/errors.js";
import { withSpinner } from "../lib/spinner.js";

export interface TaskStatusOptions {
  /** Branch to derive ticket from (default: current branch) */
  branch?: string;
}

/**
 * Shows the current task (Linear ticket): ID, title, URL, and status.
 * Ticket ID is derived from the current branch (e.g. feat/ENG-4321) or from -b.
 */
export async function taskStatusCommand(
  options: TaskStatusOptions = {}
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

  console.log(chalk.bold(issue.title));
  console.log(chalk.cyan(issue.url));
  console.log(chalk.green(`Status: ${issue.status}`));
}
