# Workflow

> See also: [conventions.md](conventions.md) (branch conventions)

## Typical sequence

1. **`cw start <ticket-id>`** — Fetches ticket from Linear, moves to "In Progress", creates branch `feat/<id>` or `fix/<id>`.

2. **`cw deployfe`** — Triggers "Deploy Feature Environment" workflow. Uses current branch; optional `-c`/`-t` for core/timesheets (default: main).

3. **`cw test`** — Uses current branch; triggers deploy, moves ticket to "DEV Testing", copies workflow URL. Optional `-c`/`-t` for core/timesheets (default: main). Optionally generates AI task summary (see [test.md](test.md)).

4. **`cw prc`** — Creates PR(s) to stg/main/both with title `[TICKET-ID] Title` (ticket from branch name).

5. **`cw review`** — Moves ticket to "Ready for QA".

6. **`cw cleanup`** — Triggers Cleanup Stale FE Namespaces (delete ephemeral namespace). Uses current branch by default; `-b` to specify branch.

## Utility commands (outside main flow)

- **`cw summary`** — AI task summary from git diffs (see [summary.md](summary.md))
- **`cw branch`** — Branch name + clipboard
- **`cw toggle`** — Switch main ↔ -stg
- **`cw sync`** — Sync main → -stg
- **`cw update`** — Merge main/staging into current branch
- **`cw push`** — Push current branch
- **`cw check`** — Typecheck, lint, prettier
