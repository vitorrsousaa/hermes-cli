import chalk from "chalk";
import { loadContext } from "../lib/context.js";
import { DEFAULTS } from "../lib/defaults.js";
import { updateIssueStatus } from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { withSpinner } from "../lib/spinner.js";

export async function readyCommand(): Promise<void> {
  await checkPrerequisites(["linear"]);
  const context = await loadContext();
  const { ticketId } = context;

  await withSpinner("Moving ticket to Ready for QA...", () =>
    updateIssueStatus(ticketId, DEFAULTS.linear.statusInReview)
  );

  console.log(chalk.green("\n✓ Ticket moved to Ready for QA"));
}
