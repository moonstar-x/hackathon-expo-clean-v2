#!/bin/sh
# Fails if Localizable.xcstrings has a key without a Spanish value, a stale key, or a key that
# isn't a semantic `area.element` key. Run after scripts/sync-strings.sh.
set -e
cd "$(dirname "$0")/.."
python3 - RoomScanner/Resources/Localizable.xcstrings <<'EOF'
import json, re, sys

catalog = json.load(open(sys.argv[1]))
key_pattern = re.compile(r"^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)+( %(lld|@|ld|d|f))*$")
problems = []
for key, entry in sorted(catalog["strings"].items()):
    if entry.get("extractionState") == "stale":
        problems.append(f"stale: {key!r}")
    if not key_pattern.match(key):
        problems.append(f"not a semantic key: {key!r}")
    value = entry.get("localizations", {}).get("es", {}).get("stringUnit", {}).get("value")
    if not value:
        problems.append(f"no es value: {key!r}")
if catalog.get("sourceLanguage") != "es":
    problems.append("sourceLanguage is not es")
for problem in problems:
    print(problem)
if problems:
    sys.exit(f"{len(problems)} problem(s) in Localizable.xcstrings")
print(f"Localizable.xcstrings OK ({len(catalog['strings'])} keys)")
EOF
