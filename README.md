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

### 2. Deploy ephemeral environment and update ticket

```bash
hermes test
```

- Triggers the deploy workflow on GitHub Actions
- Generates test information with Claude Code
- Updates the ticket description on Linear
- Moves to "DEV Testing"
- Waits for deploy completion (polling with exponential backoff)
- Extracts the ephemeral environment URL from logs

### 3. Create pull request

```bash
hermes pr
```

- Creates PR with title `[TICKET-ID] Title` and pre-filled template
- Copies URL to clipboard
- Saves `prUrl` and `prNumber` to context

### Create PR to staging or main

```bash
hermes prc
hermes prc -t main
hermes prc -t both
hermes prc -d
hermes prc -t main -d
```

Creates PR(s) using ticket info from context (`.hermes-context.json`) or from the current branch name

| Flag | Short | Description |
|------|-------|-------------|
| `--target <stg\|main\|both>` | `-t` | Target branch: stg (default), main, or both |
| `--draft` | `-d` | Create as draft PR |

### 4. Request review

```bash
hermes review
```

- Sends a message on Slack with PR link and preview
- Moves ticket to "Ready for QA"

### 5. Tear down ephemeral environment

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
4. Merges `staging` into `fix/9082-stg` (squash)
5. Pushes `fix/9082-stg`
6. Switches back to `fix/9082` (only when started from main)

| Flag | Description |
|------|-------------|
| `--suffix <string>` | Custom staging suffix (default: `-stg`) |
| `--staging <branch>` | Remote branch to pull from (default: `staging`) |

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
