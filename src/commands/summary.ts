import chalk from "chalk";
import { readFile, writeFile } from "fs/promises";
import { getClaudeApiKey } from "../lib/config.js";
import { collectDiffs, buildSummaryCachePath } from "../lib/diff.js";
import { generateTaskSummary } from "../lib/claude.js";
import { HermesError } from "../lib/errors.js";
import { withSpinner } from "../lib/spinner.js";
import { loadContext } from "../lib/context.js";
import { getCurrentBranch } from "../lib/git.js";

export async function summaryCommand(options: { force?: boolean } = {}): Promise<void> {
  const apiKey = await getClaudeApiKey();
  if (!apiKey) {
    throw new HermesError(
      "Claude API key not configured.",
      'Run: hermes config set claude-api-key <your-key>'
    );
  }

  // Load context (optional — used for ticket ID/title injection)
  let context: { ticketId?: string; ticketTitle?: string } | undefined;
  try {
    const ctx = await loadContext();
    context = { ticketId: ctx.ticketId, ticketTitle: ctx.ticketTitle };
  } catch {
    // No active context — proceed without it
  }

  const branch = await getCurrentBranch();
  const cachePath = buildSummaryCachePath(branch);

  // Return cached if available and not forcing
  if (!options.force) {
    try {
      const cached = await readFile(cachePath, "utf-8");
      console.log(chalk.bold("\n--- Task Summary (cached) ---\n"));
      console.log(cached);
      console.log(chalk.gray(`\n  Cache: ${cachePath}`));
      return;
    } catch {
      // No cache — proceed to generate
    }
  }

  const { aggregateText } = await withSpinner("Collecting diffs...", () =>
    collectDiffs()
  );

  const { text, inputTokens, outputTokens } = await withSpinner(
    "Generating summary with Claude...",
    () => generateTaskSummary(aggregateText, apiKey, context)
  );

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
