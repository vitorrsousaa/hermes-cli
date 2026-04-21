# Workflow

> See also: [conventions.md](conventions.md) (branch conventions)

## Typical sequence

1. **`cw start <ticket-id>`** — Fetches ticket from Linear, moves to "In Progress", creates branch `feat/<id>` or `fix/<id>`.

2. **`cw deployfe`** — Triggers "Deploy Feature Environment" workflow. React branch: current branch (`-r` to override). **cw-core** and **cw-ms-timesheets** are always built; if you do not pass a branch with `-c` / `-t`, Hermes sends **`main`** for each. Use `-c <branch>` / `-t <branch>` to override; `--same-core` makes cw-core use the same branch as React. **Socket.IO** is enabled by default (no flag needed); use `--no-socketio` to disable.

3. **`cw test`** — Uses current branch; triggers deploy, moves ticket to "DEV Testing", copies workflow URL. Optional `-c`/`-t` for core/timesheets (default: main).

4. **`cw prc`** — Creates PR(s) to stg/main/both with title `[TICKET-ID] Title` (ticket from branch name).

5. **`cw review`** — Moves ticket to "Ready for QA".

6. **`cw cleanup`** — Triggers Cleanup Stale FE Namespaces (delete ephemeral namespace). Uses current branch by default; `-b` to specify branch.

## Utility commands (outside main flow)

- **`cw summary`** — Post `@summarizer` comment on the Linear task (see [summary.md](summary.md))
- **`cw copyb`** — Branch name + clipboard (`copyb` = copy branch)
- **`cw toggle`** — Switch main ↔ -stg
- **`cw sync`** — Sync main → -stg
- **`cw update`** — Merge into current branch (default: `main`; `-t stg` for staging)
- **`cw push`** — Push current branch
- **`cw check`** — Typecheck, lint, prettier (see [check.md](check.md))
