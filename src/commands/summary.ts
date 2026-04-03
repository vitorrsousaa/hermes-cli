import chalk from "chalk";
import { getCurrentBranch } from "../lib/git.js";
import { getTicketIdFromBranch, commentOnIssue } from "../lib/linear.js";
import { HermesError } from "../lib/errors.js";
import { withSpinner } from "../lib/spinner.js";

const SUMMARIZER_COMMENT = "@summarizer";

export async function summaryCommand(): Promise<void> {
  const branch = await getCurrentBranch();
  const ticketId = getTicketIdFromBranch(branch);

  if (!ticketId) {
    throw new HermesError(
      "Could not find a Linear ticket ID in the current branch.",
      "Branch must follow the pattern feat/ENG-XXXX or fix/ENG-XXXX."
    );
  }

  await withSpinner(`Adding comment to ${ticketId}...`, () =>
    commentOnIssue(ticketId, SUMMARIZER_COMMENT)
  );

  console.log(chalk.green(`\n✓ Comment added to ${ticketId}`));
  console.log(chalk.gray(`  "${SUMMARIZER_COMMENT}"`));
}
