import inquirer from "inquirer";
import chalk from "chalk";
import { execa } from "execa";
import { loadConfig, saveConfig, getConfigPath } from "../config.js";
import { readFile } from "fs/promises";
import { HermesError } from "../lib/errors.js";

const DEFAULTS = {
  statusInProgress: "In Progress",
  statusDevTesting: "Dev Testing",
  statusInReview: "In Review",
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

  const answers = await inquirer.prompt<
    Record<string, string> & { statusInProgress: string; statusDevTesting: string; statusInReview: string }
  >([
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
    {
      type: "input",
      name: "statusInProgress",
      message: "Status 'In Progress':",
      default: DEFAULTS.statusInProgress,
    },
    {
      type: "input",
      name: "statusDevTesting",
      message: "Status 'Dev Testing':",
      default: DEFAULTS.statusDevTesting,
    },
    {
      type: "input",
      name: "statusInReview",
      message: "Status 'In Review':",
      default: DEFAULTS.statusInReview,
    },
    {
      type: "input",
      name: "slackChannel",
      message: "Slack channel:",
      default: DEFAULTS.slackChannel,
    },
    {
      type: "input",
      name: "claudeCodeCommand",
      message: "Claude Code command:",
      default: DEFAULTS.claudeCodeCommand,
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
      statusInProgress: answers.statusInProgress,
      statusDevTesting: answers.statusDevTesting,
      statusInReview: answers.statusInReview,
    },
    github: {
      deployWorkflow: "deploy-ephemeral.yml",
      destroyWorkflow: "destroy-ephemeral.yml",
    },
    slack: {
      channel: answers.slackChannel,
    },
    claudeCode: {
      command: answers.claudeCodeCommand,
    },
  });

  console.log(chalk.green("Configuração salva com sucesso."));
}
