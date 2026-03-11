import chalk from "chalk";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { loadContext, saveContext } from "../lib/context.js";
import { triggerWorkflow } from "../lib/github.js";
import { DEFAULTS } from "../lib/defaults.js";
import { withSpinner } from "../lib/spinner.js";

export async function stopCommand(): Promise<void> {
  await checkPrerequisites(["gh"]);
  const context = await loadContext();

  if (!context.ephemeralEnvUrl) {
    console.log("No ephemeral environment to tear down.");
    process.exit(0);
  }

  await withSpinner("Tearing down ephemeral environment...", () =>
    triggerWorkflow(DEFAULTS.github.destroyWorkflow, { branch: context.branch })
  );

  context.ephemeralEnvUrl = null;
  await saveContext(context);

  console.log(chalk.green("\n✓ Ephemeral environment destroyed."));
}
