# Archived: GSD subsystem (2026-05-11)

This directory contained the **Get Shit Done** (`/gsd:*`) command subsystem
imported from another project at commit `0940030` ("feat: implement core
site redesign, expanded GSD automation tools, and new landing page
components").

## Why archived

Three hard reasons, audited 2026-05-11:

1. **Zero usage in this project.** `grep -rn "/gsd:" docs/ evals/ src/` returns
   nothing — no plan, eval, doc, or source file references any `/gsd:*` command.
2. **Broken absolute paths.** Every `*.md` in this directory contained
   `@/home/mauricio/gpus/...` or `@/Users/mauricio/...` references pointing
   to a different project root that does not exist on this machine.
3. **Shadow workflow.** The subsystem was never integrated into
   `.claude/CLAUDE.md § Routing matrix` nor root `AGENTS.md` — the canonical
   workflow stack is `/plan` + `/research` + `/implement` + `/design` + `/debug`
   + `/verify` + `/perf` + `/recover` + `/evolve` + `/delegate` + `/prime`.

## Restore (if ever needed)

```bash
git mv .claude/_archive/gsd-2026-05 .claude/commands/gsd
# Then fix broken absolute paths in each .md file:
#   grep -l "@/home/mauricio/\|@/Users/mauricio/" .claude/commands/gsd/*.md
# And add a row to .claude/CLAUDE.md § Routing matrix documenting when /gsd:* applies.
```
