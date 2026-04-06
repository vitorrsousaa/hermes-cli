# Commands

> See also: [../lib/claude.md](../lib/claude.md), [../../docs/workflow.md](../../docs/workflow.md)

## Quick reference

| Command | File | Prereq | Context | Description |
|---------|------|--------|---------|-------------|
| `start` | start.ts | gh, linear | No | Creates branch |
| `deployfe` | deploy.ts | gh | No | Triggers deploy workflow |
| `rebuild` | rebuild.ts | gh | No | Rebuild ephemeral env (push + retrigger; -stg stripped) |
| `test` | test.ts | gh, linear | No | Deploy + status DEV Testing (uses current branch) |
| `cleanup` | cleanup.ts | gh | No | Cleanup Stale FE Namespaces (current branch or -b) |
| `preview-url` | preview-url.ts | — | No | Ephemeral preview URL + copy to clipboard (-stg stripped) |
| `prc` | pr-create.ts | gh, linear | No | Creates PR(s) (ticket from branch); assigns PR to you (`--assignee @me`) |
| `review` | review.ts | linear | No | Status Ready for QA (ticket/PR from branch) |
| `ready` | ready.ts | linear | No | Status DEV Testing → Ready for QA (ticket from branch or -b) |
| `task status` | task-status.ts | linear | No | Show task ID, title, URL, status (branch or -b) |
| `task move` | task-move.ts | linear | No | Change task status via list (branch or -b) |
| `copyb` | copyb.ts | — | No | Branch name ± clipboard |
| `toggle` | toggle.ts | — | No | Switch main ↔ -stg |
| `sync` | sync.ts | — | No | Sync main → -stg |
| `update` | update.ts | — | No | Merge main/staging into branch (default: main) |
| `push` | push.ts | — | No | Push current branch |
| `co` | checkout.ts | — | No | Checkout branch (like git checkout; -b to create) |
| `check` | check.ts | — | No | Typecheck, lint, prettier |
| `summary` | summary.ts | linear | No | Post @summarizer comment on Linear task |

## Per-command details

### start

- `cw start <ticket-id> [-t feat|fix]`
- Creates branch `feat/<id>` or `fix/<id>` from `main`

### deployfe

- `cw deployfe [-r branch] [-c [branch]] [-sc|--same-core] [-t [branch]] [--no-socketio]`
- `-r`: React branch (default: current)
- **cw-core / cw-ms-timesheets:** sempre enviados para build; branch **`main`** para cada um se não especificares `-c` / `-t` (ou o nome de branch opcional a seguir a essas flags).
- `-c [branch]`: branch do cw-core (omitir o valor ⇒ `main`)
- `-sc, --same-core`: cw-core usa a mesma branch que o React (ignora o default `main` para o core)
- `-t [branch]`: branch do cw-ms-timesheets (omitir o valor ⇒ `main`)
- **Socket.IO:** ligado por defeito — não é preciso parâmetro para incluir o deploy; só `--no-socketio` para desligar

### test

- `cw test [-sd|--skip-deploy] [-c [branch]] [-t [branch]]`
- Uses **current branch** for deploy and for Linear ticket (extracted from branch name).
- Core/timesheets: default `main`; `-c` / `-t` with optional branch to build.
- Moves ticket to "DEV Testing" (skips if branch is not feat/XXX or fix/XXX).
- See [../../docs/test.md](../../docs/test.md)

### rebuild

- `cw rebuild [-r branch] [-c branch] [-t branch]`
- `-r`: cw-react branch (default: current branch, `-stg` stripped)
- `-c <branch>`: cw-core branch — **enables** core build with that branch
- `-t <branch>`: cw-ms-timesheets branch — **enables** timesheets build with that branch
- Without any flag: only the react branch is sent; core and timesheets are skipped (`build_core=false`, `build_timesheets=false`)
- Pushes the react branch, then triggers Deploy Feature Environment. Copies workflow URL to clipboard.
- See [../../docs/rebuild.md](../../docs/rebuild.md)

### cleanup

- `cw cleanup [-b branch]`
- Uses **current branch** by default; `-b` to specify. Triggers Cleanup Stale FE Namespaces workflow.

### preview-url

- `cw preview-url [-b branch]`
- Prints ephemeral app URL (`https://app-{sanitized}.preview.carewebs.com`) and copies to clipboard.
- Uses same branch sanitization as deploy-feature-env workflow; if branch has `-stg`, URL uses name without `-stg`.

### prc

- `cw prc [-t stg|main|both] [-d]`
- `-t stg`: PR to `staging` (uses `-stg` branch if it exists)
- `-t main`: PR to `main`
- `-t both`: two PRs
- `-d`: draft PR
- Title: `[TICKET-ID] Title`
- PR is always assigned to the authenticated GitHub user (`gh pr create --assignee @me`)

### review

- `cw review`
- Requires a PR for current branch (run `cw prc` first). Gets ticket from branch, PR URL via `gh pr view`.
- Moves ticket to "Ready for QA"

### ready

- `cw ready [-b branch]`
- Moves ticket from "DEV Testing" to "Ready for QA"
- Without `-b`: derives ticket from current branch. With `-b`: derives ticket from given branch (e.g. `feat/ENG-4321`, `ENG-4321-stg`, `ENG-4321`).
- Use when you want to hand off to QA (e.g. without running `cw review` first)

### task status

- `cw task status [-b branch]`
- Shows current task: title, URL, status. Ticket ID from current branch or `-b`.
- Prereq: linear (run linear auth first).

### task move

- `cw task move [-b branch]`
- Changes task status; user selects new status from a list (In Progress, DEV Testing, Ready for QA).
- Ticket from current branch or `-b`. Prereq: linear.

### copyb

- `cw copyb [-s] [--no-copy]`
- `-s`: add `-stg` suffix
- `--no-copy`: do not copy to clipboard

### toggle

- `cw toggle [--suffix <string>]`
- Switches between main branch and `-stg`
- Default suffix: `-stg`

### sync

- `cw sync [--suffix <string>] [--staging <branch>]`
- Push main → create/checkout -stg → merge main → merge staging → push -stg

### update

- `cw update [-t main|stg]` — default: merge `origin/main`; use `-t stg` for `origin/staging`
- Merges `origin/main` or `origin/staging` into current branch

### push

- `cw push`
- Pushes current branch to origin

### co (checkout)

- `cw co <branch>` — Switch to existing branch (like `git checkout <branch>`). Works from any branch.
- `cw co -b <branch>` — Checkout main, pull origin main (ff-only), then create and switch to new branch. Ensures new branch is always from up-to-date main.

### check

- `cw check`
- Runs: typecheck, lint:fix, prettier:fix
- If lint/prettier modify files, auto-commits them

### summary

- `cw summary`
- Posts `@summarizer` comment on the Linear task (ticket ID from current branch)
- Requires branch to be `feat/ENG-XXXX` or `fix/ENG-XXXX`
- See [../../docs/summary.md](../../docs/summary.md)
