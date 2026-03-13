import chalk from "chalk";
import inquirer from "inquirer";
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

export async function configInteractiveCommand(): Promise<void> {
  console.log(
    chalk.gray(
      "Configuração do Hermes. Pressione Enter para manter o valor atual de uma key."
    )
  );

  const currentClaudeApiKey = await getClaudeApiKey();

  if (!currentClaudeApiKey) {
    console.log(chalk.gray("claude-api-key: (não configurada)"));
  } else {
    const masked = `${currentClaudeApiKey.slice(0, 10)}****...`;
    console.log(chalk.gray(`claude-api-key atual: ${masked}`));
  }

  const answers = await inquirer.prompt([
    {
      name: "claudeApiKey",
      type: "password",
      message: "claude-api-key (Claude API key):",
      mask: "*",
      validate: (input: string) => {
        if (!input && !currentClaudeApiKey) {
          return "Informe uma key ou cancele com Ctrl+C.";
        }
        return true;
      },
    },
  ]);

  const nextClaudeApiKey = (answers as { claudeApiKey?: string }).claudeApiKey
    ? (answers as { claudeApiKey?: string }).claudeApiKey
    : currentClaudeApiKey;

  if (!nextClaudeApiKey) {
    console.log(chalk.yellow("Nenhuma claude-api-key foi configurada."));
    return;
  }

  if (nextClaudeApiKey === currentClaudeApiKey) {
    console.log(chalk.gray("claude-api-key mantida sem alterações."));
    return;
  }

  await setClaudeApiKey(nextClaudeApiKey);
  console.log(chalk.green("✓ claude-api-key salva com sucesso"));
}
