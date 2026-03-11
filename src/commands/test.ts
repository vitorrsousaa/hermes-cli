import chalk from "chalk";
import { writeFile } from "fs/promises";
import { loadContext } from "../lib/context.js";
import { DEFAULTS } from "../lib/defaults.js";
import { copyToClipboard } from "../lib/github.js";
import { updateIssueStatus } from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { withSpinner } from "../lib/spinner.js";
import { getClaudeApiKey } from "../lib/config.js";
import { collectDiffs, buildSummaryCachePath } from "../lib/diff.js";
import { generateTaskSummary } from "../lib/claude.js";
import { triggerDeployFeatureWorkflow } from "./deploy.js";

export async function testCommand(): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);
  const context = await loadContext();
  const { ticketId, branch } = context;

  const { url: runUrl } = await withSpinner(
    "Triggering ephemeral environment...",
    () =>
      triggerDeployFeatureWorkflow({
        branchReact: branch,
        buildCore: false,
        branchCore: "main",
        buildTimesheets: false,
        branchTimesheets: "main",
        enabledSocketio: true,
      })
  );

  await withSpinner("Moving ticket to DEV Testing...", () =>
    updateIssueStatus(ticketId, DEFAULTS.linear.statusDevTesting)
  );

  await copyToClipboard(runUrl);
  console.log(chalk.green("\n✓ Workflow triggered"));
  console.log(chalk.gray(`  ${runUrl}`));
  console.log(chalk.gray("  Copied to clipboard\n"));

  // Optional summary generation — best-effort, never fails hermes test
  try {
    const apiKey = await getClaudeApiKey();
    if (apiKey) {
      const { aggregateText } = await withSpinner("Collecting diffs for summary...", () =>
        collectDiffs()
      );
      const { text, inputTokens, outputTokens } = await withSpinner(
        "Generating task summary...",
        () => generateTaskSummary(aggregateText, apiKey, { ticketId: context.ticketId })
      );
      const cachePath = buildSummaryCachePath(context.branch);
      await writeFile(cachePath, text, "utf-8");
      console.log(chalk.bold("\n--- Task Summary ---\n"));
      console.log(text);
      console.log(
        chalk.gray(
          `\n  Tokens: ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out`
        )
      );
      console.log(chalk.gray(`  Cache: ${cachePath}`));
    }
  } catch {
    // Summary is best-effort — silently ignore any errors
  }
}
