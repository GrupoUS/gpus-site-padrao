# Plan → Implement Handoff Template

> Schema for the hand-off between `/plan` (produces a plan) and `/implement`
> (executes it). Embedded at the **end** of every Complex (L6+) plan output, and
> in `docs/plans/YYYY-MM-DD-<slug>.md` auto-save.
>
> `/implement` parses this block first; if absent, falls back to scraping
> `## Phases` headings (legacy path).

---

```yaml
plan_id: <YYYY-MM-DD-<slug>>          # Filename of the plan file in docs/plans/
complexity: L<N>                       # 1-10 (per planning skill classification)
classification_rationale: |
  <one sentence — what indicators pushed it to L<N>>

# Phase order (sequential gates). Each phase's tasks may run in parallel
# unless [SEQUENTIAL] is annotated in the phase body.
phases:
  - id: A
    name: <short>
    objective: <one line>
    agent: <primary agent for this phase — e.g. frontend-specialist, debugger>
    parallel: true | false
    gate: <command or condition that must pass before next phase starts>
  - id: B
    name: ...
    objective: ...
    agent: ...
    parallel: true | false
    gate: ...

# Verification hooks that re-run end-to-end after the final phase.
verification:
  - bun run lint
  - bunx astro check
  - bun run build
  - <smoke test or route check>

# Blast radius — files that WILL change vs MAY change.
blast_radius:
  will_change:
    - <absolute path>
  may_change:
    - <absolute path>
  reversibility: fully_reversible | requires_rollback_plan
```

---

## How `/implement` reads this

1. Parses the YAML block (between the ```yaml fences).
2. For each phase: spawns the named agent with the phase objective + gate.
3. Honors `parallel: true` by using `run_in_background` on independent tasks.
4. After the last phase, runs every entry in `verification:` and reports failures
   to the user before declaring complete.
5. If `reversibility != fully_reversible`, `/implement` prints the rollback plan
   from the plan file body **before** starting and asks user confirmation.

## How `/plan` writes this

After producing the plan body, `/plan` appends the YAML block below the final
`Next: run /implement ...` line. For L1-L3 (Simple) plans the block is omitted —
direct execution is faster than the handoff machinery.
