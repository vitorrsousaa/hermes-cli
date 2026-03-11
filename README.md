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
- **Linear CLI** (`@schpet/linear-cli`): `npm install -g @schpet/linear-cli && linear auth`
- **Slack CLI** (optional, for `hermes review`): [https://api.slack.com/automation/cli](https://api.slack.com/automation/cli)

## Setup

Run the initial configuration:

```bash
hermes config
```

The wizard will ask for:

- Linear API key
- Linear team ID

Other values (status, Slack channel, etc.) use defaults. Customization will be implemented in the future.

Configuration is saved at `~/.hermes/config.json`.

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
hermes branch          # prints: feat/ENG-4135
hermes branch --stg    # prints: feat/ENG-4135-stg
hermes branch --copy   # prints + copies to clipboard
hermes branch -sc      # shorthand: staging suffix + copy
```

| Flag | Short | Description |
|------|-------|-------------|
| `--stg` | `-s` | Appends `-stg` suffix to the branch name |
| `--copy` | `-c` | Copies the result to clipboard |

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

### Sync branch to staging

```bash
hermes sync
```

Run from your main branch (e.g. `fix/9082`). Syncs all changes to the `-stg` counterpart:

1. Pushes the current branch
2. Checkouts or creates `fix/9082-stg`. If it exists, pulls latest
3. Merges `fix/9082` into `fix/9082-stg`
4. Pulls `staging` into `fix/9082-stg`
5. Pushes `fix/9082-stg`
6. Switches back to `fix/9082`

| Flag | Description |
|------|-------------|
| `--suffix <string>` | Custom staging suffix (default: `-stg`) |
| `--staging <branch>` | Remote branch to pull from (default: `staging`) |

## Configuration Reference

```json
{
  "linear": {
    "apiKey": "...",
    "teamId": "...",
    "statusInProgress": "In Progress",
    "statusDevTesting": "DEV Testing",
    "statusInReview": "Ready for QA"
  },
  "github": {
    "deployWorkflow": "deploy-ephemeral.yml",
    "destroyWorkflow": "destroy-ephemeral.yml"
  },
  "slack": {
    "channel": "#review"
  },
  "claudeCode": {
    "command": "claude run test-info"
  }
}
```

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
