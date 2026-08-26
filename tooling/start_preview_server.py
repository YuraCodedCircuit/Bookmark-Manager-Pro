"""Start the Bookmark Manager Pro local Vite preview server."""

from __future__ import annotations

import argparse
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HOST = "127.0.0.1"
PORT = 5173
BUNDLED_NODE = (
    Path.home()
    / ".cache"
    / "codex-runtimes"
    / "codex-primary-runtime"
    / "dependencies"
    / "node"
    / "bin"
    / "node.exe"
)


def server_is_listening() -> bool:
    try:
        with socket.create_connection((HOST, PORT), timeout=0.2):
            return True
    except OSError:
        return False


def normalized_environment(node: str) -> dict[str, str]:
    """Build a child environment without Windows Path/PATH collisions."""
    environment = {
        key: value for key, value in os.environ.items() if key.casefold() != "path"
    }
    inherited_path = os.environ.get("PATH") or os.environ.get("Path") or ""
    environment["PATH"] = os.pathsep.join(
        value for value in (str(Path(node).parent), inherited_path) if value
    )
    return environment


def resolve_node(explicit_node: Path | None) -> str | None:
    """Resolve an explicit, PATH-provided, or bundled Node executable."""
    if explicit_node is not None:
        return str(explicit_node.resolve())
    return (
        shutil.which("node")
        or shutil.which("node.exe")
        or (str(BUNDLED_NODE) if BUNDLED_NODE.is_file() else None)
    )


def start_in_background(repository_root: Path, node: str) -> int:
    stdout_path = Path(tempfile.gettempdir()) / "bookmark-manager-pro-preview.stdout.log"
    stderr_path = Path(tempfile.gettempdir()) / "bookmark-manager-pro-preview.stderr.log"
    command = [sys.executable, str(Path(__file__).resolve())]
    popen_options: dict[str, object] = {
        "close_fds": True,
        "cwd": repository_root,
        "env": normalized_environment(node),
    }
    if sys.platform == "win32":
        popen_options["creationflags"] = (
            subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        )
    else:
        popen_options["start_new_session"] = True

    with stdout_path.open("a", encoding="utf-8") as stdout_file, stderr_path.open(
        "a", encoding="utf-8"
    ) as stderr_file:
        process = subprocess.Popen(
            command,
            stdout=stdout_file,
            stderr=stderr_file,
            **popen_options,
        )

    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if server_is_listening():
            print(f"Preview server is running in the background (PID {process.pid}).")
            return 0
        if process.poll() is not None:
            print(
                f"Preview server exited before it was ready. See {stderr_path}",
                file=sys.stderr,
            )
            return process.returncode or 1
        time.sleep(0.1)

    print(
        f"Preview server did not become ready. See {stderr_path}",
        file=sys.stderr,
    )
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--background",
        action="store_true",
        help="detach after the preview server becomes ready",
    )
    parser.add_argument(
        "--node",
        type=Path,
        help=argparse.SUPPRESS,
    )
    arguments = parser.parse_args()
    repository_root = Path(__file__).resolve().parent.parent
    package_json = repository_root / "package.json"
    if not package_json.is_file():
        print("Could not find package.json next to the tooling directory.", file=sys.stderr)
        return 1

    node = resolve_node(arguments.node)
    if node is None:
        print(
            "Node.js was not found. Install the version required by package.json "
            "or pass its executable with --node and try again.",
            file=sys.stderr,
        )
        return 1
    if not Path(node).is_file():
        print(f"Node.js executable does not exist: {node}", file=sys.stderr)
        return 1

    vite = repository_root / "node_modules" / "vite" / "bin" / "vite.js"
    if not vite.is_file():
        print(
            "Dependencies are not installed. Run 'pnpm install --frozen-lockfile' "
            "before starting the server.",
            file=sys.stderr,
        )
        return 1

    if server_is_listening():
        print(f"Bookmark Manager Pro is already running at http://{HOST}:{PORT}/")
        return 0

    if arguments.background:
        return start_in_background(repository_root, node)

    command = [node, str(vite)]
    print(f"Starting Bookmark Manager Pro at http://{HOST}:{PORT}/")
    print("Press Ctrl+C to stop the server.")
    try:
        return subprocess.run(command, cwd=repository_root, check=False).returncode
    except KeyboardInterrupt:
        print("\nPreview server stopped.")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
