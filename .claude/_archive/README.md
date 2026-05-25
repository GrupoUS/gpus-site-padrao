# `.claude/_archive/` — Workflow Graveyard

Files moved here are preserved for git history and rollback but are **NOT**
loaded by the Claude Code runtime. Each sub-entry ships its own `README.md`
explaining why and how to restore.

| Entry | Type | Archived | Reason |
|---|---|---|---|
| `gsd-2026-05/` | command subsystem | 2026-05-11 | Shadow `/gsd:*` subsystem with broken absolute paths and zero project usage |
| `agent-orchestrator-2026-05.ts` | helper script | 2026-05-11 | Orphan TypeScript classifier — never imported, planning skill supersedes |

Agent archives live one level deeper: `.claude/agents/_archive/` (`oracle.md`,
`mobile-developer.md`).

## Restore pattern

```bash
git mv .claude/_archive/<entry> .claude/<original-location>
# Then re-validate:
python3 .claude/scripts/verify_agent_routing.py
python3 .claude/scripts/verify_plan_execution.py
```

Do not import from `_archive/` paths in active code. The directory is a
graveyard, not a library.
