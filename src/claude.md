# Source code structure

> See also: [commands/claude.md](commands/claude.md), [lib/claude.md](lib/claude.md), [../docs/](../docs/)

## Overview

```
src/
├── index.ts           # Entry point, registers commands (Commander)
├── commands/          # One file per command
│   └── claude.md      # Details for each command
└── lib/               # Shared utilities
    └── claude.md      # Details for each module
```

## index.ts

- Creates `program` with Commander
- Registers each command with `.command()`, `.option()`, `.action()`
- Handles `HermesError` (message + hint) and unexpected errors
- `HERMES_DEBUG=1` shows stack trace on unexpected errors

## Execution flow

1. `program.parseAsync()` processes args
2. Command action is called
3. Command uses libs (context, github, linear, etc.)
4. Errors are caught in `main()` and displayed with chalk
