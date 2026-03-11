import chalk from "chalk";
import { checkPrerequisites } from "../lib/prerequisites.js";
import { loadContext } from "../lib/context.js";
import { createPr, copyToClipboard } from "../lib/github.js";
import { getIssueFromBranch } from "../lib/linear.js";
import { withSpinner } from "../lib/spinner.js";
import { HermesError } from "../lib/errors.js";

const PR_BODY_TEMPLATE = (
  ticketId: string,
  ticketTitle: string,
  ticketUrl: string
) => `## Ticket
[${ticketId} - ${ticketTitle}](${ticketUrl})

## How to test
<!-- Describe the steps to test -->

## Checklist
- [ ] Tests passing
- [ ] No lint errors
- [ ] Reviewed locally
`;

type Target = "stg" | "main" | "both";

function resolveBaseBranch(target: Target): string[] {
  if (target === "both") return ["staging", "main"];
  if (target === "stg") return ["staging"];
  return ["main"];
}

async function getTicketInfo(): Promise<{
  ticketId: string;
  ticketTitle: string;
  ticketUrl: string;
}> {
  try {
    const context = await loadContext();
    return {
      ticketId: context.ticketId,
      ticketTitle: context.ticketTitle,
      ticketUrl: context.ticketUrl,
    };
  } catch {
    const issue = await getIssueFromBranch();
    if (!issue) {
      throw new HermesError(
        "Could not get ticket info.",
        "Run hermes start <ticket-id> first, or ensure you're on a branch with a Linear issue (e.g. feat/ENG-123, fix/9082)."
      );
    }
    return {
      ticketId: issue.id,
      ticketTitle: issue.title,
      ticketUrl: issue.url,
    };
  }
}

export async function prCreateCommand(options: {
  target?: Target;
  draft?: boolean;
}): Promise<void> {
  await checkPrerequisites(["gh", "linear"]);

  const target = options.target ?? "stg";
  const draft = options.draft ?? false;

  const { ticketId, ticketTitle, ticketUrl } = await getTicketInfo();
  const title = `[${ticketId}] ${ticketTitle}`;
  const body = PR_BODY_TEMPLATE(ticketId, ticketTitle, ticketUrl);

  const bases = resolveBaseBranch(target);

  const urls: string[] = [];

  for (const base of bases) {
    const label = draft ? "draft " : "";
    await withSpinner(
      `Creating ${label}PR to ${base}...`,
      async () => {
        const { url } = await createPr({
          title,
          body,
          base,
          draft,
        });
        urls.push(url);
      }
    );
  }

  if (urls.length > 0) {
    await copyToClipboard(urls[0]);
  }

  console.log(chalk.green("\n✓ Pull request(s) created"));
  for (const url of urls) {
    console.log(chalk.cyan(`  ${url}`));
  }
  console.log(chalk.gray("  First URL copied to clipboard"));
}
