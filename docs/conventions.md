# Conventions and integrations

> See also: [src/lib/defaults.ts](../src/lib/defaults.ts)

## Branch conventions

- **Main:** `feat/ENG-123` or `fix/9082`
- **Staging:** `feat/ENG-123-stg` or `fix/9082-stg` (suffix `-stg`)
- **PR bases:** `staging` (stg) or `main`
- **Rebase is prohibited** — use merge to avoid history divergence.

## Defaults (defaults.ts)

| Category | Key | Value |
|----------|-----|-------|
| Linear | statusInProgress | "In Progress" |
| Linear | statusDevTesting | "DEV Testing" |
| Linear | statusInReview | "Ready for QA" |
| GitHub | deployFeatureWorkflowId | "172365310" |
| GitHub | destroyWorkflow | "destroy-ephemeral.yml" |
| Slack | channel | "#pr" |
| claudeCode | command | "claude run test-info" |

## GitHub integration

- **Deploy:** `gh workflow run <workflowId>` with inputs: `branch`, `build_core`, `core_branch`, `build_timesheets`, `timesheets_branch`, `enabled_socketio`
- Workflow runs from `ref: main`
- **PR:** `gh pr create` with title and body

## Linear integration

- Uses `@schpet/linear-cli` via `npx`
- Credentials in `~` (homedir)
- **`linear auth`** must be run before using commands that depend on Linear

## Slack integration

- Uses `slack` CLI to send messages
- Default channel: `#pr`
