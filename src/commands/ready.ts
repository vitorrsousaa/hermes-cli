import chalk from "chalk";
import { getCurrentBranch } from "../lib/git.js";
import { DEFAULTS } from "../lib/defaults.js";
import {
  updateIssueStatus,
  getTicketIdFromBranch,
} from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { HermesError } from "../lib/errors.js";
import { withSpinner } from "../lib/spinner.js";

export interface ReadyOptions {
  /** Branch to derive ticket from (e.g. feat/ENG-4321 or ENG-4321-stg); default: current branch */
  branch?: string;
}

export async function readyCommand(options: ReadyOptions = {}): Promise<void> {
  await checkPrerequisites(["linear"]);

  let ticketId: string;
  if (options.branch) {
    const resolved = getTicketIdFromBranch(options.branch);
    if (!resolved) {
      throw new HermesError(
        `Could not extract ticket ID from branch: ${options.branch}`,
        "Use a branch like feat/ENG-4321, fix/ENG-4321, or ENG-4321(-stg)."
      );
    }
    ticketId = resolved;
  } else {
    const branch = await getCurrentBranch();
    const resolved = getTicketIdFromBranch(branch);
    if (!resolved) {
      throw new HermesError(
        "Could not extract ticket ID from current branch.",
        "Use a branch like feat/ENG-4321, fix/ENG-4321, or pass -b <branch>."
      );
    }
    ticketId = resolved;
  }

  await withSpinner(`Moving ticket ${chalk.cyan(ticketId)} to Ready for QA...`, () =>
    updateIssueStatus(ticketId, DEFAULTS.linear.statusInReview)
  );

  console.log(chalk.green("\n✓ Ticket moved to Ready for QA"));
}
