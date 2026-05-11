#!/usr/bin/env python3
"""task_completed.py - Log task completion.
Trigger: TaskCompleted
"""
import json
import sys
import typing

from datetime import datetime, timezone

from _hook_utils import get_log_dir, log_hook_error


def read_input() -> dict[str, object]:
    try:
        raw = sys.stdin.read()
        return typing.cast(dict[str, object], json.loads(raw)) if raw.strip() else {}
    except Exception as exc:
        log_hook_error("task_completed.read_input", exc)
        return {}


def main() -> None:
    data: dict[str, object] = read_input()
    task_id = str(data.get("task_id", "unknown"))
    task_subject = str(data.get("task_subject", "unknown"))
    teammate_name = str(data.get("teammate_name", ""))

    if not teammate_name:
        sys.exit(0)

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    entry = json.dumps({
        "timestamp": ts,
        "event": "task_completed",
        "teammate": teammate_name,
        "task_id": task_id,
        "subject": task_subject,
    })

    try:
        with (get_log_dir() / "team-events.jsonl").open("a") as f:
            _ = f.write(entry + "\n")
    except Exception as exc:
        log_hook_error("task_completed.write", exc)


if __name__ == "__main__":
    main()
    sys.exit(0)
