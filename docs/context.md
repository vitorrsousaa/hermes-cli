# Context (`.hermes-context.json`)

> See also: [workflow.md](workflow.md), [src/lib/context.ts](../src/lib/context.ts)

## Location

File at the **Git repository root** where Hermes is run (e.g. `cw-react`). Path is obtained via `git rev-parse --show-toplevel`.

## Structure

```json
{
  "ticketId": "ENG-4579",
  "ticketTitle": "ENG-4579: Ticket title",
  "ticketUrl": "https://linear.app/issue/ENG-4579",
  "branch": "feat/ENG-4579",
  "ephemeralEnvUrl": null,
  "prUrl": null,
  "prNumber": null,
  "startedAt": "2026-03-11T19:37:17.566Z"
}
```

## API (context.ts)

| Function | Description |
|----------|-------------|
| `loadContext()` | Reads file; fails if missing (hint: run `hermes start`) |
| `saveContext(ctx)` | Persists changes |
| `ensureGitignore()` | Ensures `.hermes-context.json` is in `.gitignore` |
| `getRepoRoot()` | Returns Git repo root |

## Commands that use context

- **`test`** — uses current branch (no context for branch)
- **`cleanup`** — uses current branch (no context)
- **`review`** — ticketId, ticketTitle, prUrl, ephemeralEnvUrl
- **`prc`** — fallback for ticketId/ticketTitle when context exists; otherwise uses branch to fetch from Linear
