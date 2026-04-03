# summary

> See also: [workflow.md](workflow.md)

## Synopsis

```bash
cw summary
```

## Description

Posts a `@summarizer` comment on the Linear task derived from the current branch. The `@summarizer` bot will then generate and fill in the task summary automatically.

Requires the branch to follow the `feat/ENG-XXXX` or `fix/ENG-XXXX` naming convention so the ticket ID can be extracted.

## Prerequisites

- `linear` (run `linear auth` first)
- Branch must be `feat/ENG-XXXX` or `fix/ENG-XXXX`

## Output

Prints confirmation with the ticket ID and the comment posted.

```
✓ Comment added to ENG-1234
  "@summarizer"
```
