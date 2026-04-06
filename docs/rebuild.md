# cw rebuild

Rebuilds the ephemeral feature environment by pushing the cw-react branch and retriggering the Deploy Feature Environment workflow. cw-core and cw-ms-timesheets builds are opt-in via flags.

## Usage

```
cw rebuild [-r <branch>] [-c <branch>] [-t <branch>]
```

## Options

| Flag | Description |
|------|-------------|
| `-r, --react <branch>` | cw-react branch. Default: current branch with `-stg` stripped. |
| `-c, --core <branch>` | cw-core branch. Providing this flag enables the cw-core build. |
| `-t, --timesheets <branch>` | cw-ms-timesheets branch. Providing this flag enables the timesheets build. |

## Behaviour

1. Resolves the cw-react branch:
   - **With `-r`:** uses the provided branch as-is.
   - **Without `-r`:** reads the current git branch and strips any `-stg` suffix (e.g. `feat/ENG-123-stg` → `feat/ENG-123`).
2. Pushes the resolved cw-react branch to `origin`.
3. Triggers the **Deploy Feature Environment** workflow:
   - `branch`: resolved cw-react branch
   - `build_core`: `true` only when `-c` is passed; `false` otherwise
   - `build_timesheets`: `true` only when `-t` is passed; `false` otherwise
   - `enabled_socketio`: always `true`
4. Prints the workflow run URL and copies it to the clipboard.

## Examples

```bash
# Rebuild with current cw-react branch only (core and timesheets skipped)
cw rebuild

# Rebuild a specific cw-react branch
cw rebuild -r feat/ENG-4321

# Rebuild cw-react (current) + cw-core
cw rebuild -c feat/ENG-4321

# Rebuild all three services
cw rebuild -r feat/ENG-4321 -c feat/ENG-4321 -t feat/ENG-4321
```

## Notes

- Requires `gh` authenticated (`gh auth login`).
- Core and timesheets are **not** built unless their respective flag is passed.
- The preview URL can be retrieved with `cw preview-url`.
