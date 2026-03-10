import chalk from "chalk";
import { HermesError } from "../lib/errors.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { loadConfig } from "../config.js";
import { loadContext } from "../lib/context.js";
import { sendMessage } from "../lib/slack.js";
import { updateIssueStatus } from "../lib/linear.js";
import { withSpinner } from "../lib/spinner.js";

export async function reviewCommand(): Promise<void> {
  await checkPrerequisites(["linear", "slack"]);
  const config = await loadConfig();
  const context = await loadContext();
  const { ticketId, ticketTitle, prUrl, ephemeralEnvUrl } = context;

  if (!prUrl) {
    throw new HermesError(
      "No PR created.",
      "Run hermes pr first."
    );
  }

  const message = [
    "🔍 *Ready for review*",
    `*[${ticketId}] ${ticketTitle}*`,
    `PR: ${prUrl}`,
    `Preview: ${ephemeralEnvUrl ?? "Not available"}`,
  ].join("\n");

  await withSpinner("Sending message on Slack...", () =>
    sendMessage(config.slack.channel, message)
  );

  const linearEnv = { apiKey: config.linear.apiKey, teamId: config.linear.teamId };
  await withSpinner("Moving ticket to In Review...", () =>
    updateIssueStatus(ticketId, config.linear.statusInReview, linearEnv)
  );

  console.log(chalk.green("\n✓ Review requested"));
  console.log(chalk.gray(`  Channel: ${config.slack.channel}`));
}
