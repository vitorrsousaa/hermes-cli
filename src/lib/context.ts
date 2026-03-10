import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { execa } from "execa";
import { HermesError } from "./errors.js";

export interface HermesContext {
  ticketId: string;
  ticketTitle: string;
  ticketUrl: string;
  branch: string;
  ephemeralEnvUrl: string | null;
  prUrl: string | null;
  prNumber: number | null;
  startedAt: string;
}

export async function getRepoRoot(): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
  return stdout.trim();
}

export async function loadContext(): Promise<HermesContext> {
  const root = await getRepoRoot();
  const path = join(root, ".hermes-context.json");
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as HermesContext;
  } catch {
    throw new HermesError(
      "Nenhum ticket ativo.",
      "Use hermes start <ticket-id> primeiro."
    );
  }
}

export async function saveContext(ctx: HermesContext): Promise<void> {
  const root = await getRepoRoot();
  const path = join(root, ".hermes-context.json");
  await writeFile(path, JSON.stringify(ctx, null, 2), "utf-8");
}

export async function ensureGitignore(): Promise<void> {
  const root = await getRepoRoot();
  const gitignorePath = join(root, ".gitignore");
  const entry = ".hermes-context.json";

  let content: string;
  try {
    content = await readFile(gitignorePath, "utf-8");
  } catch {
    content = "";
  }

  if (content.includes(entry)) {
    return;
  }

  const suffix = content.endsWith("\n") ? "" : "\n";
  await writeFile(gitignorePath, `${content}${suffix}${entry}\n`, "utf-8");
}
