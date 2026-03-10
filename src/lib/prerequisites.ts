import { execa } from "execa";
import { HermesError } from "./errors.js";

const INSTALL_INSTRUCTIONS: Record<string, string> = {
  gh: "https://cli.github.com/",
  linear: "npm install -g @schpet/linear-cli && linear auth",
  slack: "https://api.slack.com/automation/cli",
};

export async function checkPrerequisites(
  required: ("gh" | "linear" | "slack")[]
): Promise<void> {
  const missing: string[] = [];

  for (const cli of required) {
    try {
      if (cli === "linear") {
        await execa("npx", ["@schpet/linear-cli", "--version"]);
      } else {
        await execa(cli, ["--version"]);
      }
    } catch {
      missing.push(cli);
    }
  }

  if (missing.length > 0) {
    const instructions = missing
      .map((m) => `  ${m}: ${INSTALL_INSTRUCTIONS[m]}`)
      .join("\n");
    throw new HermesError(
      `Pré-requisitos não encontrados:\n${instructions}`,
      "Instale as ferramentas acima e tente novamente."
    );
  }
}
