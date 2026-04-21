# check

> See also: [workflow.md](workflow.md)

## Synopsis

```bash
cw check [-st] [-sl] [-sp] [-nc]
```

## Description

Runs typecheck, lint, and prettier on the current project. If lint/prettier modify files, the changes are auto-committed with a message like `fix(<ticket>): fix linter errors` (ticket ID is extracted from the current branch; `-stg` suffix is stripped).

Each step can be skipped independently. If all three steps are skipped, nothing runs and the command prints a notice and exits.

## Steps

1. **Typecheck** — `npx tsc --noEmit`
2. **Lint** — `npm run lint:fix`
3. **Prettier** — `npm run prettier:fix`

## Options

| Flag | Description |
|------|-------------|
| `-st, --skip-typecheck` | Skip the typecheck step |
| `-sl, --skip-lint` | Skip the lint step |
| `-sp, --skip-prettier` | Skip the prettier step |
| `-nc, --no-commit` | Do not auto-commit files modified by lint/prettier |

## Behavior

- If any executed step fails, the command prints the failures and exits with code `1`.
- If all executed steps pass and no files were modified, prints `All checks passed. No files modified.`
- If files were modified by lint/prettier:
  - Without `--no-commit`: stages and commits the modified files with `fix(<ticket>): fix linter errors`.
  - With `--no-commit`: lists the modified files and exits without committing.
- If `-st`, `-sl` and `-sp` are all passed, prints `All checks skipped (typecheck, lint, prettier).` and exits.

## Examples

```bash
# Run all checks and auto-commit any fixes
cw check

# Skip typecheck (e.g. when you already ran it in your editor)
cw check -st

# Run only typecheck
cw check -sl -sp

# Run lint/prettier but do not auto-commit the fixes
cw check -st --no-commit

# No-op: prints a notice and exits
cw check -st -sl -sp
```

## Prerequisites

- Project must define `lint:fix` and `prettier:fix` scripts in `package.json`.
- Run from inside a git repository (for the auto-commit step).
- Branch name is expected to follow `feat/ENG-XXXX` / `fix/ENG-XXXX` (or their `-stg` variants) so the ticket ID can be extracted; otherwise the raw branch name is used in the commit message.
