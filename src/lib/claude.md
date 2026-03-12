# Lib — Shared utilities

> See also: [../../docs/context.md](../../docs/context.md), [../../docs/conventions.md](../../docs/conventions.md)

## Modules

| File | Description |
|------|-------------|
| `context.ts` | `.hermes-context.json`: load, save, getRepoRoot, ensureGitignore |
| `defaults.ts` | Constants (Linear statuses, workflows, Slack channel) |
| `errors.ts` | `HermesError(message, hint?)` |
| `git.ts` | `getCurrentBranch()`, `branchExists(branch)` |
| `github.ts` | `triggerWorkflow`, `waitForRun`, `createPr`, `copyToClipboard` |
| `linear.ts` | `fetchIssue`, `updateIssueStatus`, `extractIssueIdFromBranch`, `getIssueFromBranch` |
| `slack.ts` | `sendMessage(channel, text)` |
| `prerequisites.ts` | `checkPrerequisites(["gh", "linear", "slack"])` |
| `preview-url.ts` | `sanitizeBranchLikeWorkflow`, `getPreviewUrl` (ephemeral URL; strips -stg) |
| `spinner.ts` | `withSpinner(text, fn)` |

## github.ts — Details

- **triggerWorkflow(workflow, inputs?, options?):** Triggers via `gh workflow run`; uses `ref: main` (or inputs.branch). Returns `{ runId, url }`.
- **createPr(options):** `gh pr create`; returns `{ url, number }`.
- **copyToClipboard(text):** Best-effort; fails silently in headless/SSH.

## linear.ts — Details

- Uses `npx @schpet/linear-cli` with `cwd: homedir()`
- **extractIssueIdFromBranch(branch):** `feat/ENG-123` → `ENG-123`; `fix/9082-stg` → `9082`
- **getTicketIdFromBranch(branch):** Resolves ticket ID from branch (feat/ENG-4321, ENG-4321-stg, ENG-4321); for use in ready/status
- **getIssueFromBranch():** Fetches ticket via current branch; returns `null` if no match

## External dependencies

- **gh** — GitHub CLI
- **@schpet/linear-cli** — Linear CLI (`npx`; `linear auth` required)
- **slack** — Slack CLI (optional, for `hermes review`)
