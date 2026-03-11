import chalk from "chalk";
import { readFile, writeFile } from "fs/promises";
import { loadContext } from "../lib/context.js";
import { DEFAULTS } from "../lib/defaults.js";
import { copyToClipboard } from "../lib/github.js";
import { updateIssueStatus, updateIssueTitle } from "../lib/linear.js";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { withSpinner } from "../lib/spinner.js";
import { getClaudeApiKey } from "../lib/config.js";
import { collectDiffs, buildSummaryCachePath } from "../lib/diff.js";
import { generateTaskSummary, type TaskSummaryData } from "../lib/claude.js";
import { triggerDeployFeatureWorkflow } from "./deploy.js";

function debug(...args: unknown[]): void {
  if (process.env.HERMES_DEBUG === "1") {
    console.error(chalk.gray("[hermes:debug]"), ...args);
  }
}

function renderSummary(data: TaskSummaryData): void {
  console.log(chalk.bold.cyan("\nTASK TITLE"));
  console.log(data.taskTitle);

  console.log(chalk.bold.cyan("\nWHAT WAS IMPLEMENTED (DEV NOTES)"));
  console.log(data.devNotes);

  console.log(chalk.bold.cyan("\nWHERE TO ACCESS (QA)"));
  console.log(data.whereToAccess);

  console.log(chalk.bold.cyan("\nHOW TO TEST IT (QA)"));
  console.log(data.howToTest);

  console.log(chalk.bold.cyan("\nDEVELOPER TESTS"));
  for (const item of data.developerTests) {
    console.log(`[ ] ${item}`);
  }

  console.log(chalk.bold.cyan("\nQA TESTS"));
  for (const item of data.qaTests) {
    console.log(`[ ] ${item}`);
  }

  console.log(chalk.bold.cyan("\nTASK SUMMARY"));
  console.log(data.taskSummary);
}

export async function testCommand(options: { force?: boolean } = {}): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);
  const context = await loadContext();
  const { ticketId, branch } = context;

  debug("context:", { ticketId, branch, ticketTitle: context.ticketTitle });

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

  // Optional summary — best-effort, never fails hermes test
  try {
    const apiKey = await getClaudeApiKey();
    debug("claude-api-key:", apiKey ? "configured" : "not set");

    if (apiKey) {
      const cachePath = buildSummaryCachePath(branch);
      debug("cache path:", cachePath);
      debug("force (ignore cache):", options.force ?? false);

      let data: TaskSummaryData | undefined;
      let fromCache = false;

      if (!options.force) {
        try {
          const cached = await readFile(cachePath, "utf-8");
          data = JSON.parse(cached) as TaskSummaryData;
          fromCache = true;
          debug("using cached summary");
        } catch {
          // No cache — fall through to generate
        }
      }

      if (!data) {
        debug("generating task summary (collecting diffs...)");
        const { aggregateText } = await withSpinner("Collecting diffs for summary...", () =>
          collectDiffs()
        );
        debug("aggregateText length:", aggregateText.length);

        debug("calling generateTaskSummary...");
        const result = await withSpinner("Generating task summary...", () =>
          generateTaskSummary(aggregateText, apiKey, { ticketId, ticketTitle: context.ticketTitle })
        );
        debug("generateTaskSummary result:", {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          dataKeys: Object.keys(result.data),
        });

        data = result.data;
        await writeFile(cachePath, JSON.stringify(data, null, 2), "utf-8");
        console.log(
          chalk.gray(
            `\n  Tokens: ${result.inputTokens.toLocaleString()} in / ${result.outputTokens.toLocaleString()} out`
          )
        );
      }

      debug("summary source:", fromCache ? "cache" : "claude");

      const summaryData = data!;
      await withSpinner("Updating Linear ticket title...", () =>
        updateIssueTitle(ticketId, summaryData.taskTitle)
      );

      renderSummary(summaryData);
      console.log(chalk.gray(`\n  Cache: ${cachePath}${fromCache ? " (cached)" : ""}`));
    }
  } catch (err) {
    if (process.env.HERMES_DEBUG === "1") {
      console.error(chalk.red("[hermes:debug] summary error:"), err);
    }
    // Summary is best-effort — silently ignore any errors
  }
}
