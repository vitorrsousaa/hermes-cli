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

export async function triggerWorkflow(
  workflow: string,
  inputs?: Record<string, string>
): Promise<TriggerWorkflowResult> {
  const args = ["workflow", "run", workflow];
  if (inputs?.branch) {
    args.push("--ref", inputs.branch);
  }
  if (inputs && Object.keys(inputs).length > 0) {
    const inputArgs = Object.entries(inputs)
      .filter(([k]) => k !== "branch")
      .flatMap(([k, v]) => ["-f", `${k}=${v}`]);
    args.push(...inputArgs);
  }

  await execa("gh", args);

  await sleep(2000);

  const listArgs = [
    "run",
    "list",
    "--workflow",
    workflow,
    "--limit",
    "1",
    "--json",
    "databaseId,url",
  ];
  if (inputs?.branch) {
    listArgs.push("--branch", inputs.branch);
  }
  const { stdout } = await execa("gh", listArgs);
  const runs = JSON.parse(stdout) as { databaseId: number; url: string }[];
  if (!runs.length) {
    throw new HermesError(
      "Não foi possível obter o ID do workflow run.",
      "Verifique se o workflow foi disparado corretamente."
    );
  }
  return {
    runId: String(runs[0].databaseId),
    url: runs[0].url,
  };
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
    "Timeout aguardando conclusão do workflow.",
    "Verifique o status em: gh run view " + runId
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
