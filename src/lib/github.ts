import { execa } from "execa";
import clipboardy from "clipboardy";
import { HermesError } from "./errors.js";

const POLL_INITIAL_MS = 5000;
const POLL_MAX_MS = 30000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 min

export interface GhRunResult {
  status: string;
  conclusion: string | null;
  url: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface TriggerWorkflowResult {
  runId: string;
  url: string;
}

export interface TriggerWorkflowOptions {
  /** Git ref to run workflow from (e.g. "main"). If not set, uses inputs.branch when present. */
  ref?: string;
}

export async function triggerWorkflow(
  workflow: string,
  inputs?: Record<string, string>,
  options?: TriggerWorkflowOptions
): Promise<TriggerWorkflowResult> {
  const args = ["workflow", "run", workflow];
  const ref = options?.ref ?? inputs?.branch;
  if (ref) {
    args.push("--ref", ref);
  }
  if (inputs && Object.keys(inputs).length > 0) {
    const inputArgs = Object.entries(inputs).flatMap(([k, v]) => [
      "-f",
      `${k}=${v}`,
    ]);
    args.push(...inputArgs);
  }

  const triggeredAt = new Date();
  await execa("gh", args);

  await sleep(3000);

  const listArgs = [
    "run",
    "list",
    "--workflow",
    workflow,
    "--limit",
    "5",
    "--json",
    "databaseId,url,createdAt",
  ];
  if (ref) {
    listArgs.push("--branch", ref);
  }

  // Retry up to ~15 s to give GitHub time to register the new run
  const RETRY_DELAY_MS = 2000;
  const RETRY_MAX = 6;
  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    const { stdout } = await execa("gh", listArgs);
    const runs = JSON.parse(stdout) as { databaseId: number; url: string; createdAt: string }[];
    const ourRun = runs.find((r) => new Date(r.createdAt) >= triggeredAt);
    if (ourRun) {
      return { runId: String(ourRun.databaseId), url: ourRun.url };
    }
    if (attempt < RETRY_MAX - 1) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new HermesError(
    "Could not get the workflow run ID.",
    "Check if the workflow was triggered correctly."
  );
}

export async function waitForRun(runId: string): Promise<GhRunResult> {
  const start = Date.now();
  let delay = POLL_INITIAL_MS;

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const { stdout } = await execa("gh", [
      "run",
      "view",
      runId,
      "--json",
      "status,conclusion,url",
    ]);
    const run = JSON.parse(stdout) as {
      status: string;
      conclusion: string | null;
      url: string;
    };

    if (run.status === "completed") {
      return {
        status: run.status,
        conclusion: run.conclusion,
        url: run.url,
      };
    }

    await sleep(delay);
    delay = Math.min(delay * 1.5, POLL_MAX_MS);
  }

  throw new HermesError(
    "Timeout waiting for workflow completion.",
    "Check the status at: gh run view " + runId
  );
}

export async function getRunLogs(runId: string): Promise<string> {
  const { stdout } = await execa("gh", ["run", "view", runId, "--log"], {
    reject: false,
  });
  return stdout ?? "";
}

export async function createPr(options: {
  title: string;
  body: string;
  base?: string;
  draft?: boolean;
  /** GitHub login or `@me` for the authenticated user. */
  assignee?: string;
}): Promise<{ url: string; number: number }> {
  const args = [
    "pr",
    "create",
    "--title",
    options.title,
    "--body",
    options.body,
  ];
  if (options.base) {
    args.push("--base", options.base);
  }
  if (options.draft) {
    args.push("--draft");
  }
  if (options.assignee) {
    args.push("--assignee", options.assignee);
  }
  const { stdout } = await execa("gh", args);

  const urlMatch = stdout.match(/https:\/\/[^\s]+/);
  const url = urlMatch?.[0] ?? "";
  const numMatch = url.match(/\/pull\/(\d+)/);
  const number = numMatch ? parseInt(numMatch[1], 10) : 0;

  return { url, number };
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await clipboardy.write(text);
  } catch {
    // Best-effort: fail silently in headless/SSH
  }
}

/** Get PR URL for the current branch (if a PR exists). */
export async function getCurrentPrUrl(): Promise<string | null> {
  try {
    const { stdout } = await execa("gh", [
      "pr",
      "view",
      "--json",
      "url",
      "-q",
      ".url",
    ]);
    return (stdout?.trim() && stdout.trim()) || null;
  } catch {
    return null;
  }
}
