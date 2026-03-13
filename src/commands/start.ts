import chalk from "chalk";
import { execa } from "execa";
import { fetchIssue, updateIssueStatus } from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { DEFAULTS } from "../lib/defaults.js";
import { withSpinner } from "../lib/spinner.js";

export async function startCommand(
  ticketId: string,
  options: { type?: string }
): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);
  const issue = await withSpinner("Fetching ticket...", () =>
    fetchIssue(ticketId)
  );

  console.log(chalk.cyan(`\n${issue.title}`));
  console.log(chalk.gray(issue.url));
  console.log(chalk.gray(`Status: ${issue.status}\n`));

  await withSpinner("Moving ticket to In Progress...", () =>
    updateIssueStatus(ticketId, DEFAULTS.linear.statusInProgress)
  );

  const type = options.type === "feat" ? "feat" : "fix";
  const branch = `${type}/${ticketId}`;

  await withSpinner("Creating branch...", async () => {
    await execa("git", ["checkout", "main"]);
    await execa("git", ["checkout", "-b", branch]);
  });

  console.log(chalk.green("\n✓ Ticket active"));
  console.log(chalk.gray(`  Branch: ${branch}`));
}
