import chalk from "chalk";
import { readFile, writeFile } from "fs/promises";
import { DEFAULTS } from "../lib/defaults.js";
import { copyToClipboard } from "../lib/github.js";
import { getCurrentBranch } from "../lib/git.js";
import { updateIssueStatus, updateIssueTitle, extractIssueIdFromBranch, fetchIssue } from "../lib/linear.js";
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

function resolveCore(options: TestOptions): { build: boolean; branch: string } {
  const c = options.core;
  if (!c) return { build: false, branch: "main" };
  if (c === true) return { build: true, branch: "main" };
  return { build: true, branch: c };
}

function resolveTimesheets(options: TestOptions): { build: boolean; branch: string } {
  const t = options.timesheets;
  if (!t) return { build: false, branch: "main" };
  if (t === true) return { build: true, branch: "main" };
  return { build: true, branch: t };
}

export interface TestOptions {
  force?: boolean;
  skipSummary?: boolean;
  /** Skip triggering ephemeral environment deploy */
  skipDeploy?: boolean;
  /** Build cw-core; optional branch (default: main) */
  core?: boolean | string;
  /** Build cw-ms-timesheets; optional branch (default: main) */
  timesheets?: boolean | string;
}

export async function testCommand(options: TestOptions = {}): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);

  const branch = await getCurrentBranch();
  const ticketId = extractIssueIdFromBranch(branch);
  const { build: buildCore, branch: branchCore } = resolveCore(options);
  const { build: buildTimesheets, branch: branchTimesheets } = resolveTimesheets(options);

  debug("branch:", branch, "ticketId:", ticketId, "core:", branchCore, "timesheets:", branchTimesheets);

  let runUrl: string | undefined;
  if (!options.skipDeploy) {
    const result = await withSpinner(
      "Triggering ephemeral environment...",
      () =>
        triggerDeployFeatureWorkflow({
          branchReact: branch,
          buildCore,
          branchCore,
          buildTimesheets,
          branchTimesheets,
          enabledSocketio: true,
        })
    );
    runUrl = result.url;
  } else {
    console.log(chalk.gray("\n  Skipping ephemeral environment deploy (--skip-deploy)."));
  }

  if (ticketId) {
    await withSpinner("Moving ticket to DEV Testing...", () =>
      updateIssueStatus(ticketId, DEFAULTS.linear.statusDevTesting)
    );
  } else {
    console.log(chalk.gray("\n  Skipping Linear status update (branch name is not feat/XXX or fix/XXX)."));
  }

  if (runUrl) {
    await copyToClipboard(runUrl);
    console.log(chalk.green("\n✓ Workflow triggered"));
    console.log(chalk.gray(`  ${runUrl}`));
    console.log(chalk.gray("  Copied to clipboard\n"));
  }

  // Optional summary — best-effort, never fails hermes test
  if (options.skipSummary) {
    console.log(chalk.gray("\n  Skipping summary generation and Linear ticket update (--skip-summary)"));
  } else {
    try {
      const apiKey = await getClaudeApiKey();
      debug("claude-api-key:", apiKey ? "configured" : "not set");

      if (!apiKey) {
        console.log(chalk.gray("\n  Skipping summary generation and Linear ticket update (no Claude API key)"));
      } else if (!ticketId) {
        console.log(chalk.gray("\n  Skipping summary generation (branch name is not feat/XXX or fix/XXX)."));
      } else {
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
        let ticketTitle = `${ticketId}: Task`;
        try {
          const issue = await fetchIssue(ticketId);
          ticketTitle = issue.title;
        } catch {
          // use placeholder
        }
        const result = await withSpinner("Generating task summary...", () =>
          generateTaskSummary(aggregateText, apiKey, { ticketId, ticketTitle })
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
}
