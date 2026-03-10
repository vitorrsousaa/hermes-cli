import inquirer from "inquirer";
import chalk from "chalk";
import { execa } from "execa";
import { loadConfig, saveConfig, getConfigPath } from "../config.js";
import { readFile } from "fs/promises";
import { HermesError } from "../lib/errors.js";

const DEFAULTS = {
  statusInProgress: "In Progress",
  statusDevTesting: "DEV Testing",
  statusReadyForQa: "Ready for QA",
  slackChannel: "#review",
  claudeCodeCommand: "claude run test-info",
};

export async function configCommand(): Promise<void> {
  let existingConfig: Record<string, unknown> | null = null;
  try {
    const path = getConfigPath();
    const content = await readFile(path, "utf-8");
    existingConfig = JSON.parse(content);
  } catch {
    // No config yet
  }

  if (existingConfig) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: "confirm",
        name: "overwrite",
        message: "Configuração encontrada. Sobrescrever?",
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log("Operação cancelada.");
      return;
    }
  }

  const answers = await inquirer.prompt<{
    linearApiKey: string;
    linearTeamId: string;
  }>([
    {
      type: "password",
      name: "linearApiKey",
      message: "Linear API key:",
      validate: (v: string) => (v ? true : "Obrigatório"),
    },
    {
      type: "input",
      name: "linearTeamId",
      message: "Linear team ID:",
      validate: (v: string) => (v ? true : "Obrigatório"),
    },
  ]);

  try {
    await execa("gh", ["auth", "status"]);
  } catch {
    throw new HermesError(
      "GitHub não autenticado.",
      "Execute gh auth login primeiro."
    );
  }

  await saveConfig({
    linear: {
      apiKey: answers.linearApiKey,
      teamId: answers.linearTeamId,
      statusInProgress: DEFAULTS.statusInProgress,
      statusDevTesting: DEFAULTS.statusDevTesting,
      statusInReview: DEFAULTS.statusReadyForQa,
    },
    github: {
      deployWorkflow: "deploy-ephemeral.yml",
      destroyWorkflow: "destroy-ephemeral.yml",
    },
    slack: {
      channel: DEFAULTS.slackChannel,
    },
    claudeCode: {
      command: DEFAULTS.claudeCodeCommand,
    },
  });

  console.log(chalk.green("Configuração salva com sucesso."));
}
