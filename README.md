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
cw deployfe -r feat/ENG-1234     # React branch (default: current branch)
cw deployfe -c feat/xyz            # cw-core from feat/xyz (default branch: main)
cw deployfe -t feat/abc          # cw-ms-timesheets from feat/abc (default branch: main)
cw deployfe -sc                  # cw-core uses same branch as cw-react (--same-core)
cw deployfe --no-socketio        # disable Socket.IO deploy (enabled by default)
```

- Triggers the "Deploy Feature Environment" workflow.
- **React:** branch atual ou `-r <branch>`.
- **cw-core e cw-ms-timesheets:** o workflow **sempre** inclui build dos dois. Se não passares branch em `-c` ou `-t`, o Hermes envia **`main`** como branch de cada serviço. Usa `-c <branch>` / `-t <branch>` para outra branch; usa `--same-core` (`-sc`) para o core usar a **mesma** branch que o React (em vez de `main`).
- **Socket.IO (cw-socketio):** por defeito **ligado** — não precisas de passar nenhum parâmetro para incluir o deploy do Socket.IO. Só usa **`--no-socketio`** quando quiseres **desligar**.

### 3. Create pull request

```bash
cw prc
cw prc -t main
cw prc -t both
cw prc -d
cw prc -t main -d
```

Creates PR(s) with title `[TICKET-ID] Title` and pre-filled template. Uses ticket info from the current branch name (e.g. `feat/ENG-123`). Copies URL to clipboard. **Assignee:** each PR is assigned to you (the authenticated `gh` user) via `--assignee @me` — you do not need to pass anything extra.

For `-t stg`: uses the branch with `-stg` suffix (e.g. `feat/ENG-123-stg`). If it doesn't exist, creates it from the current branch and pushes before opening the PR.

| Flag | Short | Description |
|------|-------|-------------|
| `--target <stg\|main\|both>` | `-t` | Target branch: stg (default), main, or both |
| `--draft` | `-d` | Create as draft PR |

### 4. Request review

```bash
cw review
```

- Moves ticket to "Ready for QA"

### 4b. Move ticket to Ready for QA

```bash
cw ready
```

- Moves ticket from "DEV Testing" to "Ready for QA"
- Use when you've finished testing and want to hand off to QA

### 5. Tear down ephemeral environment

```bash
cw cleanup              # Clean up namespace for current branch
cw cleanup -b feat/xyz  # Clean up namespace for specific branch
```

- Uses **current branch** by default; `-b` to specify another. Triggers Cleanup Stale FE Namespaces workflow.

### 6. Clear summary cache

```bash
cw clear-cache          # Clear cache for current branch
cw clear-cache -b feat/xyz
cw clear-cache --all    # Clear all cw summary caches
```

## Utilities

### `copyb` — copy branch name

`cw copyb` prints the current Git branch and copies it to the clipboard by default (short for “copy branch”). Handy for pasting branch names into deploys, PRs, or Linear without typing or selecting manually.

```bash
cw copyb           # prints + copies to clipboard: feat/ENG-4135
cw copyb --stg     # prints + copies: feat/ENG-4135-stg
cw copyb --no-copy # prints only (no copy)
cw copyb -s        # shorthand: staging suffix + copy
```

| Flag | Short | Description |
|------|-------|-------------|
| `--stg` | `-s` | Appends `-stg` suffix to the branch name |
| `--no-copy` | | Do not copy to clipboard (copy is default) |

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
cw update              # merges origin/main (default)
cw update -t main
cw update -t stg       # merges origin/staging
```

Merges `origin/main` or `origin/staging` into the current branch.

| Flag | Short | Description |
|------|-------|-------------|
| `--target <main\|stg>` | `-t` | Branch to merge from (default: main) |

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
