---
description: Refactor command. Preserves external behavior while improving internal structure. Loads the 17-step methodology and enforces test-baseline → incremental change → verification.
workflow_type: prompt-chaining
argument-hint: "<scope>  e.g. 'src/components/landing/FAQ.astro' or 'extract whatsapp-message builder'"
---

# /refactor

**ARGUMENTS**: $ARGUMENTS

> **Load `.claude/templates/refactor-methodology.md` now** — the 17-step methodology
> is the spec for this command. Every step below references back to it.
>
> **Authority:** SSOT for refactor process is the methodology file. This command
> orchestrates execution but never duplicates step content.

---

## When to invoke

| Trigger | Example |
|---|---|
| Extracting a helper / reducing duplication | "extract `wa.me` URL build into `src/lib/whatsapp.ts`" |
| Renaming for clarity | "rename `Hero.astro` → `LandingHero.astro` and update all imports" |
| Reducing component size > 200 lines | "split `FAQ.astro` accordion into presentational + behavior" |
| Replacing an anti-pattern flagged by `stability.md` | "remove inline hex colors from `src/components/landing/*.astro`" |
| Cardinal violation cleanup | cardinal #5 (copy in component), cardinal #6 (inline `wa.me`), cardinal #7 (hardcoded hex) |

**Not for:** new features, bug fixes (use `/debug`), perf work motivated by metrics
(use `/perf`), or visual changes (use `/design`).

---

## Routing

```
L1 (rename in one file, no callers)         → fix directly, skip /refactor
L2-L3 (single-domain, < 5 files, tests green) → /refactor
L4+ (multi-layer or > 10 files)              → /plan first, then /refactor per phase
Cardinal violation                           → /refactor (mandatory — never silent fix)
```

---

## Execution (mapped to refactor-methodology.md)

1. **Step 1 — Pre-refactoring analysis.** Identify scope, callers, dependencies via
   `Grep`/`Glob`. Output: list of files to change + risk callsites.
2. **Step 2 — Test coverage verification.** Confirm `bun run lint && bunx astro check
   && bun run build` is green BEFORE any edit. If not green, stop and run `/debug`
   first.
3. **Step 3 — Refactoring strategy.** Pick the technique (extract / rename / move /
   replace conditional / eliminate dead code). State it explicitly in the response.
4. **Step 4 — Environment setup.** Branch `refactor/<slug>` if not already on a
   refactor branch. Skip if user explicitly works on `main`.
5. **Steps 5-11 — Incremental refactoring.** One focused change at a time. After
   EVERY edit batch, re-run gates:
   `bun run lint && bunx astro check && bun run build`. Stop on first red.
6. **Step 12 — Static analysis.** `bun run lint` (Biome + OXLint) must pass with
   zero new warnings.
7. **Step 13 — Performance verification.** If refactor was perf-motivated, attach
   before/after Lighthouse or PSI numbers. Otherwise skip.
8. **Step 14 — Integration testing.** Smoke the affected route in dev:
   `bun dev` + check console + verify the user-visible behavior is identical.
9. **Step 15 — Code review preparation.** Self-review with `code-reviewer` agent
   (read-only); apply suggested edits if low risk.
10. **Step 16 — Documentation of changes.** Append a one-line entry to
    `docs/learnings-log.md` if the refactor unlocked a new pattern or removed an
    anti-pattern.
11. **Step 17 — Deployment.** No special deploy path — refactors ship like any
    other change after gates pass.

---

## Stopping conditions

- **Behavior changed.** STOP. A refactor that changes external behavior is a
  feature in disguise. Revert and re-scope as `/implement`.
- **Gates fail twice consecutively.** STOP. Call `/recover` — the refactor is
  fighting an underlying bug.
- **Scope expands.** STOP. Add to backlog; do not refactor adjacent files "while
  we're here". Anti-pattern from methodology § Anti-patterns.
- **No tests / no build green baseline.** STOP. Run `/debug` to make the baseline
  green first.

---

## Output template

```markdown
## Refactor: [scope]

**Technique:** [extract / rename / move / eliminate / replace]
**Files in scope:** [count] (see list)
**Tests baseline:** [PASS / N/A — explain]

### Changes
- [ ] `path/file:lines` — [what changed in one line]

### Verification
- [ ] `bun run lint` — pass
- [ ] `bunx astro check` — pass
- [ ] `bun run build` — pass
- [ ] Smoke `<affected route>` in `bun dev` — behavior unchanged

### Learnings (optional, only if new)
[one line for docs/learnings-log.md]
```

---

## Relationship to other commands

- `/plan` produces a plan; `/refactor` executes one refactor scope from it.
- `/implement` is the general executor; `/refactor` is the specialized executor
  with the methodology + baseline gate built in.
- `/debug` runs FIRST if the baseline is red.
- `code-reviewer` agent runs after for read-only validation (Step 15).
