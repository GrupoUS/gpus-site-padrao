# Governance — single source of truth, permissions, telemetry, skill↔agent mapping

> Tier 3 — read on demand. This file consolidates *meta-rules*: where things live, how
> permissions resolve, what telemetry is emitted, and which skill each agent preloads.
> Linked from `.claude/CLAUDE.md § Pointers`.

---

## 1. Single source of truth (SSOT) — non-negotiable

Each concept lives in **one** place. If you find divergence, the row marked
*Authority* wins and the other must be updated, never silently merged.

| Concept | Authority (SSOT) | Mirrors (must stay in sync) |
|---|---|---|
| Tier 1 behavior | `.claude/CLAUDE.md` | — (always loaded; combined with root `AGENTS.md` must stay < 500 lines) |
| Operating contract | root `AGENTS.md` | — |
| Cardinal rules (project) | `.claude/CLAUDE.md § Cardinal rules` | `rules/*.md` reference back, never re-declare |
| Project metadata (name, gates, paths) | `.claude/config.json` | `CLAUDE.md § Project identity` |
| Active agents | `.claude/agents/*.md` (frontmatter) | `verify_agent_routing.py` |
| Active skills | `.claude/skills/*/SKILL.md` (frontmatter) | invocations in agent bodies + commands |
| Brand voice / product IDs / journey | `skills/grupo-us/` | never inlined in `.astro` or `.tsx` |
| Visual tokens (Navy/Gold, shadcn vars, motion) | `skills/gpus-theme/` | `src/styles/global.css` `@theme` block |
| Astro patterns / render-mode invariants | `skills/astro/` + `references/gpus-overlay.md` | — |
| WhatsApp E.164 number + URL building | `src/lib/whatsapp.ts` | never inline `wa.me/...` |
| Product copy / CTAs / FAQ / testimonials | `src/content/products/*.json` | never in components |
| Refactor methodology (17 steps) | `.claude/templates/refactor-methodology.md` | loaded by `/refactor` command |
| Refactor command spec | `.claude/commands/refactor.md` | — |

**Conflict resolution:** if a `rules/*.md` says "do X" and a skill says "do Y", read both
in full, prefer the skill (more domain-specific). If the conflict is on a *cardinal*,
the cardinal wins automatically — it lives in Tier 1.

---

## 2. Permissions precedence (settings.json vs settings.local.json)

The project tracks **two** permission surfaces. They are NOT redundant:

| Surface | File | Committed? | Scope |
|---|---|---|---|
| Static allow / deny | `.claude/settings.json::permissions.{allow,deny}` | ✅ yes | shared with team via git |
| Dynamic allow hook | `.claude/settings.local.json::hooks.PermissionRequest` | ❌ local | machine-specific overrides |

### Resolution order (Claude Code runtime)

1. **`deny` list** wins absolutely — anything matched is blocked even if a hook says allow.
2. **`allow` list** auto-approves matched patterns.
3. **`PermissionRequest` hook** runs only for tool calls *not* covered by allow/deny.
   The local hook in `settings.local.json` emits `{"decision":{"behavior":"allow"}}` for
   read-only tools (`Read|Grep|Glob|Bash|Edit|Write|mcp__plugin_serena_serena__*|
   mcp__tavily__*|mcp__sequential-thinking__*|mcp__stitch__*|mcp__playwright__*|
   mcp__claude_ai_Context7__*`), reducing prompt noise on this machine.
4. Otherwise → user prompt.

**Rule of thumb:** any pattern that should be allowed *for the whole team* belongs in
`settings.json::allow` (committed). Any machine-local convenience belongs in the
`settings.local.json` hook. Never duplicate the same pattern in both — pick one
surface based on team-scope.

**Adding a new permission:**
- Team-wide: add to `settings.json::allow` and PR.
- Local-only: add a matcher segment to the `PermissionRequest` regex in
  `settings.local.json`. Do not commit.

---

## 3. Hook telemetry schemas

All hooks fail open (any internal exception → `sys.exit(0)`). Failures are recorded
post-mortem via `_hook_utils.log_hook_error`. The following files are written under
`.claude/logs/` — gitignored, regenerated as hooks run.

| File | Producer | One-line schema |
|---|---|---|
| `subagent-events.jsonl` | `subagent_stop.py` | `{timestamp, session_id, agent_id, agent_type, transcript_lines, background}` |
| `evaluator-escalation.jsonl` | `subagent_stop.py` | `{timestamp, agent, count}` |
| `evaluator-failure-count.txt` | `subagent_stop.py` | counter (plain int; resets at threshold 2) |
| `team-events.jsonl` | `task_completed.py` | `{timestamp, event, teammate, task_id, subject}` |
| `hook-errors.log` | **all hooks** via `_hook_utils.log_hook_error` | `{timestamp, hook, error_type, message, trace}` |

**Reading these:**
- `tail -n 20 .claude/logs/hook-errors.log` → first stop when a hook misbehaves.
- `tail -n 20 .claude/logs/evaluator-escalation.jsonl` → when escalation fires twice
  in a row, an `evaluator` (Mode 3) session is warranted.

---

## 4. Skill ↔ Agent mapping

Each agent preloads zero, one, or many skills via the `skills:` frontmatter field
(Anthropic-recommended). Body-level `Skill()` calls remain valid for ad-hoc /
conditional invocation. Audit per-agent: if removing a skill would break > 50%
of invocations, preload it.

| Agent | Preloaded skills | When ad-hoc Skill() instead |
|---|---|---|
| `orchestrator` | `planning`, `senior-prompt-engineer` | when delegating to a specialist whose skill scope is uncertain |
| `project-planner` | `planning`, `senior-prompt-engineer` | rarely |
| `evaluator` | `senior-prompt-engineer` | Mode 3 (Architecture Analysis) may load `astro`, `gpus-theme` based on context |
| `debugger` | `debugger` skill (the one with the same name) | + `astro` when the bug is render-mode or hydration related |
| `frontend-specialist` | `frontend-design`, `gpus-theme`, `ui-ux-pro-max` | + `astro` for Astro-specific patterns; + `grupo-us` for copy edits |
| `performance-optimizer` | `performance-optimization` | + `astro` for static-build perf |
| `explorer` / `explorer-agent` | (none — routing-dependent) | always body-level |
| `librarian` | (none — read-only) | always body-level |

**Color taxonomy (visual signal in routing matrix):**
| Color | Meaning |
|---|---|
| `red` | adversarial (`evaluator`) |
| `orange` | debugging / RCA (`debugger`) |
| `purple` | UI / frontend (`frontend-specialist`) |
| `blue` | performance / SEO (`performance-optimizer`) |
| `cyan` | codebase research (`explorer-agent`) |
| `yellow` | knowledge / planning (`librarian`, `project-planner`) |

---

## 5. Archive policy

Files removed from active runtime but preserved for git history and rollback live
under `.claude/_archive/` (or `.claude/agents/_archive/` for agents). Each archive
directory ships a `README.md` documenting:

1. **Why** the file was archived (one sentence + auditable reason).
2. **When** (`YYYY-MM-DD`).
3. **How to restore** (exact `git mv` command).

Current archives (as of 2026-05-11):

- `agents/_archive/oracle.md` — superseded by `evaluator` Mode 3.
- `agents/_archive/mobile-developer.md` — out of scope (static Astro marketing site).
- `_archive/gsd-2026-05/` — shadow `/gsd:*` subsystem with broken absolute paths and
  zero project usage.

Do not import from `_archive/` paths in active code. The directory is a graveyard,
not a library.

---

## 6. Adding new governance entries

When introducing a new long-lived concept (a new SSOT row, a new telemetry file,
a new skill↔agent assignment), edit the appropriate table here in the same PR
that introduces the concept. Tier 1 (`CLAUDE.md`) only points here — it never
re-declares the table.
