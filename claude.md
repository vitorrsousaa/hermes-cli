# Hermes CLI — Guide for Claude

## Overview

Hermes is a CLI that automates the development workflow between **Linear** and **GitHub**, eliminating manual tasks (~15–20 min per ticket) when transitioning between stages. Written in TypeScript with Commander.js, it uses `gh` and `linear-cli` as external dependencies.

**Stack:** Node.js, TypeScript, Commander.js, execa, chalk, ora, clipboardy.

---

## Documentation

| Document | Content |
|----------|---------|
| [docs/workflow.md](docs/workflow.md) | Typical workflow |
| [docs/conventions.md](docs/conventions.md) | Branch conventions, defaults, integrations |
| [docs/development.md](docs/development.md) | Development, debug, patterns, adding commands |
| [docs/test.md](docs/test.md) | `hermes test` command |
| [docs/summary.md](docs/summary.md) | `hermes summary` command |
| [src/claude.md](src/claude.md) | Source code structure |
| [src/commands/claude.md](src/commands/claude.md) | Commands reference |
| [src/lib/claude.md](src/lib/claude.md) | Lib utilities |

---

## Project structure

```
hermes-cli/
├── claude.md              # This file
├── docs/                  # Documentation
│   ├── workflow.md
│   ├── conventions.md
│   └── development.md
├── src/
│   ├── claude.md          # src structure
│   ├── index.ts           # Entry point
│   ├── commands/
│   │   └── claude.md      # Command details
│   └── lib/
│       └── claude.md      # Utilities
├── dist/                  # Build (tsup)
└── package.json
```

---

## Important note

Hermes runs **inside an app repository** (e.g. `cw-react`), not in the `hermes-cli` folder. Commands derive ticket and branch from the current git branch (e.g. `feat/ENG-123`).
