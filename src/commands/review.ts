import chalk from "chalk";
import { HermesError } from "../lib/errors.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { loadContext } from "../lib/context.js";
import { sendMessage } from "../lib/slack.js";
import { updateIssueStatus } from "../lib/linear.js";
import { DEFAULTS } from "../lib/defaults.js";
import { withSpinner } from "../lib/spinner.js";

export async function reviewCommand(): Promise<void> {
  await checkPrerequisites(["linear", "slack"]);
  const context = await loadContext();
  const { ticketId, ticketTitle, prUrl, ephemeralEnvUrl } = context;

  if (!prUrl) {
    throw new HermesError(
      "No PR created.",
      "Run hermes prc first."
    );
  }

  const message = [
    "🔍 *Ready for review*",
    `*[${ticketId}] ${ticketTitle}*`,
    `PR: ${prUrl}`,
    `Preview: ${ephemeralEnvUrl ?? "Not available"}`,
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
