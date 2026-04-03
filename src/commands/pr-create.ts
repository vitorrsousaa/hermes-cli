import chalk from "chalk";
import { execa } from "execa";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { createPr, copyToClipboard } from "../lib/github.js";
import { getCurrentBranch, branchExists, hasUncommittedChanges } from "../lib/git.js";
import { getIssueFromBranch } from "../lib/linear.js";
import { withSpinner } from "../lib/spinner.js";
import { HermesError } from "../lib/errors.js";

const DEFAULT_STG_SUFFIX = "-stg";

function formatPrTitle(ticketId: string, ticketTitle: string): string {
  const escaped = ticketId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = ticketTitle.replace(new RegExp(`^${escaped}:\\s*`, "i"), "").trim();
  return `[${ticketId}]: ${stripped || ticketTitle}`;
}

async function getCommitsList(base: string, headBranch: string): Promise<string> {
  try {
    const { stdout } = await execa("git", [
      "log",
      `origin/${base}..${headBranch}`,
      "--oneline",
    ]);
    const lines = stdout.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return "";
    return lines.map((l) => `- ${l}`).join("\n");
  } catch {
    return "";
  }
}

type Target = "stg" | "main" | "both";

function resolveBasesForTarget(target: Target): { base: string; useStgBranch: boolean }[] {
  if (target === "both") return [{ base: "main", useStgBranch: false }, { base: "staging", useStgBranch: true }];
  if (target === "stg") return [{ base: "staging", useStgBranch: true }];
  return [{ base: "main", useStgBranch: false }];
}

/** Ensures stg branch exists and checks out to it. mainBranch has no -stg suffix. */
async function ensureStgBranchAndCheckout(mainBranch: string): Promise<void> {
  const stgBranch = `${mainBranch}${DEFAULT_STG_SUFFIX}`;

  const existsLocal = await branchExists(stgBranch);
  const existsRemote = await branchExists(`origin/${stgBranch}`);

  if (existsLocal) {
    await withSpinner(`Checkout ${stgBranch}`, () =>
      execa("git", ["checkout", stgBranch])
    );
    if (!existsRemote) {
      await withSpinner(`Push ${stgBranch}`, () =>
        execa("git", ["push", "-u", "origin", stgBranch])
      );
    }
    return;
  }

  if (existsRemote) {
    await withSpinner(`Checkout ${stgBranch}`, () =>
      execa("git", ["checkout", stgBranch])
    );
    return;
  }

  await withSpinner(`Create branch ${stgBranch}`, () =>
    execa("git", ["checkout", "-b", stgBranch])
  );
  await withSpinner(`Push ${stgBranch}`, () =>
    execa("git", ["push", "-u", "origin", stgBranch])
  );
}

export async function prCreateCommand(options: {
  target?: Target;
  draft?: boolean;
}): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);

  const target = options.target ?? "stg";
  const draft = options.draft ?? false;

  const bases = resolveBasesForTarget(target);
  const currentBranch = await getCurrentBranch();
  const mainBranch = currentBranch.endsWith(DEFAULT_STG_SUFFIX)
    ? currentBranch.slice(0, -DEFAULT_STG_SUFFIX.length)
    : currentBranch;

  const stashed = await hasUncommittedChanges();
  if (stashed) {
    await withSpinner("Stashing uncommitted changes...", () =>
      execa("git", ["stash", "push", "-u", "-m", "hermes-prc-temp"])
    );
  }

  const urls: string[] = [];

  try {
    await withSpinner("Push current branch...", () =>
      execa("git", ["push", "-u", "origin", currentBranch])
    );

    for (const { base, useStgBranch } of bases) {
    if (useStgBranch) {
      await ensureStgBranchAndCheckout(mainBranch);
    } else {
      await withSpinner(`Checkout ${mainBranch}`, () =>
        execa("git", ["checkout", mainBranch])
      );
    }

    const headBranch = useStgBranch
      ? `${mainBranch}${DEFAULT_STG_SUFFIX}`
      : mainBranch;
    const issue = await getIssueFromBranch();
    if (!issue) {
      throw new HermesError(
        `Could not get ticket info from branch "${headBranch}".`,
        "Ensure the branch name contains a Linear issue (e.g. feat/ENG-123, fix/9082)."
      );
    }
    const title = formatPrTitle(issue.id, issue.title);
    const commits = await getCommitsList(base, headBranch);
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
          assignee: "@me",
        });
        urls.push(url);
      }
    );
  }

    await withSpinner(`Checkout ${currentBranch}`, () =>
      execa("git", ["checkout", currentBranch])
    );

    if (urls.length > 0) {
      await copyToClipboard(urls[0]);
    }

    console.log(chalk.green("\n✓ Pull request(s) created"));
    for (const url of urls) {
      console.log(chalk.cyan(`  ${url}`));
    }
    console.log(chalk.gray("  First URL copied to clipboard"));
  } finally {
    if (stashed) {
      await execa("git", ["checkout", currentBranch], { reject: false });
      await withSpinner("Restoring uncommitted changes...", () =>
        execa("git", ["stash", "pop"])
      );
    }
  }
}
