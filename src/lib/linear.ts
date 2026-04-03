import { homedir, tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";
import { execa } from "execa";
import { HermesError } from "./errors.js";
import { getCurrentBranch } from "./git.js";
import { LINEAR_WORKFLOW_STATUSES } from "./defaults.js";

export interface LinearEnv {
  apiKey: string;
  teamId?: string;
}

async function runLinear(
  args: string[],
  env?: LinearEnv
): Promise<{ stdout: string; stderr: string }> {
  const execaEnv = env
    ? { ...process.env, LINEAR_API_KEY: env.apiKey, LINEAR_TEAM: env.teamId ?? "" }
    : process.env;
  const result = await execa("npx", ["@schpet/linear-cli", ...args], {
    env: execaEnv,
    cwd: homedir(),
  });
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export interface LinearIssue {
  id: string;
  title: string;
  url: string;
  status: string;
  description: string;
}

/**
 * Parse linear issue view output (markdown/text format).
 * Handles common patterns: # Title, URL: ..., Status: ..., etc.
 */
function parseIssueOutput(issueId: string, output: string): LinearIssue {
  const lines = output.split("\n");
  let title = issueId;
  let url = "";
  let status = "";
  let description = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      title = trimmed.slice(2).trim();
    } else if (/^url:?\s+/i.test(trimmed)) {
      url = trimmed.replace(/^url:?\s+/i, "").trim();
    } else if (/^status:?\s+/i.test(trimmed)) {
      status = trimmed.replace(/^status:?\s+/i, "").trim();
    } else if (/^state:?\s+/i.test(trimmed)) {
      status = trimmed.replace(/^state:?\s+/i, "").trim();
    } else if (/^\*\*(?:state|status)\*\*:?\s*/i.test(trimmed)) {
      status = trimmed.replace(/^\*\*(?:state|status)\*\*:?\s*/i, "").trim();
    } else if (trimmed && !url && /^https?:\/\//.test(trimmed)) {
      url = trimmed;
    }
  }

  // Fallback: CLI may show state in another format; search for known status labels in full output
  if (!status) {
    for (const known of LINEAR_WORKFLOW_STATUSES) {
      if (output.includes(known)) {
        status = known;
        break;
      }
    }
  }

  // linear issue view format:
  //   # ISSUE-ID: Title
  //   [optional **Project:** metadata line]
  //   [description body — raw markdown]
  //   ## Parent / ## Attachments / ## Comments  ← CLI-appended, NOT part of description
  //
  // Strategy: remove the first line (# title), then capture until the first "## " section.
  const afterTitle = output.replace(/^[^\n]*\n/, "");
  const descSectionMatch = afterTitle.match(/^([\s\S]*?)(?=\n## |\n##$|$)/);
  if (descSectionMatch) {
    description = descSectionMatch[1].trim();
  }

  if (!url && issueId) {
    url = `https://linear.app/issue/${issueId}`;
  }

  return { id: issueId, title, url, status, description };
}

export async function fetchIssue(
  issueId: string,
  env?: LinearEnv | null
): Promise<LinearIssue> {
  try {
    const { stdout } = await runLinear(["issue", "view", issueId], env ?? undefined);
    return parseIssueOutput(issueId, stdout);
  } catch (err) {
    const msg =
      process.env.HERMES_DEBUG === "1" && err instanceof Error
        ? err.message
        : "Run linear auth first to authenticate with Linear.";
    throw new HermesError(
      `Failed to fetch ticket ${issueId}.`,
      msg
    );
  }
}

export async function updateIssueStatus(
  issueId: string,
  status: string,
  env?: LinearEnv | null
): Promise<void> {
  try {
    await runLinear(["issue", "update", issueId, "--state", status], env ?? undefined);
  } catch (err) {
    throw new HermesError(
      `Failed to update ticket status ${issueId}.`,
      "Check if the status exists in your Linear workspace."
    );
  }
}

/**
 * Extract issue ID from branch name (e.g. feat/ENG-123, fix/9082-stg).
 */
export function extractIssueIdFromBranch(branch: string): string | null {
  const match = branch.replace(/-stg$/, "").match(/^(?:feat|fix)\/(.+)$/);
  return match?.[1]?.trim() ?? null;
}

/** Linear-style issue ID (e.g. ENG-4321, ABC-123). */
const TICKET_ID_PATTERN = /^[A-Za-z]+-[0-9]+$/;

/**
 * Resolve ticket ID from branch name for use in ready/status updates.
 * Handles: feat/ENG-4321, fix/ENG-4321, ENG-4321-stg, ENG-4321.
 */
export function getTicketIdFromBranch(branch: string): string | null {
  const fromPrefix = extractIssueIdFromBranch(branch);
  if (fromPrefix) return fromPrefix;
  const withoutStg = branch.replace(/-stg$/, "").trim();
  if (TICKET_ID_PATTERN.test(withoutStg)) return withoutStg;
  return null;
}

/**
 * Get issue ID and title from current branch.
 * Extracts ID from branch name, fetches title via Linear API (uses linear auth).
 */
export async function getIssueFromBranch(): Promise<{
  id: string;
  title: string;
  url: string;
} | null> {
  const branch = await getCurrentBranch();
  const ticketId = extractIssueIdFromBranch(branch);
  if (!ticketId) return null;

  try {
    const issue = await fetchIssue(ticketId);
    return {
      id: issue.id,
      title: issue.title,
      url: issue.url,
    };
  } catch {
    return null;
  }
}

export async function updateIssueTitle(
  issueId: string,
  title: string,
  env?: LinearEnv | null
): Promise<void> {
  try {
    await runLinear(["issue", "update", issueId, "--title", title], env ?? undefined);
  } catch {
    throw new HermesError(`Failed to update ticket title ${issueId}.`);
  }
}

export async function updateIssueDescription(
  issueId: string,
  description: string,
  env?: LinearEnv | null
): Promise<void> {
  const tmpFile = join(tmpdir(), `hermes-desc-${issueId}.md`);
  try {
    const execaEnv =
      env
        ? { ...process.env, LINEAR_API_KEY: env.apiKey, LINEAR_TEAM: env.teamId ?? "" }
        : process.env;
    await writeFile(tmpFile, description, "utf-8");
    await execa(
      "npx",
      ["@schpet/linear-cli", "issue", "update", issueId, "--description-file", tmpFile],
      { env: execaEnv, cwd: homedir() }
    );
  } catch {
    throw new HermesError(`Failed to update ticket description ${issueId}.`);
  } finally {
    await unlink(tmpFile).catch(() => undefined);
  }
}

/**
 * Replace the DEVELOPER TESTS section in a Linear description with new test items.
 * Matches the section from "DEVELOPER TESTS" until the next all-caps section header or end.
 * If the section is not found, appends it at the end.
 */
export async function commentOnIssue(
  issueId: string,
  body: string,
  env?: LinearEnv | null
): Promise<void> {
  try {
    await runLinear(["issue", "comment", "add", issueId, "--body", body], env ?? undefined);
  } catch {
    throw new HermesError(`Failed to add comment to ticket ${issueId}.`);
  }
}

export function replaceDevTestsSection(description: string, newTests: string[]): string {
  const newSection = `DEVELOPER TESTS\n${newTests.map((t) => `[ ] ${t}`).join("\n")}`;

  // Match "DEVELOPER TESTS" + everything until the next all-caps section (e.g. "QA TESTS") or end
  const updated = description.replace(
    /DEVELOPER TESTS\n[\s\S]*?(?=\n[A-Z][A-Z ]{2,}\n|$)/,
    newSection + "\n"
  );

  if (updated !== description) return updated;

  // Section not found — append it
  return `${description.trimEnd()}\n\nDEVELOPER TESTS\n${newTests.map((t) => `[ ] ${t}`).join("\n")}`;
}
