import chalk from "chalk";
import { execa } from "execa";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { loadContext } from "../lib/context.js";
import { createPr, copyToClipboard } from "../lib/github.js";
import { getIssueFromBranch } from "../lib/linear.js";
import { withSpinner } from "../lib/spinner.js";
import { HermesError } from "../lib/errors.js";

function formatPrTitle(ticketId: string, ticketTitle: string): string {
  const escaped = ticketId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = ticketTitle.replace(new RegExp(`^${escaped}:\\s*`, "i"), "").trim();
  return `[${ticketId}]: ${stripped || ticketTitle}`;
}

async function getCommitsList(base: string): Promise<string> {
  try {
    const { stdout } = await execa("git", ["log", `origin/${base}..HEAD`, "--oneline"]);
    const lines = stdout.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return "";
    return lines.map((l) => `- ${l}`).join("\n");
  } catch {
    return "";
  }
}

type Target = "stg" | "main" | "both";

function resolveBaseBranch(target: Target): string[] {
  if (target === "both") return ["staging", "main"];
  if (target === "stg") return ["staging"];
  return ["main"];
}

async function getTicketInfo(): Promise<{
  ticketId: string;
  ticketTitle: string;
  ticketUrl: string;
}> {
  try {
    const context = await loadContext();
    return {
      ticketId: context.ticketId,
      ticketTitle: context.ticketTitle,
      ticketUrl: context.ticketUrl,
    };
  } catch {
    const issue = await getIssueFromBranch();
    if (!issue) {
      throw new HermesError(
        "Could not get ticket info.",
        "Run hermes start <ticket-id> first, or ensure you're on a branch with a Linear issue (e.g. feat/ENG-123, fix/9082)."
      );
    }
    return {
      ticketId: issue.id,
      ticketTitle: issue.title,
      ticketUrl: issue.url,
    };
  }
}

export async function prCreateCommand(options: {
  target?: Target;
  draft?: boolean;
}): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);

  const target = options.target ?? "stg";
  const draft = options.draft ?? false;

  const { ticketId, ticketTitle } = await getTicketInfo();
  const title = formatPrTitle(ticketId, ticketTitle);
  const bases = resolveBaseBranch(target);

  const urls: string[] = [];

  for (const base of bases) {
    const commits = await getCommitsList(base);
    const body = commits ? `## Commits\n\n${commits}` : "";
    const label = draft ? "draft " : "";
    await withSpinner(
      `Creating ${label}PR to ${base}...`,
      async () => {
        const { url } = await createPr({
          title,
          body,
          base,
          draft,
        });
        urls.push(url);
      }
    );
  }

  if (urls.length > 0) {
    await copyToClipboard(urls[0]);
  }

  console.log(chalk.green("\n✓ Pull request(s) created"));
  for (const url of urls) {
    console.log(chalk.cyan(`  ${url}`));
  }
  console.log(chalk.gray("  First URL copied to clipboard"));
}
