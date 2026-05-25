# Archived Agents

Agents moved here are preserved for git history and rollback but are NOT loaded
by the Claude Code runtime. To restore an agent, run:

```bash
git mv .claude/agents/_archive/<name>.md .claude/agents/<name>.md
```

| File | Archived on | Reason |
|---|---|---|
| `oracle.md` | 2026-05-11 | Superseded by `evaluator` agent in Mode 3 (Architecture Analysis). `evaluator.md` explicitly documents the replacement (frontmatter line 3, body line 154). All workflow refs migrated to `evaluator` (Mode 3) — see commits around 2026-05-11. |
| `mobile-developer.md` | 2026-05-11 | Project is Astro 6 **static-only** for a marketing site — no React Native, no Flutter, no Expo. 447-line mobile spec was dead weight. Restore only if mobile scope is added to the roadmap. |
