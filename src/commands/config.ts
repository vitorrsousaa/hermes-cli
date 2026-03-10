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
        message: "Configuration found. Overwrite?",
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log("Operation cancelled.");
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
      validate: (v: string) => (v ? true : "Required"),
    },
    {
      type: "input",
      name: "linearTeamId",
      message: "Linear team ID:",
      validate: (v: string) => (v ? true : "Required"),
    },
  ]);

  try {
    await execa("gh", ["auth", "status"]);
  } catch {
    throw new HermesError(
      "GitHub not authenticated.",
      "Run gh auth login first."
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

  console.log(chalk.green("Configuration saved successfully."));
}
