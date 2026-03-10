import chalk from "chalk";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { loadContext, saveContext } from "../lib/context.js";
import { createPr, copyToClipboard } from "../lib/github.js";
import { withSpinner } from "../lib/spinner.js";

const PR_BODY_TEMPLATE = (
  ticketId: string,
  ticketTitle: string,
  ticketUrl: string,
  ephemeralEnvUrl: string | null
) => `## Ticket
[${ticketId} - ${ticketTitle}](${ticketUrl})

## Ambiente de teste
${ephemeralEnvUrl ?? "Não disponível"}

## Como testar
<!-- Descreva os passos para testar -->

## Checklist
- [ ] Testes passando
- [ ] Sem erros de lint
- [ ] Revisado localmente
`;

export async function prCommand(options: { yes?: boolean }): Promise<void> {
  await checkPrerequisites(["gh"]);
  const context = await loadContext();

  const title = `[${context.ticketId}] ${context.ticketTitle}`;
  const body = PR_BODY_TEMPLATE(
    context.ticketId,
    context.ticketTitle,
    context.ticketUrl,
    context.ephemeralEnvUrl
  );

  const { url, number } = await withSpinner("Criando pull request...", () =>
    createPr({ title, body })
  );

  context.prUrl = url;
  context.prNumber = number;
  await saveContext(context);

  await copyToClipboard(url);

  console.log(chalk.green("\n✓ Pull request criado"));
  console.log(chalk.cyan(`  ${url}`));
  console.log(chalk.gray("  Copiado para clipboard"));
}
