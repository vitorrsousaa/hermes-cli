import chalk from "chalk";
import { execa } from "execa";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { loadConfig } from "../config.js";
import { loadContext, saveContext } from "../lib/context.js";
import {
  fetchIssue,
  updateIssueStatus,
  updateIssueDescription,
} from "../lib/linear.js";
import {
  triggerWorkflow,
  waitForRun,
  getRunLogs,
} from "../lib/github.js";
import { withSpinner } from "../lib/spinner.js";

function extractEphemeralUrlFromLogs(logs: string): string | null {
  const urlPatterns = [
    /(?:preview|environment|url|deploy):\s*(https:\/\/[^\s"'<>]+)/i,
    /(https:\/\/[a-zA-Z0-9.-]+\.(?:vercel\.app|netlify\.app|onrender\.com|railway\.app)[^\s"'<>]*)/i,
    /(https:\/\/[a-zA-Z0-9.-]+--[a-zA-Z0-9-]+\.(?:web\.app|pages\.dev)[^\s"'<>]*)/i,
  ];
  for (const pattern of urlPatterns) {
    const match = logs.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

export async function testCommand(): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);
  const config = await loadConfig();
  const context = await loadContext();
  const { ticketId } = context;

  const { runId, url: runUrl } = await withSpinner(
    "Disparando ambiente efêmero...",
    () =>
      triggerWorkflow(config.github.deployWorkflow, {
        branch: context.branch,
      })
  );

  console.log(chalk.gray(`\nRun: ${runUrl}\n`));

  let testInfo = "";
  try {
    testInfo = await withSpinner(
      "Gerando informações de teste com Claude Code...",
      async () => {
        const [cmd, ...args] = config.claudeCode.command.split(/\s+/);
        const result = await execa(cmd, args, { stdout: "pipe" });
        return result.stdout ?? "";
      }
    );
  } catch (err) {
    console.log(chalk.yellow("Aviso: Claude Code falhou. Continuando sem informações de teste."));
  }

  const linearEnv = { apiKey: config.linear.apiKey, teamId: config.linear.teamId };
  if (testInfo) {
    await withSpinner("Atualizando ticket no Linear...", async () => {
      const issue = await fetchIssue(ticketId, linearEnv);
      const separator = issue.description ? "\n\n" : "";
      const updatedDescription = `${issue.description}${separator}## Informações de Teste\n\n${testInfo}`;
      await updateIssueDescription(ticketId, updatedDescription, linearEnv);
    });
    await withSpinner("Movendo ticket para Dev Testing...", () =>
      updateIssueStatus(ticketId, config.linear.statusDevTesting, linearEnv)
    );
  }

  const runResult = await withSpinner("Aguardando deploy...", () =>
    waitForRun(runId)
  );

  if (runResult.conclusion !== "success") {
    console.log(chalk.red(`\nDeploy falhou (${runResult.conclusion})`));
    console.log(chalk.gray(`Detalhes: ${runResult.url}`));
    process.exit(1);
  }

  const logs = await getRunLogs(runId);
  const ephemeralUrl = extractEphemeralUrlFromLogs(logs);

  context.ephemeralEnvUrl = ephemeralUrl;
  await saveContext(context);

  console.log(chalk.green("\n✓ Ambiente efêmero disponível"));
  if (ephemeralUrl) {
    console.log(chalk.cyan(`  ${ephemeralUrl}`));
  } else {
    console.log(chalk.yellow("  URL não encontrada nos logs. Verifique manualmente."));
  }
}
