# Workflow

> See also: [conventions.md](conventions.md) (branch conventions)

## Typical sequence

1. **`hermes start <ticket-id>`** — Fetches ticket from Linear, moves to "In Progress", creates branch `feat/<id>` or `fix/<id>`.

2. **`hermes deployfe`** — Triggers "Deploy Feature Environment" workflow. Uses current branch; optional `-c`/`-t` for core/timesheets (default: main).

3. **`hermes test`** — Uses current branch; triggers deploy, moves ticket to "DEV Testing", copies workflow URL. Optional `-c`/`-t` for core/timesheets (default: main). Optionally generates AI task summary (see [test.md](test.md)).

4. **`hermes prc`** — Creates PR(s) to stg/main/both with title `[TICKET-ID] Title` (ticket from branch name).

5. **`hermes review`** — Moves ticket to "Ready for QA".

6. **`hermes cleanup`** — Triggers Cleanup Stale FE Namespaces (delete ephemeral namespace). Uses current branch by default; `-b` to specify branch.

## Utility commands (outside main flow)

- **`hermes summary`** — AI task summary from git diffs (see [summary.md](summary.md))
- **`hermes branch`** — Branch name + clipboard
- **`hermes toggle`** — Switch main ↔ -stg
- **`hermes sync`** — Sync main → -stg
- **`hermes update`** — Merge main/staging into current branch
- **`hermes push`** — Push current branch
- **`hermes check`** — Typecheck, lint, prettier
