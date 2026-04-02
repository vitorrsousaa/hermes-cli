# Development

> See also: [src/commands/claude.md](../src/commands/claude.md), [src/lib/claude.md](../src/lib/claude.md)

## Useful commands

```bash
npm install
npm run build      # tsup
npm run dev        # watch mode
npm link           # global link for testing
```

## Debug

```bash
HERMES_DEBUG=1 cw <command>
```

Shows full stack trace on unexpected errors.

## Code patterns

1. **Errors:** Use `HermesError(message, hint?)` for expected errors; `hint` appears in gray.
2. **Spinner:** Use `withSpinner("Label...", async () => ...)` for async operations.
3. **Prerequisites:** Call `checkPrerequisites(["gh", "linear"])` at command start when needed.
4. **Output:** Use `chalk` for colors; success messages in green, details in gray.

## Adding or changing commands

1. **New command:** Create `src/commands/<name>.ts`, export async function; register in `src/index.ts` with `program.command(...).action(...)`.
2. **New options:** Add `.option()` to `program.command()` and pass to the function.
3. **New defaults:** Update `src/lib/defaults.ts`.
4. **New integrations:** Create module in `src/lib/` and import in commands.
