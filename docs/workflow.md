# Workflow

> See also: [context.md](context.md) (context), [conventions.md](conventions.md) (branch conventions)

## Typical sequence

1. **`hermes start <ticket-id>`** — Fetches ticket from Linear, moves to "In Progress", creates branch `feat/<id>` or `fix/<id>`, saves context to `.hermes-context.json`.

2. **`hermes deployfe`** — Triggers "Deploy Feature Environment" workflow. Uses current branch; optional `-c`/`-t` for core/timesheets (default: main).

3. **`hermes test`** — Uses current branch; triggers deploy, moves ticket to "DEV Testing", copies workflow URL. Optional `-c`/`-t` for core/timesheets (default: main). Optionally generates AI task summary (see [test.md](test.md)).

4. **`hermes prc`** — Creates PR(s) to stg/main/both with title `[TICKET-ID] Title`, uses context or branch.

5. **`hermes review`** — Sends message on Slack (#pr) and moves ticket to "Ready for QA".

6. **`hermes cleanup`** — Triggers Cleanup Stale FE Namespaces (delete ephemeral namespace). Uses current branch by default; `-b` to specify branch.

## Utility commands (outside main flow)

- **`hermes summary`** — AI task summary from git diffs (see [summary.md](summary.md))
- **`hermes branch`** — Branch name + clipboard
- **`hermes toggle`** — Switch main ↔ -stg
- **`hermes sync`** — Sync main → -stg
- **`hermes update`** — Merge main/staging into current branch
- **`hermes push`** — Push current branch
- **`hermes check`** — Typecheck, lint, prettier
