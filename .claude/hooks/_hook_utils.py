#!/usr/bin/env python3
"""_hook_utils.py - Shared helpers for .claude/hooks/*.

Centralizes project-dir resolution, log directory handling, defensive int
parsing, and post-mortem error logging. All hooks remain fail-open: helpers
swallow errors and return safe defaults, while `log_hook_error` records a
trace to `.claude/logs/hook-errors.log` for later debugging.

Stdlib only (json, os, subprocess, pathlib). No third-party imports.
"""
from __future__ import annotations

import json
import os
import subprocess
import traceback

from datetime import datetime, timezone
from pathlib import Path


def resolve_project_dir() -> str:
    """Return the project root.

    Resolution order:
      1. $CLAUDE_PROJECT_DIR (set by the Claude Code runtime)
      2. `git rev-parse --show-toplevel` from current working dir
      3. Parent-of-parent of this file (`.claude/hooks/_hook_utils.py` → repo root)
    """
    if d := os.environ.get("CLAUDE_PROJECT_DIR"):
        return d
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=3,
        )
        if (top := result.stdout.strip()):
            return top
    except Exception:
        pass
    return str(Path(__file__).resolve().parent.parent.parent)


def get_log_dir() -> Path:
    """Return `.claude/logs/` under the resolved project dir, creating it if needed."""
    log_dir = Path(resolve_project_dir()) / ".claude" / "logs"
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return log_dir


def safe_read_int(path: Path, default: int = 0) -> int:
    """Read an int from `path`, returning `default` on any failure
    (missing file, empty content, non-numeric, permission error)."""
    try:
        return int(path.read_text().strip())
    except Exception:
        return default


def log_hook_error(hook_name: str, exc: BaseException) -> None:
    """Append a one-line JSON record to `.claude/logs/hook-errors.log`.

    Never raises: if writing fails, the error is silently swallowed. This
    function is the post-mortem channel — it is the last line of defense for
    debugging hooks that would otherwise fail silently.
    """
    try:
        entry = {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "hook": hook_name,
            "error_type": type(exc).__name__,
            "message": str(exc)[:500],
            "trace": "".join(traceback.format_exception_only(type(exc), exc))[:1000],
        }
        with (get_log_dir() / "hook-errors.log").open("a") as f:
            _ = f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


__all__ = [
    "resolve_project_dir",
    "get_log_dir",
    "safe_read_int",
    "log_hook_error",
]
