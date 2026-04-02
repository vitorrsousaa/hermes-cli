# test

> See also: [workflow.md](workflow.md), [summary.md](summary.md)

## Synopsis

```bash
cw test [-f|--force] [-ss|--skip-summary] [-sd|--skip-deploy]
```

## Description

Moves the ticket to **DEV Testing** and (unless `--skip-deploy` is used) triggers the ephemeral environment deploy and copies the workflow URL to clipboard.

With `--skip-deploy`, the ephemeral environment is not created; only the Linear status update and optional summary run.

If `claude-api-key` is configured, also generates an AI-powered task summary from git diffs, updates the Linear ticket title, and displays the summary. The summary is cached by branch name and can be regenerated with `--force`.

**When there is no Claude API key** (or `-ss`/`--skip-summary` is passed), the summary generation and Linear ticket update are skipped. A notice is printed: *"Skipping summary generation and Linear ticket update (no Claude API key)"* or *"Skipping summary generation and Linear ticket update (--skip-summary)"*.

## Options

| Option | Description |
|--------|-------------|
| `-f, --force` | Regenerate task summary even if cached. Ignores existing cache and calls Claude API again. |
| `-ss, --skip-summary` | Skip AI summary generation and Linear ticket title update. Use when you want to run `test` without these optional steps. |
| `-sd, --skip-deploy` | Skip triggering ephemeral environment deploy. Only moves ticket to DEV Testing and optionally runs summary. |

## Prerequisites

- `gh` (GitHub CLI)
- `linear` (Linear CLI)
- Active context (run `cw start <ticket-id>` first)

## Task summary (optional)

When `claude-api-key` is set via `cw config set claude-api-key <key>` (and `-ss`/`--skip-summary` is not used):

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
HERMES_DEBUG=1 cw test
```
