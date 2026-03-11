import chalk from "chalk";
import { execa, type ExecaError } from "execa";
import ora from "ora";
import { getCurrentBranch } from "../lib/git.js";
import { extractIssueIdFromBranch } from "../lib/linear.js";

interface StepResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function getBaseBranch(): Promise<string> {
  const branch = await getCurrentBranch();
  return branch.endsWith("-stg") ? branch.slice(0, -4) : branch;
}

async function getModifiedFiles(): Promise<string[]> {
  const { stdout } = await execa("git", ["diff", "--name-only"]);
  return stdout
    .trim()
    .split("\n")
    .filter((f) => f.length > 0);
}

async function runStep(
  name: string,
  label: string,
  cmd: string,
  args: string[]
): Promise<StepResult> {
  const spinner = ora(label).start();
  try {
    await execa(cmd, args, { stdio: "pipe" });
    spinner.succeed(chalk.green(label));
    return { name, passed: true };
  } catch (err) {
    const execaErr = err as ExecaError;
    spinner.fail(chalk.red(label));
    const errMsg = execaErr.stderr ?? execaErr.stdout;
    return { name, passed: false, error: errMsg != null ? String(errMsg) : undefined };
  }
}

export async function checkCommand(): Promise<void> {
  console.log(chalk.bold("\n  Running checks...\n"));

  // Step 1: Typecheck
  const typecheck = await runStep(
    "typecheck",
    "Typecheck (tsc --noEmit)",
    "npx",
    ["tsc", "--noEmit"]
  );

  // Step 2: Lint (with auto-fix)
  const lint = await runStep("lint", "Lint (eslint --fix)", "npm", [
    "run",
    "lint:fix",
  ]);

  // Step 3: Prettier (with auto-fix)
  const prettier = await runStep(
    "prettier",
    "Prettier (format)",
    "npm",
    ["run", "prettier:fix"]
  );

  const steps = [typecheck, lint, prettier];
  const failed = steps.filter((s) => !s.passed);

  console.log("");

  if (failed.length > 0) {
    console.log(chalk.red.bold(`  ${failed.length} step(s) failed:\n`));
    for (const step of failed) {
      console.log(chalk.red(`  ✗ ${step.name}`));
      if (step.error) {
        console.log(chalk.gray(`    ${step.error.split("\n").slice(0, 5).join("\n    ")}`));
      }
    }
    process.exit(1);
  }

  // All passed — check for modified files
  const modified = await getModifiedFiles();

  if (modified.length === 0) {
    console.log(chalk.green.bold("  All checks passed. No files modified.\n"));
    return;
  }

  // Files were modified by lint/prettier — commit them
  const branch = await getBaseBranch();
  const ticketId = extractIssueIdFromBranch(branch) ?? branch;
  const commitMsg = `fix(${ticketId}): fix linter errors`;

  console.log(
    chalk.yellow(`  ${modified.length} file(s) modified by lint/prettier:\n`)
  );
  for (const file of modified) {
    console.log(chalk.gray(`    ${file}`));
  }
  console.log("");

  await execa("git", ["add", ...modified]);
  await execa("git", ["commit", "-m", commitMsg]);

  console.log(chalk.green.bold(`  All checks passed. Changes committed:`));
  console.log(chalk.gray(`  ${commitMsg}\n`));
}
