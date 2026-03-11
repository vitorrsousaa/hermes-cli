# Hermes CLI

CLI to automate the development workflow between Linear, GitHub, and Slack, eliminating manual administrative overhead (~15-20min per ticket) when transitioning between stages.

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
- **Linear CLI** (`@schpet/linear-cli`): required for `hermes start`, `hermes prc`, etc.

  ```bash
  npm install -g @schpet/linear-cli
  linear auth
  ```

  Run `linear auth` first — hermes uses the Linear CLI's stored credentials.

- **Slack CLI** (optional, for `hermes review`): [https://api.slack.com/automation/cli](https://api.slack.com/automation/cli)

## Full Workflow

### 1. Start working on a ticket

```bash
hermes start <ticket-id>
```

- Fetches the ticket from Linear
- Moves it to "In Progress"
- Creates branch `feat/<id>` or `fix/<id>` (use `--type fix` for fix)
- Saves context to `.hermes-context.json`

### 2. Deploy ephemeral environment

```bash
hermes deployfe
hermes deployfe -c                    # also build cw-core (branch: main)
hermes deployfe -c feat/xyz           # build cw-core from feat/xyz
hermes deployfe -t                    # also build cw-ms-timesheets (branch: main)
hermes deployfe --no-socketio         # disable Socket.IO (enabled by default)
```

- Triggers the "Deploy Feature Environment" workflow
- React branch: current branch (or `-r <branch>`)
- Core/Timesheets: `main` by default when `-c`/`-t` are used
- Socket.IO: enabled by default

### 3. Deploy ephemeral environment and move ticket to DEV Testing

```bash
hermes test
```

- Triggers the deploy workflow on GitHub Actions
- Moves ticket to "DEV Testing"
- Copies the workflow run URL to clipboard

### 4. Create pull request

```bash
hermes prc
hermes prc -t main
hermes prc -t both
hermes prc -d
hermes prc -t main -d
```

Creates PR(s) with title `[TICKET-ID] Title` and pre-filled template. Uses ticket info from context (`.hermes-context.json`) or from the current branch name. Copies URL to clipboard and saves `prUrl` and `prNumber` to context.

For `-t stg`: uses the branch with `-stg` suffix (e.g. `feat/ENG-123-stg`). If it doesn't exist, creates it from the current branch and pushes before opening the PR.

| Flag | Short | Description |
|------|-------|-------------|
| `--target <stg\|main\|both>` | `-t` | Target branch: stg (default), main, or both |
| `--draft` | `-d` | Create as draft PR |

### 5. Request review

```bash
hermes review
```

- Sends a message on Slack with PR link and preview
- Moves ticket to "Ready for QA"

### 6. Tear down ephemeral environment

```bash
hermes stop
```

- Triggers the destroy workflow
- Removes `ephemeralEnvUrl` from context

## Utilities

### Get current branch name

```bash
hermes branch          # prints + copies to clipboard: feat/ENG-4135
hermes branch --stg    # prints + copies: feat/ENG-4135-stg
hermes branch --no-copy # prints only (no copy)
hermes branch -s       # shorthand: staging suffix + copy
```

| Flag | Short | Description |
|------|-------|-------------|
| `--stg` | `-s` | Appends `-stg` suffix to the branch name |
| `--no-copy` | | Do not copy to clipboard (copy is default) |

Useful as a shortcut instead of terminal aliases or scripts.

### Toggle between main and staging branch

```bash
hermes toggle
```

Switches between the main branch and its staging counterpart (`-stg` suffix):

- On `feat/ENG-123` → checks out `feat/ENG-123-stg`
- On `feat/ENG-123-stg` → checks out `feat/ENG-123`

| Flag | Description |
|------|-------------|
| `--suffix <string>` | Custom staging suffix (default: `-stg`) |

Example with custom suffix:

```bash
hermes toggle --suffix -staging
```

### Push current branch

```bash
hermes push
```

Pushes the current branch to origin. No need to type the branch name.

### Update branch with main or staging

```bash
hermes update
hermes update -t main
hermes update -t stg
```

Merges `origin/main` or `origin/staging` into the current branch.

| Flag | Short | Description |
|------|-------|-------------|
| `--target <main\|stg>` | `-t` | Branch to merge from (default: stg) |

### Sync branch to staging

```bash
hermes sync
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
HERMES_DEBUG=1 hermes <command>
```
