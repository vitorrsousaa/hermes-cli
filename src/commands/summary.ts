import chalk from "chalk";
import { readFile, writeFile } from "fs/promises";
import { getClaudeApiKey } from "../lib/config.js";
import { collectDiffs, buildSummaryCachePath } from "../lib/diff.js";
import { generateTaskSummary, type TaskSummaryData } from "../lib/claude.js";
import { HermesError } from "../lib/errors.js";
import { withSpinner } from "../lib/spinner.js";
import { loadContext } from "../lib/context.js";
import { getCurrentBranch } from "../lib/git.js";

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

export async function summaryCommand(options: { force?: boolean } = {}): Promise<void> {
  const apiKey = await getClaudeApiKey();
  if (!apiKey) {
    throw new HermesError(
      "Claude API key not configured.",
      "Run: hermes config set claude-api-key <your-key>"
    );
  }

  let context: { ticketId?: string; ticketTitle?: string } | undefined;
  try {
    const ctx = await loadContext();
    context = { ticketId: ctx.ticketId, ticketTitle: ctx.ticketTitle };
  } catch {
    // No active context — proceed without it
  }

  const branch = await getCurrentBranch();
  const cachePath = buildSummaryCachePath(branch);

  if (!options.force) {
    try {
      const cached = await readFile(cachePath, "utf-8");
      const data = JSON.parse(cached) as TaskSummaryData;
      console.log(chalk.bold("\n--- Task Summary (cached) ---"));
      renderSummary(data);
      console.log(chalk.gray(`\n  Cache: ${cachePath}`));
      return;
    } catch {
      // No cache or invalid JSON — proceed to generate
    }
  }

  const { aggregateText } = await withSpinner("Collecting diffs...", () =>
    collectDiffs()
  );

  const { data, inputTokens, outputTokens } = await withSpinner(
    "Generating summary with Claude...",
    () => generateTaskSummary(aggregateText, apiKey, context)
  );

  await writeFile(cachePath, JSON.stringify(data, null, 2), "utf-8");

  console.log(chalk.bold("\n--- Task Summary ---"));
  renderSummary(data);
  console.log(
    chalk.gray(
      `\n  Tokens: ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out`
    )
  );
  console.log(chalk.gray(`  Cache: ${cachePath}`));
}
