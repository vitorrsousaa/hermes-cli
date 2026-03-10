import chalk from "chalk";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { loadConfig } from "../config.js";
import { loadContext, saveContext } from "../lib/context.js";
import { triggerWorkflow } from "../lib/github.js";
import { withSpinner } from "../lib/spinner.js";

export async function stopCommand(): Promise<void> {
  await checkPrerequisites(["gh"]);
  const config = await loadConfig();
  const context = await loadContext();

  if (!context.ephemeralEnvUrl) {
    console.log("Nenhum ambiente efêmero para encerrar.");
    process.exit(0);
  }

  await withSpinner("Encerrando ambiente efêmero...", () =>
    triggerWorkflow(config.github.destroyWorkflow, { branch: context.branch })
  );

  context.ephemeralEnvUrl = null;
  await saveContext(context);

  console.log(chalk.green("\n✓ Ambiente efêmero encerrado."));
}
