# test

> See also: [workflow.md](workflow.md)

## Synopsis

```bash
cw test [-sd|--skip-deploy] [-c [branch]] [-t [branch]]
```

## Description

Moves the ticket to **DEV Testing** and (unless `--skip-deploy` is used) triggers the ephemeral environment deploy and copies the workflow URL to clipboard.

## Options

| Option | Description |
|--------|-------------|
| `-sd, --skip-deploy` | Skip triggering ephemeral environment deploy. Only moves ticket to DEV Testing. |
| `-c, --core [branch]` | Build cw-core; optional branch (default: main). |
| `-t, --timesheets [branch]` | Build cw-ms-timesheets; optional branch (default: main). |

## Prerequisites

- `gh` (GitHub CLI)
- `linear` (Linear CLI)

## Debug

```bash
HERMES_DEBUG=1 cw test
```
