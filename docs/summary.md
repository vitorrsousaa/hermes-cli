# summary

> See also: [workflow.md](workflow.md), [context.md](context.md), [test.md](test.md)

## Synopsis

```bash
hermes summary [-f|--force]
```

## Description

Generates an AI-powered task summary from git diffs across all configured repositories. Uses Claude API to produce a structured template (task title, dev notes, QA instructions, tests) from the changes since `main`.

Requires `claude-api-key` to be configured. Run `hermes config` e informe a sua key quando solicitado (ou use `hermes config set claude-api-key <your-key>`). 

## Options

| Option | Description |
|--------|-------------|
| `-f, --force` | Regenerate even if cached. Ignores existing cache and calls Claude API again. |

## Cache

- **Path** — `/tmp/hermes-summary-{branch}.txt` (branch name with `/` replaced by `-`)
- **Format** — JSON
- **Key** — Current git branch (from `git rev-parse --abbrev-ref HEAD`)

Without `--force`, returns cached content if available. With `--force`, always regenerates.

## Context

If `.hermes-context.json` exists (from `hermes start`), the ticket ID and title are passed to Claude for better output. If no context exists, the command still runs but without ticket context.

## Output

- Task title
- What was implemented (dev notes)
- Where to access (QA navigation)
- How to test (QA instructions)
- Developer tests (checklist)
- QA tests (checklist)
- Task summary (stakeholder-friendly)

When generating fresh, also displays token usage (input/output).
