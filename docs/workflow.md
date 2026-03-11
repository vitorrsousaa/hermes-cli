# Workflow

> See also: [context.md](context.md) (context), [conventions.md](conventions.md) (branch conventions)

## Typical sequence

1. **`hermes start <ticket-id>`** — Fetches ticket from Linear, moves to "In Progress", creates branch `feat/<id>` or `fix/<id>`, saves context to `.hermes-context.json`.

2. **`hermes deployfe`** — Triggers "Deploy Feature Environment" workflow on GitHub Actions (ephemeral environment).

3. **`hermes test`** — Triggers deploy + moves ticket to "DEV Testing", copies workflow URL to clipboard.

4. **`hermes prc`** — Creates PR(s) to stg/main/both with title `[TICKET-ID] Title`, uses context or branch.

5. **`hermes review`** — Sends message on Slack (#pr) and moves ticket to "Ready for QA".

6. **`hermes stop`** — Triggers ephemeral environment destroy workflow.

## Utility commands (outside main flow)

- **`hermes branch`** — Branch name + clipboard
- **`hermes toggle`** — Switch main ↔ -stg
- **`hermes sync`** — Sync main → -stg
- **`hermes update`** — Merge main/staging into current branch
- **`hermes push`** — Push current branch
- **`hermes check`** — Typecheck, lint, prettier
