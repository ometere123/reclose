"""Repository-root pytest configuration.

Local-only workaround for a pre-existing Windows-specific bug in the installed `gltest` package
(genlayer_test, .venv-c1/Lib/site-packages/gltest/direct/loader.py::_inject_message_to_fd0).

That function creates a temp file, `os.dup2`s it onto fd 0 (stdin) for the GenVM subprocess to
read, then immediately calls `os.unlink(path)` in a `finally` block. On POSIX this is the standard
"unlink while open" idiom and is safe. On Windows, deleting a file while any handle to it remains
open (here, the dup'd fd 0) raises `PermissionError: [WinError 32]`, because the file was opened by
`tempfile.mkstemp()` without `FILE_SHARE_DELETE` semantics. Worse, inspection of the installed
package shows `vm._original_stdin_fd` is saved but never restored/closed anywhere in the module, so
the dup'd handle on fd 0 is never released for the life of the process - a retry-with-backoff loop
around the unlink would never succeed either.

This is a bug in the third-party `gltest` package, not in Reclose's own contracts or tests, and is
NOT shipped - it only patches this local venv's already-installed copy in-process, only for the
narrow WinError 32 case, and only so this repository's existing Direct Mode contract test suite can
actually run on this Windows machine. The orphaned temp files this leaves behind are harmless
(single small files under the OS temp dir; normal OS/temp-cleanup handles them eventually).

See docs/execution/Current Phase.md ("CRITICAL CORRECTION" section) and
docs/execution/HANDOFF.md for the investigation this unblocked.
"""

import os

_original_unlink = os.unlink


def _tolerant_unlink(path, *args, **kwargs):
    try:
        return _original_unlink(path, *args, **kwargs)
    except PermissionError as exc:
        # Only swallow the specific Windows "file still open elsewhere" case (WinError 32).
        # Any other PermissionError (e.g. genuine ACL/permission problems) still propagates.
        if getattr(exc, "winerror", None) == 32:
            return None
        raise


# Only patch on Windows, and only if not already patched (idempotent across repeated collection).
if os.name == "nt" and os.unlink is _original_unlink:
    os.unlink = _tolerant_unlink
