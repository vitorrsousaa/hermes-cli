# test

> See also: [workflow.md](workflow.md), [context.md](context.md), [summary.md](summary.md)

## Synopsis

```bash
hermes test [-f|--force]
```

## Description

Moves the ticket to **DEV Testing** and triggers the ephemeral environment deploy. Copies the workflow URL to clipboard.

If `claude-api-key` is configured, also generates an AI-powered task summary from git diffs, updates the Linear ticket title, and displays the summary. The summary is cached by branch name and can be regenerated with `--force`.

## Options

| Option | Description |
|--------|-------------|
| `-f, --force` | Regenerate task summary even if cached. Ignores existing cache and calls Claude API again. |

## Prerequisites

- `gh` (GitHub CLI)
- `linear` (Linear CLI)
- Active context (run `hermes start <ticket-id>` first)

## Task summary (optional)

When `claude-api-key` is set via `hermes config set claude-api-key <key>`:

1. **Cache check** — If a cached summary exists for the current branch and `--force` is not used, loads from cache.
2. **Generate** — Otherwise collects diffs from all repos, calls Claude API, and caches the result at `/tmp/hermes-summary-{branch}.txt`.
3. **Linear** — Updates the ticket title with the AI-generated title.
4. **Output** — Displays task title, dev notes, QA instructions, tests, and summary. Shows token usage when generating fresh.

Summary generation is best-effort: if it fails, the main `test` flow (deploy + status update) still succeeds.

## Debug

With `HERMES_DEBUG=1`, additional debug output is printed to stderr:

- Context (ticketId, branch, ticketTitle)
- Claude API key status
- Cache path and force flag
- Whether using cache or generating fresh
- Aggregate diff length
- Token usage from `generateTaskSummary`
- Any summary-related errors

```bash
HERMES_DEBUG=1 hermes test
```
