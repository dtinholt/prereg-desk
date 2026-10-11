#!/bin/sh
# Runs the stress round in headless Chrome and prints one finding per line.
HERE=$(cd "$(dirname "$0")/.." && pwd)
node "$HERE/tests/cdp.mjs" "file://$HERE/index.html" "$HERE/tests/stress.js" "$@" 2>&1 | python3 -c '
import sys, json
bad = 0
for line in sys.stdin:
    try: o = json.loads(line)
    except Exception: print(line.rstrip()[:300]); continue
    if "result" in o:
        for k, v in (o["result"] or {}).items():
            s = json.dumps(v, ensure_ascii=False)
            if "FAIL" in s or "THREW" in s: bad += 1
            print(k, "=>", s[:600])
    elif "PASS" not in o.get("text", ""): print(json.dumps(o)[:300])
    if "pageerror" in o or "scripterror" in o: bad += 1
sys.exit(1 if bad else 0)
'
