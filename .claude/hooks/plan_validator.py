#!/usr/bin/env python3
"""plan_validator.py - Warn (never deny) when writing a malformed plan file.

Trigger: PreToolUse (Write)

Scope: only files under `docs/plans/*.md`. Anything else passes through.

Behavior:
  - Fully fail-open. Emits "allow" decision regardless of validation result.
  - Validation issues are surfaced via stderr (visible in `claude --debug`) and
    appended to `.claude/logs/plan-validator.jsonl` for post-mortem.
  - Validates structural sections — does NOT enforce stylistic choices.

Why fail-open: writing a plan is rarely a high-blast-radius action, and an over-
zealous validator that denies "almost-right" plans is more harmful than one
that only warns. The warning is the signal; the human (or evaluator agent)
is the gate.
"""
from __future__ import annotations

import json
import sys
import typing

from datetime import datetime, timezone
from pathlib import Path

from _hook_utils import get_log_dir, log_hook_error

REQUIRED_SECTIONS = ("## Context", "## Phases", "## Risks", "## Verification")
MIN_LENGTH_CHARS = 400


def read_input() -> dict[str, object]:
    try:
        raw = sys.stdin.read()
        return typing.cast(dict[str, object], json.loads(raw)) if raw.strip() else {}
    except Exception as exc:
        log_hook_error("plan_validator.read_input", exc)
        return {}


def allow() -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
        }
    }))


def warn(file_path: str, issues: list[str]) -> None:
    print(
        f"plan_validator: '{file_path}' has structural issues:\n  - "
        + "\n  - ".join(issues),
        file=sys.stderr,
    )
    try:
        entry = json.dumps({
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "file": file_path,
            "issues": issues,
        })
        with (get_log_dir() / "plan-validator.jsonl").open("a") as f:
            _ = f.write(entry + "\n")
    except Exception as exc:
        log_hook_error("plan_validator.warn.write", exc)


def main() -> None:
    data = read_input()
    if not data:
        allow()
        return

    tool_input = data.get("tool_input", data)
    if not isinstance(tool_input, dict):
        allow()
        return

    file_path = str(tool_input.get("file_path", ""))
    content = str(tool_input.get("content", ""))

    # Only validate writes to docs/plans/*.md
    if not file_path or "/docs/plans/" not in file_path or not file_path.endswith(".md"):
        allow()
        return

    issues: list[str] = []

    if len(content) < MIN_LENGTH_CHARS:
        issues.append(
            f"content is {len(content)} chars (< {MIN_LENGTH_CHARS}); plans should describe context, phases, risks, verification"
        )

    for section in REQUIRED_SECTIONS:
        if section not in content:
            issues.append(f"missing section heading '{section}'")

    # Spot-check for cited absolute paths that actually exist (best-effort)
    referenced_paths: list[str] = []
    for line in content.splitlines():
        # match `/Users/...` or `/home/...` paths in backticks
        if "`/Users/" in line or "`/home/" in line:
            for token in line.split("`"):
                if token.startswith(("/Users/", "/home/")):
                    referenced_paths.append(token.strip())
    missing = [p for p in referenced_paths if not Path(p.split()[0]).exists()][:3]
    if missing:
        issues.append(
            "cites paths that do not exist on disk: " + ", ".join(missing)
        )

    if issues:
        warn(file_path, issues)

    allow()


if __name__ == "__main__":
    main()
    sys.exit(0)
