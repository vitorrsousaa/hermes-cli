# Hermes CLI

CLI to automate the development workflow between Linear and GitHub, eliminating manual administrative overhead (~15-20min per ticket) when transitioning between stages.

## Installation

```bash
npm install -g @vitorrsousaa/hermes
```

Or via `npm link` for development:

```bash
npm run build && npm link
```

## Prerequisites

- **GitHub CLI** (`gh`): [https://cli.github.com/](https://cli.github.com/)
- **Linear CLI** (`@schpet/linear-cli`): required for `cw start`, `cw prc`, etc.

  ```bash
  npm install -g @schpet/linear-cli
  linear auth
  ```

  Run `linear auth` first — cw uses the Linear CLI's stored credentials.

- **Claude API key** (optional, for `cw test` summary): configure via `cw config` (guided, interactive) or directly with `cw config set claude-api-key <key>`. The key is stored locally in `~/.hermes-config.json`. Without it, `cw test` skips AI summary generation and Linear ticket update. Use `-ss` or `--skip-summary` to skip these steps explicitly.

### Configuração (`cw config`)

- **Interactive configuration**: Run `cw config` to configure Hermes settings via prompts (currently the Claude API key).
- **Set directly**: Use `cw config set claude-api-key <key>` to set the key without prompts.

## Full Workflow

### 1. Start working on a ticket

```bash
cw start <ticket-id>
```

- Fetches the ticket from Linear
- Moves it to "In Progress"
- Creates branch `feat/<id>` or `fix/<id>` (use `--type fix` for fix)

### 2. Deploy ephemeral environment

```bash
cw deployfe
cw deployfe -sc                  # same branch for cw-core as cw-react (--same-core)
cw deployfe -c                   # also build cw-core (branch: main)
cw deployfe -c feat/xyz          # build cw-core from feat/xyz
cw deployfe -t                   # also build cw-ms-timesheets (branch: main)
cw deployfe --no-socketio        # disable Socket.IO (enabled by default)
```

- Triggers the "Deploy Feature Environment" workflow
- React branch: current branch (or `-r <branch>`)
- Core/Timesheets: `main` by default when `-c`/`-t` are used
- Socket.IO: enabled by default

### 3. Deploy ephemeral environment and move ticket to DEV Testing

```bash
cw test
cw test -ss                       # Skip AI summary and Linear ticket update (-ss / --skip-summary)
cw test -sd                      # Skip ephemeral environment; only move ticket + optional summary (--skip-deploy)
cw test -c                       # Also build cw-core (branch: main)
cw test -c feat/xyz -t feat/abc  # Build core from feat/xyz, timesheets from feat/abc
```

- Uses **current branch** for React and for the Linear ticket (derived from branch name `feat/XXX` or `fix/XXX`).
- Core/Timesheets: `main` by default; use `-c` / `-t` with optional branch to build them.
- Triggers the deploy workflow, moves ticket to "DEV Testing", copies workflow URL.
- **Optional summary**: If `claude-api-key` is set (via `cw config` or `cw config set claude-api-key <key>`), generates AI task summary and updates Linear title. If the API key is not configured, these summary steps are automatically skipped (equivalent to running with `--skip-summary`). Use `-ss` or `--skip-summary` to skip even when a key is configured.

### 4. Create pull request

```bash
cw prc
cw prc -t main
cw prc -t both
cw prc -d
cw prc -t main -d
```

Creates PR(s) with title `[TICKET-ID] Title` and pre-filled template. Uses ticket info from the current branch name (e.g. `feat/ENG-123`). Copies URL to clipboard.

For `-t stg`: uses the branch with `-stg` suffix (e.g. `feat/ENG-123-stg`). If it doesn't exist, creates it from the current branch and pushes before opening the PR.

| Flag | Short | Description |
|------|-------|-------------|
| `--target <stg\|main\|both>` | `-t` | Target branch: stg (default), main, or both |
| `--draft` | `-d` | Create as draft PR |

### 5. Request review

```bash
cw review
```

- Moves ticket to "Ready for QA"

### 5b. Move ticket to Ready for QA

```bash
cw ready
```

- Moves ticket from "DEV Testing" to "Ready for QA"
- Use when you've finished testing and want to hand off to QA

### 6. Tear down ephemeral environment

```bash
cw cleanup              # Clean up namespace for current branch
cw cleanup -b feat/xyz  # Clean up namespace for specific branch
```

- Uses **current branch** by default; `-b` to specify another. Triggers Cleanup Stale FE Namespaces workflow.

### 7. Clear summary cache

```bash
cw clear-cache          # Clear cache for current branch
cw clear-cache -b feat/xyz
cw clear-cache --all    # Clear all cw summary caches
```

## Utilities

### Get current branch name

```bash
cw branch          # prints + copies to clipboard: feat/ENG-4135
cw branch --stg    # prints + copies: feat/ENG-4135-stg
cw branch --no-copy # prints only (no copy)
cw branch -s       # shorthand: staging suffix + copy
```

| Flag | Short | Description |
|------|-------|-------------|
| `--stg` | `-s` | Appends `-stg` suffix to the branch name |
| `--no-copy` | | Do not copy to clipboard (copy is default) |

Useful as a shortcut instead of terminal aliases or scripts.

### Toggle between main and staging branch

```bash
cw toggle
```

Switches between the main branch and its staging counterpart (`-stg` suffix):

- On `feat/ENG-123` → checks out `feat/ENG-123-stg`
- On `feat/ENG-123-stg` → checks out `feat/ENG-123`

| Flag | Description |
|------|-------------|
| `--suffix <string>` | Custom staging suffix (default: `-stg`) |

Example with custom suffix:

```bash
cw toggle --suffix -staging
```

### Push current branch

```bash
cw push
```

Pushes the current branch to origin. No need to type the branch name.

### Update branch with main or staging

```bash
cw update
cw update -t main
cw update -t stg
```

Merges `origin/main` or `origin/staging` into the current branch.

| Flag | Short | Description |
|------|-------|-------------|
| `--target <main\|stg>` | `-t` | Branch to merge from (default: stg) |

### Sync branch to staging

```bash
cw sync
```

Run from your main branch (e.g. `fix/9082`) or from the `-stg` branch. Syncs all changes to the `-stg` counterpart:

1. Pushes the main branch
2. Checkouts or creates `fix/9082-stg`. If it exists, pulls latest (or if already on `-stg`, just pulls)
3. Merges `fix/9082` into `fix/9082-stg`
4. Merges `staging` into `fix/9082-stg` (normal merge; squash was removed as it could bring unrelated files)
5. Pushes `fix/9082-stg`
6. Switches back to `fix/9082` (only when started from main)

| Flag | Description |
|------|-------------|
| `--suffix <string>` | Custom staging suffix (default: `-stg`) |
| `--staging <branch>` | Remote branch to pull from (default: `staging`) |

## Git Conventions

**Rebase is prohibited.** Do not use `git rebase` or `git pull --rebase` in workflows involving Hermes branches. Hermes uses merge-based workflows; rebase can cause history divergence and inconsistent PR diffs.

## Development

```bash
npm install
npm run build
npm run dev   # watch mode
```

## Debug

To see stack traces on unexpected errors:

```bash
HERMES_DEBUG=1 cw <command>
```
