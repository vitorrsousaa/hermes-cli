import chalk from "chalk";
import { execa } from "execa";
import { loadConfig } from "../config.js";
import {
  ensureGitignore,
  getRepoRoot,
  saveContext,
  type HermesContext,
} from "../lib/context.js";
import { fetchIssue, updateIssueStatus } from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { withSpinner } from "../lib/spinner.js";

export async function startCommand(
  ticketId: string,
  options: { type?: string }
): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);
  const config = await loadConfig();

  const linearEnv = { apiKey: config.linear.apiKey, teamId: config.linear.teamId };
  const issue = await withSpinner("Buscando ticket...", () =>
    fetchIssue(ticketId, linearEnv)
  );

  console.log(chalk.cyan(`\n${issue.title}`));
  console.log(chalk.gray(issue.url));
  console.log(chalk.gray(`Status: ${issue.status}\n`));

  await withSpinner("Movendo ticket para In Progress...", () =>
    updateIssueStatus(ticketId, config.linear.statusInProgress, linearEnv)
  );
  
  const type = options.type === "feat" ? "feat" : "fix";
  const branch = `${type}/${ticketId}`;

  await withSpinner("Criando branch...", async () => {
    await execa("git", ["checkout", "main"]);
    await execa("git", ["checkout", "-b", branch]);
  });

  const root = await getRepoRoot();
  const context: HermesContext = {
    ticketId,
    ticketTitle: issue.title,
    ticketUrl: issue.url,
    branch,
    ephemeralEnvUrl: null,
    prUrl: null,
    prNumber: null,
    startedAt: new Date().toISOString(),
  };

  await saveContext(context);
  await ensureGitignore();

  console.log(chalk.green("\n✓ Ticket ativo"));
  console.log(chalk.gray(`  Branch: ${branch}`));
  console.log(chalk.gray(`  Context: ${root}/.hermes-context.json`));
}
