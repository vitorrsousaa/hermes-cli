import { Command } from "commander";
import chalk from "chalk";
import { HermesError } from "./lib/errors.js";
import { startCommand } from "./commands/start.js";
import { cleanupCommand } from "./commands/cleanup.js";
import { reviewCommand } from "./commands/review.js";
import { copybCommand } from "./commands/copyb.js";
import { checkCommand } from "./commands/check.js";
import { toggleCommand } from "./commands/toggle.js";
import { syncCommand } from "./commands/sync.js";
import { prCreateCommand } from "./commands/pr-create.js";
import { updateCommand } from "./commands/update.js";
import { pushCommand } from "./commands/push.js";
import { mainCommand } from "./commands/main.js";
import { deployCommand } from "./commands/deploy.js";
import { readyCommand } from "./commands/ready.js";
import { summaryCommand } from "./commands/summary.js";
import { previewUrlCommand } from "./commands/preview-url.js";
import { taskStatusCommand } from "./commands/task-status.js";
import { taskMoveCommand } from "./commands/task-move.js";
import { checkoutCommand } from "./commands/checkout.js";
import { rebuildCommand } from "./commands/rebuild.js";

const program = new Command();

program
  .name("cw")
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
  .command("deployfe")
  .description("Deploy feature environment (ephemeral)")
  .option("-r, --react [branch]", "React branch (default: current branch)")
  .option("-c, --core [branch]", "Build cw-core; optional branch (default: main)")
  .option("-sc, --same-core", "Use same branch for cw-core as cw-react")
  .option("-t, --timesheets [branch]", "Build cw-ms-timesheets; optional branch (default: main)")
  .option("--no-socketio", "Disable Socket.IO (enabled by default)")
  .action(async (options: {
    react?: string;
    core?: string | boolean;
    sameCore?: boolean;
    timesheets?: string | boolean;
    socketio?: boolean;
  }) => {
    await deployCommand({
      react: typeof options.react === "string" ? options.react : undefined,
      core: options.core === true ? true : options.core,
      sameCore: options.sameCore,
      timesheets: options.timesheets === true ? true : options.timesheets,
      socketio: options.socketio,
    });
  });

program
  .command("rebuild")
  .description("Rebuild ephemeral environment (cw-react branch default: current, -stg stripped)")
  .option("-r, --react <branch>", "cw-react branch (default: current branch, -stg stripped)")
  .option("-c, --core <branch>", "cw-core branch (enables core build)")
  .option("-t, --timesheets <branch>", "cw-ms-timesheets branch (enables timesheets build)")
  .action(async (options: { react?: string; core?: string; timesheets?: string }) => {
    await rebuildCommand({
      react: options.react,
      core: options.core,
      timesheets: options.timesheets,
    });
  });

program
  .command("cleanup")
  .description("Trigger Cleanup Stale FE Namespaces workflow (delete ephemeral namespace)")
  .option("-b, --branch <name>", "Branch to clean up (default: current branch)")
  .action(async (options: { branch?: string }) => {
    await cleanupCommand({ branch: options.branch });
  });

program
  .command("preview-url")
  .description("Print ephemeral preview URL and copy to clipboard (uses current branch; -stg is stripped)")
  .option("-b, --branch <name>", "Branch to use (default: current branch)")
  .action(async (options: { branch?: string }) => {
    await previewUrlCommand({ branch: options.branch });
  });


program
  .command("prc")
  .description("Create PR to stg, main, or both (uses Linear issue from branch name)")
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
  .command("ready")
  .description("Move ticket from DEV Testing to Ready for QA")
  .option("-b, --branch <name>", "Branch to use (e.g. feat/ENG-4321 or ENG-4321-stg); default: current branch")
  .action(async (options: { branch?: string }) => {
    await readyCommand({ branch: options.branch });
  });

const taskCmd = program
  .command("task")
  .description("Show or change the current task (Linear ticket) status");

taskCmd
  .command("status")
  .description("Show current task ID, title, URL and status")
  .option("-b, --branch <name>", "Branch to use (default: current branch)")
  .action(async (options: { branch?: string }) => {
    await taskStatusCommand({ branch: options.branch });
  });

taskCmd
  .command("move")
  .description("Change task status (choose from list)")
  .option("-b, --branch <name>", "Branch to use (default: current branch)")
  .action(async (options: { branch?: string }) => {
    await taskMoveCommand({ branch: options.branch });
  });

program
  .command("copyb")
  .description("Print current branch name (copies to clipboard by default)")
  .option("-s, --stg", "Append -stg suffix to branch name")
  .option("--no-copy", "Do not copy to clipboard")
  .addHelpText("after", "\nShorthand:\n  cw copyb -s    staging suffix + copy to clipboard")
  .action(async (options: { stg?: boolean; copy?: boolean }) => {
    await copybCommand(options);
  });

program
  .command("check")
  .description("Run typecheck, lint, and prettier on the current project")
  .option("-st, --skip-typecheck", "Skip the typecheck step")
  .option("-sl, --skip-lint", "Skip the lint step")
  .option("-sp, --skip-prettier", "Skip the prettier step")
  .option("-nc, --no-commit", "Do not auto-commit files modified by lint/prettier")
  .action(async (options: {
    skipTypecheck?: boolean;
    skipLint?: boolean;
    skipPrettier?: boolean;
    commit?: boolean;
  }) => {
    await checkCommand({
      skipTypecheck: options.skipTypecheck,
      skipLint: options.skipLint,
      skipPrettier: options.skipPrettier,
      noCommit: options.commit === false,
    });
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
  .option("-t, --target <main|stg>", "Branch to merge from", "main")
  .action(async (options: { target?: string }) => {
    const target = options.target as "main" | "stg" | undefined;
    if (target && !["main", "stg"].includes(target)) {
      console.error("Invalid target. Use: main or stg");
      process.exit(1);
    }
    await updateCommand({ target: target ?? "main" });
  });

program
  .command("push")
  .description("Push current branch to origin (no need to type the branch name)")
  .action(async () => {
    await pushCommand();
  });

program
  .command("main")
  .description("Checkout main and pull origin main (fast-forward only)")
  .action(async () => {
    await mainCommand();
  });

program
  .command("co <branch>")
  .description("Checkout branch (like git checkout); use -b to create a new branch")
  .option("-b, --create", "Create a new branch")
  .action(async (branch: string, options: { create?: boolean }) => {
    await checkoutCommand(branch, { create: options.create });
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

program
  .command("summary")
  .description("Post @summarizer comment on the Linear task")
  .action(async () => {
    await summaryCommand();
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(msg || "Unexpected error."));
    }
    process.exit(1);
  }
}

main();
