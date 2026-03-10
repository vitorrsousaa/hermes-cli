import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { HermesError } from "./lib/errors.js";

export interface HermesConfig {
  linear: {
    apiKey: string;
    teamId: string;
    statusInProgress: string;
    statusDevTesting: string;
    statusInReview: string;
  };
  github: {
    deployWorkflow: string;
    destroyWorkflow: string;
  };
  slack: {
    channel: string;
  };
  claudeCode: {
    command: string;
  };
}

export function getConfigPath(): string {
  return join(homedir(), ".hermes", "config.json");
}

export async function loadConfig(): Promise<HermesConfig> {
  const path = getConfigPath();
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as HermesConfig;
  } catch {
    throw new HermesError(
      "Configuração não encontrada.",
      "Execute hermes config primeiro."
    );
  }
}

export async function saveConfig(config: HermesConfig): Promise<void> {
  const path = getConfigPath();
  const dir = join(homedir(), ".hermes");
  await mkdir(dir, { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2), "utf-8");
}
