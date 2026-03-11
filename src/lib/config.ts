import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const CONFIG_PATH = join(homedir(), ".hermes-config.json");

interface HermesConfig {
  claudeApiKey?: string;
}

async function readConfig(): Promise<HermesConfig> {
  try {
    const content = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(content) as HermesConfig;
  } catch {
    return {};
  }
}

async function writeConfig(config: HermesConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function getClaudeApiKey(): Promise<string | undefined> {
  const config = await readConfig();
  return config.claudeApiKey;
}

export async function setClaudeApiKey(key: string): Promise<void> {
  const config = await readConfig();
  config.claudeApiKey = key;
  await writeConfig(config);
}
