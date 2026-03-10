import { Command } from "commander";
import chalk from "chalk";
import { HermesError } from "./lib/errors.js";
import { configCommand } from "./commands/config.js";
import { startCommand } from "./commands/start.js";
import { testCommand } from "./commands/test.js";
import { stopCommand } from "./commands/stop.js";
import { prCommand } from "./commands/pr.js";
import { reviewCommand } from "./commands/review.js";

const program = new Command();

program
  .name("hermes")
  .description("CLI para automatizar o fluxo de desenvolvimento entre Linear, GitHub e Slack")
  .version("0.1.0");

program
  .command("config")
  .description("Configurar hermes (Linear, GitHub, Slack)")
  .action(async () => {
    await configCommand();
  });

program
  .command("start <ticket-id>")
  .description("Iniciar trabalho em um ticket")
  .option("-t, --type <feat|fix>", "Tipo da branch (feat ou fix)", "feat")
  .action(async (ticketId: string, options: { type?: string }) => {
    await startCommand(ticketId, options);
  });

program
  .command("test")
  .description("Disparar ambiente efêmero e atualizar ticket")
  .action(async () => {
    await testCommand();
  });

program
  .command("stop")
  .description("Encerrar ambiente efêmero")
  .action(async () => {
    await stopCommand();
  });

program
  .command("pr")
  .description("Criar pull request")
  .option("-y, --yes", "Pular interação (--no-edit)")
  .action(async (options: { yes?: boolean }) => {
    await prCommand(options);
  });

program
  .command("review")
  .description("Solicitar revisão (Slack + Linear)")
  .action(async () => {
    await reviewCommand();
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
      console.error(chalk.red("Erro inesperado."));
    }
    process.exit(1);
  }
}

main();
