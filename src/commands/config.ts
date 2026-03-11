import chalk from "chalk";
import { getClaudeApiKey, setClaudeApiKey } from "../lib/config.js";
import { HermesError } from "../lib/errors.js";

const SUPPORTED_KEYS = ["claude-api-key"] as const;
type ConfigKey = (typeof SUPPORTED_KEYS)[number];

function assertValidKey(key: string): asserts key is ConfigKey {
  if (!SUPPORTED_KEYS.includes(key as ConfigKey)) {
    throw new HermesError(
      `Unknown config key: "${key}"`,
      `Supported keys: ${SUPPORTED_KEYS.join(", ")}`
    );
  }
}

export async function configSetCommand(key: string, value: string): Promise<void> {
  assertValidKey(key);

  if (key === "claude-api-key") {
    await setClaudeApiKey(value);
    console.log(chalk.green(`✓ claude-api-key saved`));
  }
}

export async function configGetCommand(key: string): Promise<void> {
  assertValidKey(key);

  if (key === "claude-api-key") {
    const apiKey = await getClaudeApiKey();
    if (!apiKey) {
      console.log(chalk.gray("claude-api-key: (not set)"));
    } else {
      const masked = `${apiKey.slice(0, 10)}****...`;
      console.log(chalk.gray(`claude-api-key: ${masked}`));
    }
  }
}
