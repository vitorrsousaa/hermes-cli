import { execa } from "execa";
import { HermesError } from "./errors.js";

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
    } else if (trimmed && !url && /^https?:\/\//.test(trimmed)) {
      url = trimmed;
    }
  }

  // Extract description (everything after first blank line or "Description" header)
  const descMatch = output.match(/(?:description|descri[çc][ãa]o):?\s*[\r\n]+([\s\S]*?)(?=\n\n|$)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  } else {
    const parts = output.split(/\n\n+/);
    if (parts.length > 1) {
      description = parts.slice(1).join("\n\n").trim();
    }
  }

  if (!url && issueId) {
    url = `https://linear.app/issue/${issueId}`;
  }

  return { id: issueId, title, url, status, description };
}

export async function fetchIssue(
  issueId: string,
  env?: LinearEnv
): Promise<LinearIssue> {
  try {
    const { stdout } = await runLinear(["issue", "view", issueId], env);
    return parseIssueOutput(issueId, stdout);
  } catch (err) {
    const msg =
      process.env.HERMES_DEBUG === "1" && err instanceof Error
        ? err.message
        : "Check if the Linear CLI is authenticated (linear auth) or if the API key in hermes config is correct.";
    throw new HermesError(
      `Failed to fetch ticket ${issueId}.`,
      msg
    );
  }
}

export async function updateIssueStatus(
  issueId: string,
  status: string,
  env?: LinearEnv
): Promise<void> {
  try {
    await runLinear(["issue", "update", issueId, "--state", status], env);
  } catch (err) {
    throw new HermesError(
      `Failed to update ticket status ${issueId}.`,
      "Check if the status exists in your Linear workspace."
    );
  }
}

export async function updateIssueDescription(
  issueId: string,
  description: string,
  env?: LinearEnv
): Promise<void> {
  try {
    const execaEnv = env
      ? { ...process.env, LINEAR_API_KEY: env.apiKey, LINEAR_TEAM: env.teamId ?? "" }
      : process.env;
    await execa(
      "npx",
      ["@schpet/linear-cli", "issue", "update", issueId, "--description", description],
      { env: execaEnv }
    );
  } catch (err) {
    throw new HermesError(
      `Failed to update ticket description ${issueId}.`
    );
  }
}
