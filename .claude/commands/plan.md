---
description: Planning command. Classifies complexity, researches if needed, produces an implementation-ready plan. Does not write code. Delegates methodology to the planning skill.
workflow_type: prompt-chaining
---

# /plan

**ARGUMENTS**: $ARGUMENTS

> **Invoke the `planning` skill now** (`.claude/skills/planning/SKILL.md`) before proceeding.
> All methodology, output formats, layer stack, classification rules, and checklists are defined there.
>
> Project layer chain documented in `.claude/CLAUDE.md § Routing matrix (project-specific)` and root `AGENTS.md § Architecture Map`.

---

## Routing

```
L1-L2 (single file, clear root cause)?           → Skip /plan, fix directly
Frontend creation (new page/component)?           → Route to /design first
Backend + frontend hybrid?                        → Plan backend first, then /design for UI
Refactor (preserving external behavior)?          → Route to /refactor (loads refactor-methodology)
Contains "--build"?                               → Plan → Sprint Contracts → Build → QA loop
```

## Auto-classification heuristics (project-specific)

Apply BEFORE running through the planning skill's generic classifier. First match wins:

| Signal | Class |
|---|---|
| Keyword "refactor" + scope spans ≥ 5 files | L5 → invoke `/refactor` instead |
| Touched extensions all in `{.astro, .css}` AND same domain | L3 (Explicit) — light planning |
| Touched paths span `{src/pages/, src/content/, astro.config.mjs}` (tri-sync redirect pattern) | L4 — load `astro/references/gpus-overlay.md § External redirect tri-sync` |
| Touched extensions span `{.astro, src/lib/*.ts, astro.config.mjs, src/content.config.ts}` | L5+ (cross-layer) — full D.R.P.I.V |
| Request says "hex" or "color" AND target file is NOT `src/styles/global.css` | **BLOCKED** by cardinal #7 → respond with cardinal violation, do not plan |
| Request says "inline `wa.me`" OR target file is NOT `src/lib/whatsapp.ts` | **BLOCKED** by cardinal #6 |
| Default | Fall through to planning skill's generic L1-L10 classifier |

## Flags

| Flag | Effect |
|---|---|
| `--build` | Execute plan after approval — spawn `/implement` automatically |
| `--plan-only` | Skip evaluator review of the plan itself |
| `--skip-research` | Skip codebase research (only for well-known trivial patterns) |
| `--sprints=N` | Override sprint count for complex plans |

---

## Execution

1. **Classify** the request: Simple (L1-L3) / Medium (L4-L5) / Complex (L6+). Run
   the *Auto-classification heuristics* above first; fall back to the planning
   skill's generic classifier when no heuristic matches.
2. **Research** for Medium+: invoke `/research` to grep codebase + check external docs before planning.
3. **Produce plan** in the format matching the classification (per planning skill).
4. **Evaluator gate** for Complex (L6+): spawn `evaluator` agent — must pass all thresholds.
5. **Blast Radius Preview** — emit the section (template below) just before presenting the plan.
6. **Auto-save (Complex only)** — write the approved plan to
   `docs/plans/YYYY-MM-DD-<slug>.md` (path from `settings.json::plansDirectory`).
   Slug = `slugify(request_title)`. Skip if `--plan-only` was passed.
7. **Append handoff block** (Complex only) — emit the YAML block from
   `.claude/templates/plan-to-implement-handoff.md` at the END of the plan output.
   `/implement` parses this first.
8. **Present plan** and wait for user approval — do not begin implementation.

---

## Stopping Conditions

- STOP if request is L1-L2 → tell user to fix directly, skip planning
- STOP after presenting plan → wait for user approval before `/implement`
- STOP if `evaluator` returns REVISION_REQUIRED 3× → present all feedback, ask user
- ASK if requirements span 3+ domains without clear priority order

---

## Output template (Medium / Complex)

```markdown
## Plan: [Feature Name]

**Complexity:** L[N] — [one-line justification]
**Layers:** [layers touched, in execution order — derived from project layer map]
**Assumptions:** [any ASSUMED constraints]

### Phase 1: [Layer] [SEQUENTIAL]
- [ ] `[exact file path]:[line-ref if applicable]` — [action] — verify: `[command]`

### Phase 2: [Layer] [PARALLEL if independent]
- [ ] `[exact file path]` — [action]

**Risks:** [non-obvious risks and mitigations]

## Blast Radius Preview

- **Files that WILL change:** [count] ([list, ≤ 5 paths; "+N more" if longer])
- **Files that MAY change** (conditional on Phase N): [count]
- **Gates that WILL re-run:** `bun run lint`, `bunx astro check`, `bun run build`
- **Reversibility:** [fully_reversible | requires_rollback_plan]
- **Cardinal touched:** [none | #N — explain] (alert if cardinals are in play)

---
Evaluator: [APPROVED | REVISION_REQUIRED — N iterations] (Complex only)
Plan saved: `docs/plans/YYYY-MM-DD-[slug].md` (Complex only)

[Complex only — handoff block parsed by /implement:]
```yaml
plan_id: YYYY-MM-DD-<slug>
complexity: L<N>
classification_rationale: |
  <one sentence>
phases:
  - id: A
    name: <short>
    objective: <one line>
    agent: <agent name>
    parallel: true | false
    gate: <command or condition>
verification:
  - bun run lint
  - bunx astro check
  - bun run build
blast_radius:
  will_change: [<absolute path>, ...]
  may_change: [<absolute path>, ...]
  reversibility: fully_reversible | requires_rollback_plan
```

Next: run /implement to execute, or ask to adjust any item above.
```

> Schema for the YAML block lives in `.claude/templates/plan-to-implement-handoff.md`.
