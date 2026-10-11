#!/bin/sh
# Headless smoke test: loads the page, waits for the console self-check, exits non-zero unless it passed.
# Usage: sh tests/smoke.sh   (from anywhere)
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd)
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
PROFILE=$(mktemp -d "${TMPDIR:-/tmp}/prereg-smoke.XXXXXX")
DOM=$("$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" \
  --virtual-time-budget=15000 --dump-dom "file://$HERE/index.html" 2>/dev/null)
rm -rf "$PROFILE"
COUNT=$(printf '%s' "$DOM" | grep -o 'data-selfcheck-count="[0-9]*/[0-9]*"' | head -1 | sed 's/.*="\(.*\)"/\1/')
if printf '%s' "$DOM" | grep -q 'data-selfcheck="pass"'; then
  echo "smoke: self-check passed ($COUNT)"
  exit 0
fi
if printf '%s' "$DOM" | grep -q 'data-selfcheck="fail"'; then
  echo "smoke: self-check FAILED ($COUNT); open the page and read the console" >&2
else
  echo "smoke: self-check did not finish; the page may have thrown on load" >&2
fi
exit 1
