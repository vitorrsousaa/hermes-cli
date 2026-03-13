# Commands

> See also: [../lib/claude.md](../lib/claude.md), [../../docs/workflow.md](../../docs/workflow.md)

## Quick reference

| Command | File | Prereq | Context | Description |
|---------|------|--------|---------|-------------|
| `config` | config.ts | — | No | Configure Hermes keys (interactive) |
| `start` | start.ts | gh, linear | No | Creates branch |
| `deployfe` | deploy.ts | gh | No | Triggers deploy workflow |
| `test` | test.ts | gh, linear | No | Deploy + status DEV Testing (uses current branch) |
| `cleanup` | cleanup.ts | gh | No | Cleanup Stale FE Namespaces (current branch or -b) |
| `preview-url` | preview-url.ts | — | No | Ephemeral preview URL + copy to clipboard (-stg stripped) |
| `clear-cache` | clear-cache.ts | — | No | Remove summary cache (branch or --all) |
| `prc` | pr-create.ts | gh, linear | No | Creates PR(s) (ticket from branch) |
| `review` | review.ts | linear | No | Status Ready for QA (ticket/PR from branch) |
| `ready` | ready.ts | linear | No | Status DEV Testing → Ready for QA (ticket from branch or -b) |
| `task status` | task-status.ts | linear | No | Show task ID, title, URL, status (branch or -b) |
| `task move` | task-move.ts | linear | No | Change task status via list (branch or -b) |
| `branch` | branch.ts | — | No | Branch name ± clipboard |
| `toggle` | toggle.ts | — | No | Switch main ↔ -stg |
| `sync` | sync.ts | — | No | Sync main → -stg |
| `update` | update.ts | — | No | Merge main/staging into branch |
| `push` | push.ts | — | No | Push current branch |
| `co` | checkout.ts | — | No | Checkout branch (like git checkout; -b to create) |
| `check` | check.ts | — | No | Typecheck, lint, prettier |
| `summary` | summary.ts | claude-api-key | Optional | AI task summary from diffs |

## Per-command details

### start

- `hermes start <ticket-id> [-t feat|fix]`
- Creates branch `feat/<id>` or `fix/<id>` from `main`

### deployfe

- `hermes deployfe [-r branch] [-c [branch]] [-sc|--same-core] [-t [branch]] [--no-socketio]`
- `-r`: React branch (default: current)
- `-c`: build cw-core (default: main)
- `-sc, --same-core`: use same branch for cw-core as cw-react
- `-t`: build cw-ms-timesheets (default: main)
- `--no-socketio`: disable Socket.IO

### test

- `hermes test [-f|--force] [--skip-summary] [-c [branch]] [-t [branch]]`
- Uses **current branch** for deploy and for Linear ticket (extracted from branch name).
- Core/timesheets: default `main`; `-c` / `-t` with optional branch to build.
- Moves ticket to "DEV Testing" (skips if branch is not feat/XXX or fix/XXX).
- Optionally generates AI task summary; `-f` regenerates even if cached.
- See [../../docs/test.md](../../docs/test.md)

### cleanup

- `hermes cleanup [-b branch]`
- Uses **current branch** by default; `-b` to specify. Triggers Cleanup Stale FE Namespaces workflow.

### preview-url

- `hermes preview-url [-b branch]`
- Prints ephemeral app URL (`https://app-{sanitized}.preview.carewebs.com`) and copies to clipboard.
- Uses same branch sanitization as deploy-feature-env workflow; if branch has `-stg`, URL uses name without `-stg`.

### clear-cache

- `hermes clear-cache [-b branch] [--all]`
- Removes summary cache for current branch (or `-b`), or `--all` for every branch.

### prc

- `hermes prc [-t stg|main|both] [-d]`
- `-t stg`: PR to `staging` (uses `-stg` branch if it exists)
- `-t main`: PR to `main`
- `-t both`: two PRs
- `-d`: draft PR
- Title: `[TICKET-ID] Title`

### review

- `hermes review`
- Requires a PR for current branch (run `hermes prc` first). Gets ticket from branch, PR URL via `gh pr view`.
- Moves ticket to "Ready for QA"

### ready

- `hermes ready [-b branch]`
- Moves ticket from "DEV Testing" to "Ready for QA"
- Without `-b`: derives ticket from current branch. With `-b`: derives ticket from given branch (e.g. `feat/ENG-4321`, `ENG-4321-stg`, `ENG-4321`).
- Use when you want to hand off to QA (e.g. without running `hermes review` first)

### task status

- `hermes task status [-b branch]`
- Shows current task: title, URL, status. Ticket ID from current branch or `-b`.
- Prereq: linear (run linear auth first).

### task move

- `hermes task move [-b branch]`
- Changes task status; user selects new status from a list (In Progress, DEV Testing, Ready for QA).
- Ticket from current branch or `-b`. Prereq: linear.

### branch

- `hermes branch [-s] [--no-copy]`
- `-s`: add `-stg` suffix
- `--no-copy`: do not copy to clipboard

### toggle

- `hermes toggle [--suffix <string>]`
- Switches between main branch and `-stg`
- Default suffix: `-stg`

### sync

- `hermes sync [--suffix <string>] [--staging <branch>]`
- Push main → create/checkout -stg → merge main → merge staging → push -stg

### update

- `hermes update [-t main|stg]`
- Merges `origin/main` or `origin/staging` into current branch

### push

- `hermes push`
- Pushes current branch to origin

### co (checkout)

- `hermes co <branch>` — Switch to existing branch (like `git checkout <branch>`). Works from any branch.
- `hermes co -b <branch>` — Checkout main, pull origin main (ff-only), then create and switch to new branch. Ensures new branch is always from up-to-date main.

### check

- `hermes check`
- Runs: typecheck, lint:fix, prettier:fix
- If lint/prettier modify files, auto-commits them

### summary

- `hermes summary [-f|--force]`
- Generates AI task summary from git diffs (requires `claude-api-key`)
- `-f`: regenerate even if cached
- See [../../docs/summary.md](../../docs/summary.md)
