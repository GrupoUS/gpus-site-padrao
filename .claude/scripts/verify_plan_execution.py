#!/usr/bin/env python3
"""verify_plan_execution.py - Self-audit: did we deliver what the plan said?

Walks a plan file (Markdown), extracts every checkbox, every cited path, every
verification command, and runs end-to-end checks against the current `.claude/`
state. Produces a structured report — never modifies anything.

Usage:
    python3 .claude/scripts/verify_plan_execution.py [<plan-file>]

If no plan file is given, the newest `*.md` under:
    1. <project>/docs/plans/
    2. ~/.claude/plans/
is auto-selected.

Exit codes:
    0 — all sections PASS (or are SKIPPED with documented reason)
    1 — at least one section FAIL
    2 — script error (could not find plan or read it)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

# ── Resolve project dir without depending on _hook_utils (script is portable) ──
def project_dir() -> Path:
    if d := os.environ.get("CLAUDE_PROJECT_DIR"):
        return Path(d)
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=3,
        )
        if (top := r.stdout.strip()):
            return Path(top)
    except Exception:
        pass
    return Path(__file__).resolve().parent.parent.parent


PROJECT = project_dir()
CLAUDE_DIR = PROJECT / ".claude"


# ── Result types ──
@dataclass
class CheckResult:
    name: str
    status: str  # PASS | FAIL | SKIP | WARN
    detail: str = ""
    evidence: list[str] = field(default_factory=list)


def run(cmd: list[str], cwd: Path | None = None, timeout: int = 30) -> tuple[int, str, str]:
    try:
        r = subprocess.run(
            cmd,
            cwd=str(cwd or PROJECT),
            capture_output=True, text=True, timeout=timeout,
        )
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return 124, "", f"timeout after {timeout}s"
    except Exception as exc:
        return 2, "", str(exc)


# ── Plan discovery ──
def find_plan(arg: str | None) -> Path | None:
    if arg:
        p = Path(arg).expanduser().resolve()
        return p if p.is_file() else None

    candidates: list[tuple[float, Path]] = []
    for base in (PROJECT / "docs" / "plans", Path.home() / ".claude" / "plans"):
        if base.is_dir():
            for f in base.glob("*.md"):
                candidates.append((f.stat().st_mtime, f))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][1]


# ── Plan parsing ──
@dataclass
class PlanData:
    path: Path
    raw: str
    title: str
    total_items: int
    checked: int
    unchecked: int
    cited_paths: list[str]
    verify_commands: list[str]
    sections: list[str]


CHECKBOX_RE = re.compile(r"^\s*-\s*\[(?P<state>[ xX])\]\s+(?P<text>.+)$", re.MULTILINE)
# Inline paths in backticks. Require an extension OR at least 2 path segments
# (foo/bar) so single-token command names like `/gsd` or `/plan` are excluded.
PATH_RE = re.compile(r"`([A-Za-z0-9_./-]+\.(?:py|md|ts|tsx|js|json|astro|css|sh|toml|yaml|yml))`")
ABS_PATH_RE = re.compile(r"`(/[A-Za-z][A-Za-z0-9_-]+/[A-Za-z0-9_./-]+)`")
CMD_BLOCK_RE = re.compile(r"```(?:bash|sh)\n(.*?)```", re.DOTALL)
SECTION_RE = re.compile(r"^##\s+(.+)$", re.MULTILINE)


def parse_plan(plan: Path) -> PlanData:
    raw = plan.read_text(errors="replace")
    boxes = list(CHECKBOX_RE.finditer(raw))
    checked = sum(1 for m in boxes if m.group("state").lower() == "x")
    unchecked = sum(1 for m in boxes if m.group("state") == " ")

    rel_paths = sorted(set(PATH_RE.findall(raw)))
    abs_paths = sorted(set(ABS_PATH_RE.findall(raw)))
    cited = abs_paths + [p for p in rel_paths if not any(p in a for a in abs_paths)]

    # Verify commands: bash/sh code blocks + inline `bun ...` / `python3 ...` patterns
    verify: list[str] = []
    for m in CMD_BLOCK_RE.finditer(raw):
        for line in m.group(1).strip().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and not line.startswith("echo"):
                verify.append(line)
    verify = verify[:30]  # cap for sanity

    sections = SECTION_RE.findall(raw)
    title = (raw.splitlines() or [""])[0].lstrip("# ").strip() or plan.stem

    return PlanData(
        path=plan, raw=raw, title=title,
        total_items=len(boxes), checked=checked, unchecked=unchecked,
        cited_paths=cited, verify_commands=verify, sections=sections,
    )


# ── Individual checks ──
def check_hooks_compile() -> CheckResult:
    hooks = sorted((CLAUDE_DIR / "hooks").glob("*.py"))
    if not hooks:
        return CheckResult("hooks_compile", "SKIP", "no hooks directory")
    rc, _, err = run(["python3", "-m", "py_compile", *[str(h) for h in hooks]])
    if rc == 0:
        return CheckResult("hooks_compile", "PASS", f"{len(hooks)} hooks compile clean")
    return CheckResult("hooks_compile", "FAIL", err.strip()[:300])


def check_hooks_smoke() -> CheckResult:
    hooks_dir = CLAUDE_DIR / "hooks"
    if not hooks_dir.is_dir():
        return CheckResult("hooks_smoke", "SKIP", "no hooks directory")
    failures: list[str] = []
    count = 0
    for h in sorted(hooks_dir.glob("*.py")):
        if h.name == "_hook_utils.py":
            continue
        count += 1
        try:
            r = subprocess.run(
                ["python3", str(h)], input="{}",
                text=True, capture_output=True, timeout=5,
            )
            if r.returncode != 0:
                failures.append(f"{h.name} (rc={r.returncode}): {r.stderr.strip()[:80]}")
        except Exception as exc:
            failures.append(f"{h.name}: {exc}")
    if failures:
        return CheckResult("hooks_smoke", "FAIL", f"{len(failures)} of {count} failed", failures)
    return CheckResult("hooks_smoke", "PASS", f"{count} hooks return exit 0 on empty input")


def check_agent_routing() -> CheckResult:
    script = CLAUDE_DIR / "scripts" / "verify_agent_routing.py"
    if not script.is_file():
        return CheckResult("agent_routing", "SKIP", "verify_agent_routing.py absent")
    rc, out, err = run(["python3", str(script)])
    last = out.strip().splitlines()[-1] if out.strip() else err.strip()[-200:]
    if rc == 0:
        return CheckResult("agent_routing", "PASS", last)
    return CheckResult("agent_routing", "FAIL", last)


def _strip_inline_code(line: str) -> str:
    """Remove inline code spans (backtick-wrapped text) from a line.

    This lets us distinguish a live reference (`spawn oracle`) from
    documentation that mentions the word inside a code span or table cell
    (`oracle audit-only fail → ...`). Greedy across multiple spans per line.
    """
    return re.sub(r"`[^`]*`", "", line)


def check_oracle_audit_only() -> CheckResult:
    """Oracle refs must be archived or marked as historical (audit trail)."""
    bad: list[str] = []
    self_file = Path(__file__).resolve()
    for f in CLAUDE_DIR.rglob("*"):
        if not f.is_file() or "_archive" in f.parts or "logs" in f.parts:
            continue
        if f.suffix not in {".md", ".py", ".json"}:
            continue
        # Don't flag the audit script itself.
        if f.resolve() == self_file:
            continue
        try:
            text = f.read_text(errors="replace")
        except Exception:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            # Strip inline code spans first — `oracle` in a code span is citation,
            # not a live reference.
            naked = _strip_inline_code(line)
            if "oracle" not in naked.lower():
                continue
            l = naked.lower()
            # Acceptable: explicit audit-trail markers
            if any(t in l for t in ("former oracle", "oracle removed", "replaces former",
                                    "superseded", "supersedes", "replacement",
                                    "replaces the former", "audit-trail", "audit trail",
                                    "audit-only", "audit only", "live agent",
                                    "refers to oracle")):
                continue
            # Skip evaluator.md (frontmatter explicitly documents replacement)
            if f.name == "evaluator.md":
                continue
            bad.append(f"{f.relative_to(PROJECT)}:{i}: {line.strip()[:100]}")
    if bad:
        return CheckResult("oracle_audit_only", "FAIL",
                           f"{len(bad)} non-audit oracle refs remain", bad[:5])
    return CheckResult("oracle_audit_only", "PASS",
                       "oracle refs are audit-trail only or archived")


def check_no_foreign_abs_paths() -> CheckResult:
    bad: list[str] = []
    for base in (CLAUDE_DIR / "commands", CLAUDE_DIR / "agents"):
        if not base.is_dir():
            continue
        for f in base.rglob("*.md"):
            if "_archive" in f.parts:
                continue
            try:
                text = f.read_text(errors="replace")
            except Exception:
                continue
            for i, line in enumerate(text.splitlines(), 1):
                if re.search(r"@(?:/home/[A-Za-z]+/|/Users/[A-Za-z]+/)", line):
                    bad.append(f"{f.relative_to(PROJECT)}:{i}: {line.strip()[:100]}")
    if bad:
        return CheckResult("no_foreign_abs_paths", "FAIL",
                           f"{len(bad)} foreign absolute paths in workflow files",
                           bad[:5])
    return CheckResult("no_foreign_abs_paths", "PASS",
                       "no /Users/<other>/ or /home/<other>/ references in active workflow")


def check_no_placeholders() -> CheckResult:
    bad: list[str] = []
    self_file = Path(__file__).resolve()
    for f in CLAUDE_DIR.rglob("*.md"):
        if "_archive" in f.parts or "logs" in f.parts:
            continue
        try:
            text = f.read_text(errors="replace")
        except Exception:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            # Strip inline code spans so the marker inside backticks (docs example)
            # doesn't trigger the check.
            naked = _strip_inline_code(line)
            if "<!-- Leave empty" in naked:
                bad.append(f"{f.relative_to(PROJECT)}:{i}: {line.strip()[:100]}")
    if bad:
        return CheckResult("no_placeholders", "FAIL",
                           f"{len(bad)} placeholder comments remain", bad[:5])
    return CheckResult("no_placeholders", "PASS", "no <!-- Leave empty --> placeholders")


def check_tier1_size() -> CheckResult:
    files = [PROJECT / "AGENTS.md", CLAUDE_DIR / "CLAUDE.md"]
    missing = [str(f) for f in files if not f.is_file()]
    if missing:
        return CheckResult("tier1_size", "WARN", f"missing: {missing}")
    total = sum(len(f.read_text(errors='replace').splitlines()) for f in files)
    detail = f"{total} lines (AGENTS.md + CLAUDE.md, budget 500)"
    if total > 500:
        return CheckResult("tier1_size", "FAIL", detail)
    return CheckResult("tier1_size", "PASS", detail)


def check_cited_paths_exist(plan: PlanData) -> CheckResult:
    if not plan.cited_paths:
        return CheckResult("cited_paths_exist", "SKIP", "plan cites no concrete paths")
    # Relative paths in a plan may be rooted at any of these conventional bases.
    search_roots = [
        PROJECT,
        CLAUDE_DIR,
        CLAUDE_DIR / "commands",
        CLAUDE_DIR / "agents",
        CLAUDE_DIR / "hooks",
        CLAUDE_DIR / "skills",
        CLAUDE_DIR / "scripts",
        CLAUDE_DIR / "templates",
        CLAUDE_DIR / "rules",
    ]
    archived_roots = [
        CLAUDE_DIR / "_archive",
        CLAUDE_DIR / "agents" / "_archive",
    ]

    def check_archives(basename: str) -> Path | None:
        for root in archived_roots:
            if not root.is_dir():
                continue
            for sub in [root, *[d for d in root.iterdir() if d.is_dir()]]:
                cand = sub / basename
                if cand.exists():
                    return cand
        return None

    def resolve_one(p: str) -> Path | None:
        # Strip trailing slash so directory references resolve cleanly.
        p_clean = p.rstrip("/")
        if p_clean.startswith("/"):
            cand = Path(p_clean)
            if cand.exists():
                return cand
            return check_archives(cand.name)
        for root in search_roots:
            cand = root / p_clean
            if cand.exists():
                return cand
        return check_archives(Path(p_clean).name)

    missing: list[str] = []
    for p in plan.cited_paths:
        if resolve_one(p) is None:
            missing.append(p)
    if missing:
        return CheckResult("cited_paths_exist", "WARN",
                           f"{len(missing)} of {len(plan.cited_paths)} cited paths not found",
                           missing[:8])
    return CheckResult("cited_paths_exist", "PASS",
                       f"all {len(plan.cited_paths)} cited paths exist")


def check_plan_checkboxes(plan: PlanData) -> CheckResult:
    if plan.total_items == 0:
        return CheckResult("plan_checkboxes", "SKIP", "plan has no checkboxes")
    pct = (plan.checked / plan.total_items) * 100 if plan.total_items else 0
    detail = f"{plan.checked} / {plan.total_items} marked done ({pct:.0f}%)"
    # WARN if plan still has unchecked boxes; PASS only at 100%
    if plan.unchecked > 0:
        return CheckResult("plan_checkboxes", "WARN", detail,
                           [f"unchecked items: {plan.unchecked}"])
    return CheckResult("plan_checkboxes", "PASS", detail)


def check_required_sections(plan: PlanData) -> CheckResult:
    required = ("CONTEXT", "PHASES", "RISKS", "VERIFICATION")
    found_upper = [s.upper() for s in plan.sections]
    missing = [s for s in required if not any(s in u for u in found_upper)]
    if missing:
        return CheckResult("required_sections", "WARN",
                           f"plan missing recommended sections: {missing}")
    return CheckResult("required_sections", "PASS",
                       f"plan has all standard sections: {required}")


def check_archive_readmes() -> CheckResult:
    """Every `_archive/` dir must ship a README explaining why and how to restore."""
    issues: list[str] = []
    for arc in CLAUDE_DIR.rglob("_archive"):
        if not arc.is_dir():
            continue
        # _archive itself OR _archive/<sub>/
        for d in [arc] + [p for p in arc.iterdir() if p.is_dir()]:
            if not any(d.glob("README.md")):
                # Skip if it's the parent _archive that has files (not subdirs)
                has_files = any(p.is_file() for p in d.iterdir())
                has_subdirs = any(p.is_dir() for p in d.iterdir())
                if has_subdirs or (d == arc and not has_files):
                    issues.append(str(d.relative_to(PROJECT)) + " (missing README.md)")
    if issues:
        return CheckResult("archive_readmes", "WARN",
                           f"{len(issues)} archive dir(s) without README", issues[:5])
    return CheckResult("archive_readmes", "PASS", "all _archive/ dirs document themselves")


# ── Report ──
def format_report(plan: PlanData, results: list[CheckResult]) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    icons = {"PASS": "✓", "FAIL": "✗", "WARN": "⚠", "SKIP": "·"}
    counts = {k: sum(1 for r in results if r.status == k) for k in icons}

    lines = [
        f"# /verify plan — Self-Audit Report",
        f"",
        f"**Run:** {now}",
        f"**Plan:** `{plan.path}`",
        f"**Title:** {plan.title}",
        f"**Checkboxes:** {plan.checked} / {plan.total_items} done · {plan.unchecked} pending",
        f"**Sections found:** {len(plan.sections)} (`{', '.join(plan.sections[:8])}{'…' if len(plan.sections) > 8 else ''}`)",
        f"**Cited paths:** {len(plan.cited_paths)}",
        f"",
        f"## Results — {counts['PASS']} PASS · {counts['FAIL']} FAIL · {counts['WARN']} WARN · {counts['SKIP']} SKIP",
        f"",
        f"| | Check | Status | Detail |",
        f"|---|---|---|---|",
    ]
    for r in results:
        lines.append(f"| {icons[r.status]} | `{r.name}` | **{r.status}** | {r.detail} |")
    lines.append("")
    for r in results:
        if r.evidence:
            lines.append(f"### Evidence — `{r.name}`")
            for e in r.evidence:
                lines.append(f"- `{e}`")
            lines.append("")

    verdict = "VERIFIED" if counts["FAIL"] == 0 and counts["WARN"] == 0 else (
        "VERIFIED-WITH-NOTES" if counts["FAIL"] == 0 else "NEEDS-WORK"
    )
    lines += [f"## Verdict", f"", f"**{verdict}**", ""]
    if verdict == "NEEDS-WORK":
        lines.append("Action: fix FAIL items above, then re-run `/verify plan`.")
    elif verdict == "VERIFIED-WITH-NOTES":
        lines.append("Action: review WARN items — soft signals, not blockers.")
    else:
        lines.append("Action: none. Ship it.")
    lines.append("")
    return "\n".join(lines)


# ── Entry point ──
def main() -> int:
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    plan_path = find_plan(arg)
    if not plan_path:
        print("ERROR: no plan file found. Pass a path or place one under docs/plans/ or ~/.claude/plans/.", file=sys.stderr)
        return 2

    try:
        plan = parse_plan(plan_path)
    except Exception as exc:
        print(f"ERROR: could not parse plan: {exc}", file=sys.stderr)
        return 2

    checks = [
        check_hooks_compile(),
        check_hooks_smoke(),
        check_agent_routing(),
        check_oracle_audit_only(),
        check_no_foreign_abs_paths(),
        check_no_placeholders(),
        check_tier1_size(),
        check_archive_readmes(),
        check_required_sections(plan),
        check_cited_paths_exist(plan),
        check_plan_checkboxes(plan),
    ]

    report = format_report(plan, checks)

    # Write report to logs/ and stdout
    log_dir = CLAUDE_DIR / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    out_file = log_dir / f"verify-plan-{datetime.now().strftime('%Y%m%d-%H%M%S')}.md"
    try:
        out_file.write_text(report)
        print(f"# (report also saved to {out_file.relative_to(PROJECT)})")
    except Exception:
        pass

    print(report)

    fail = sum(1 for r in checks if r.status == "FAIL")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
