import chalk from "chalk";
import { HermesError } from "../lib/errors.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { getCurrentBranch } from "../lib/git.js";
import { getCurrentPrUrl } from "../lib/github.js";
import { sendMessage } from "../lib/slack.js";
import { fetchIssue, getTicketIdFromBranch, updateIssueStatus } from "../lib/linear.js";
import { DEFAULTS } from "../lib/defaults.js";
import { withSpinner } from "../lib/spinner.js";

export async function reviewCommand(): Promise<void> {
  await checkPrerequisites(["linear", "slack"]);
  const branch = await getCurrentBranch();
  const ticketId = getTicketIdFromBranch(branch);
  if (!ticketId) {
    throw new HermesError(
      "Could not extract ticket ID from current branch.",
      "Use a branch like feat/ENG-4321 or fix/ENG-4321, or run cw prc from that branch first."
    );
  }
  const issue = await withSpinner("Fetching ticket...", () => fetchIssue(ticketId));
  const prUrl = await getCurrentPrUrl();
  if (!prUrl) {
    throw new HermesError(
      "No PR found for current branch.",
      "Run cw prc first."
    );
  }

  const message = [
    "🔍 *Ready for review*",
    `*[${issue.id}] ${issue.title}*`,
    `PR: ${prUrl}`,
    "Preview: Not available",
  ].join("\n");

  await withSpinner("Sending message on Slack...", () =>
    sendMessage(DEFAULTS.slack.channel, message)
  );

  await withSpinner("Moving ticket to In Review...", () =>
    updateIssueStatus(ticketId, DEFAULTS.linear.statusInReview)
  );

  console.log(chalk.green("\n✓ Review requested"));
  console.log(chalk.gray(`  Channel: ${DEFAULTS.slack.channel}`));
}
