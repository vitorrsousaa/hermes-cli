import { Command } from "commander";
import chalk from "chalk";
import { HermesError } from "./lib/errors.js";
import { startCommand } from "./commands/start.js";
import { testCommand } from "./commands/test.js";
import { stopCommand } from "./commands/stop.js";
import { prCommand } from "./commands/pr.js";
import { reviewCommand } from "./commands/review.js";
import { branchCommand } from "./commands/branch.js";
import { checkCommand } from "./commands/check.js";
import { toggleCommand } from "./commands/toggle.js";
import { syncCommand } from "./commands/sync.js";
import { prCreateCommand } from "./commands/pr-create.js";
import { updateCommand } from "./commands/update.js";

const program = new Command();

program
  .name("hermes")
  .description("CLI to automate the development workflow between Linear, GitHub, and Slack")
  .version("0.1.0");

program
  .command("start <ticket-id>")
  .description("Start working on a ticket")
  .option("-t, --type <feat|fix>", "Branch type (feat or fix)", "feat")
  .action(async (ticketId: string, options: { type?: string }) => {
    await startCommand(ticketId, options);
  });

program
  .command("test")
  .description("Deploy ephemeral environment and update ticket")
  .action(async () => {
    await testCommand();
  });

program
  .command("stop")
  .description("Tear down ephemeral environment")
  .action(async () => {
    await stopCommand();
  });

program
  .command("pr")
  .description("Create pull request")
  .option("-y, --yes", "Skip interaction (--no-edit)")
  .action(async (options: { yes?: boolean }) => {
    await prCommand(options);
  });

program
  .command("prc")
  .description("Create PR to stg, main, or both (uses Linear issue from context or branch)")
  .option("-t, --target <stg|main|both>", "Target branch(es)", "stg")
  .option("-d, --draft", "Create as draft PR")
  .action(async (options: { target?: string; draft?: boolean }) => {
    const target = options.target as "stg" | "main" | "both" | undefined;
    if (target && !["stg", "main", "both"].includes(target)) {
      console.error("Invalid target. Use: stg, main, or both");
      process.exit(1);
    }
    await prCreateCommand({
      target: target ?? "stg",
      draft: options.draft ?? false,
    });
  });

program
  .command("review")
  .description("Request review (Slack + Linear)")
  .action(async () => {
    await reviewCommand();
  });

program
  .command("branch")
  .description("Print current branch name")
  .option("-s, --stg", "Append -stg suffix to branch name")
  .option("-c, --copy", "Copy branch name to clipboard")
  .addHelpText("after", "\nShorthand:\n  hermes branch -sc    staging suffix + copy to clipboard")
  .action(async (options: { stg?: boolean; copy?: boolean }) => {
    await branchCommand(options);
  });

program
  .command("check")
  .description("Run typecheck, lint, and prettier on the current project")
  .action(async () => {
    await checkCommand();
  });

program
  .command("toggle")
  .description("Toggle between main branch and staging branch (-stg suffix)")
  .option("--suffix <string>", "Staging branch suffix", "-stg")
  .action(async (options: { suffix?: string }) => {
    await toggleCommand(options);
  });

program
  .command("update")
  .description("Update current branch with main or staging")
  .option("-t, --target <main|stg>", "Branch to merge from", "stg")
  .action(async (options: { target?: string }) => {
    const target = options.target as "main" | "stg" | undefined;
    if (target && !["main", "stg"].includes(target)) {
      console.error("Invalid target. Use: main or stg");
      process.exit(1);
    }
    await updateCommand({ target: target ?? "stg" });
  });

program
  .command("sync")
  .description("Sync current branch to its -stg counterpart (push, merge, pull staging, push -stg)")
  .option("--suffix <string>", "Staging branch suffix", "-stg")
  .option("--staging <branch>", "Remote staging branch to pull from", "staging")
  .action(async (options: { suffix?: string; staging?: string }) => {
    await syncCommand({
      suffix: options.suffix,
      stagingBranch: options.staging,
    });
  });

async function main(): Promise<void> {
  try {
    await program.parseAsync();
  } catch (err) {
    if (err instanceof HermesError) {
      console.error(chalk.red(err.message));
      if (err.hint) {
        console.error(chalk.gray(err.hint));
      }
      process.exit(1);
    }
    if (process.env.HERMES_DEBUG === "1") {
      console.error(err);
    } else {
      console.error(chalk.red("Unexpected error."));
    }
    process.exit(1);
  }
}

main();
