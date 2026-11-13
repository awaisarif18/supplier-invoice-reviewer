#!/usr/bin/python3
"""Receive a tested static release through the restricted deployment key."""
import fcntl
import os
from pathlib import Path
import re
import shutil
import sys
import tarfile
import tempfile

ROOT = Path("/srv/supplier-invoice-reviewer")
MAX_BYTES = 32 * 1024 * 1024


def unpack(stage, source):
    total = 0
    with tarfile.open(fileobj=source, mode="r|") as archive:
        for index, member in enumerate(archive):
            relative = Path(member.name)
            if (index >= 2000 or relative.is_absolute() or ".." in relative.parts
                    or relative == Path("release.txt")):
                raise ValueError(f"Invalid archive entry: {member.name!r}")
            target = stage / relative
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            if not member.isfile():
                raise ValueError(f"Unsupported archive entry: {member.name!r}")
            total += member.size
            if total > MAX_BYTES:
                raise ValueError("Release exceeds 32 MiB")
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as src, target.open("xb") as dst:
                shutil.copyfileobj(src, dst)
    if not (stage / "index.html").is_file():
        raise ValueError("Missing index.html")


def point(name, target):
    pending = ROOT / (name + ".next")
    pending.unlink(missing_ok=True)
    pending.symlink_to(target)
    pending.replace(ROOT / name)


def deploy(sha):
    os.umask(0o022)
    with (ROOT / ".deploy.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        releases = ROOT / "releases"
        with tempfile.TemporaryDirectory(prefix="stage-", dir=releases) as temp:
            stage = Path(temp) / "public"
            stage.mkdir()
            unpack(stage, sys.stdin.buffer)
            # Consume the end of the stream before activating the release.
            while sys.stdin.buffer.read(64 * 1024):
                pass
            (stage / "release.txt").write_text(sha + "\n", encoding="ascii")
            release = releases / sha
            if not release.exists():
                stage.rename(release)
            target = Path("releases") / sha
            current = ROOT / "current"
            if current.is_symlink() and current.readlink() != target:
                point("previous", current.readlink())
            point("current", target)
    print(f"Deployed {sha}")


if __name__ == "__main__":
    command = os.environ.get("SSH_ORIGINAL_COMMAND", "")
    match = re.fullmatch(r"deploy ([0-9a-f]{40})", command)
    if match is None:
        sys.exit("Expected deploy followed by a full Git commit SHA")
    deploy(match[1])
