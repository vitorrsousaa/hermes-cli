# Commands

> See also: [../lib/claude.md](../lib/claude.md), [../../docs/workflow.md](../../docs/workflow.md)

## Quick reference

| Command | File | Prereq | Context | Description |
|---------|------|--------|---------|-------------|
| `start` | start.ts | gh, linear | Creates | Creates branch and context |
| `deployfe` | deploy.ts | gh | No | Triggers deploy workflow |
| `test` | test.ts | gh, linear | Yes | Deploy + status DEV Testing |
| `cleanup` | cleanup.ts | gh | Optional | Triggers Cleanup Stale FE Namespaces workflow |
| `prc` | pr-create.ts | gh, linear | Fallback | Creates PR(s) |
| `review` | review.ts | linear, slack | Yes | Slack + status Ready for QA |
| `ready` | ready.ts | linear | Yes | Status DEV Testing → Ready for QA |
| `branch` | branch.ts | — | No | Branch name ± clipboard |
| `toggle` | toggle.ts | — | No | Switch main ↔ -stg |
| `sync` | sync.ts | — | No | Sync main → -stg |
| `update` | update.ts | — | No | Merge main/staging into branch |
| `push` | push.ts | — | No | Push current branch |
| `check` | check.ts | — | No | Typecheck, lint, prettier |
| `summary` | summary.ts | claude-api-key | Optional | AI task summary from diffs |

## Per-command details

### start

- `hermes start <ticket-id> [-t feat|fix]`
- Creates branch `feat/<id>` or `fix/<id>` from `main`
- Saves context; adds `.hermes-context.json` to `.gitignore`

### deployfe

- `hermes deployfe [-r branch] [-c [branch]] [-t [branch]] [--no-socketio]`
- `-r`: React branch (default: current)
- `-c`: build cw-core (default: main)
- `-t`: build cw-ms-timesheets (default: main)
- `--no-socketio`: disable Socket.IO

### test

- `hermes test [-f|--force]`
- Triggers deploy with branch from context
- Moves ticket to "DEV Testing"
- Copies workflow URL to clipboard
- Optionally generates AI task summary (if `claude-api-key` set); `-f` regenerates even if cached
- See [../../docs/test.md](../../docs/test.md)

### cleanup

- `hermes cleanup [-b branch]`
- Triggers Cleanup Stale FE Namespaces workflow (delete-dynamic-env.yaml)
- Uses branch from context, or current branch, or `-b` to specify
- Use when you need to manually clean up an ephemeral namespace (e.g. from GitHub Actions)

### prc

- `hermes prc [-t stg|main|both] [-d]`
- `-t stg`: PR to `staging` (uses `-stg` branch if it exists)
- `-t main`: PR to `main`
- `-t both`: two PRs
- `-d`: draft PR
- Title: `[TICKET-ID] Title`

### review

- `hermes review`
- Requires `prUrl` in context (run `hermes prc` first)
- Sends message on Slack #pr
- Moves ticket to "Ready for QA"

### ready

- `hermes ready`
- Moves ticket from "DEV Testing" to "Ready for QA"
- No Slack message; use when handing off to QA without review request

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

### check

- `hermes check`
- Runs: typecheck, lint:fix, prettier:fix
- If lint/prettier modify files, auto-commits them

### summary

- `hermes summary [-f|--force]`
- Generates AI task summary from git diffs (requires `claude-api-key`)
- `-f`: regenerate even if cached
- See [../../docs/summary.md](../../docs/summary.md)
