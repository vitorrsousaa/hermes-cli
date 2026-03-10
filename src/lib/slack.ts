import { execa } from "execa";
import { HermesError } from "./errors.js";

export async function sendMessage(channel: string, text: string): Promise<void> {
  try {
    await execa("slack", [
      "chat",
      "send",
      "--channel",
      channel,
      "--text",
      text,
    ]);
  } catch (err) {
    throw new HermesError(
      "Falha ao enviar mensagem no Slack.",
      "Instale o Slack CLI: https://api.slack.com/automation/cli"
    );
  }
}
