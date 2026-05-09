
import os
import re

target = 'backend/korea_data.py'
with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()

patterns = [
    r'\"change\":\s*f\"',
    r'\"change_pct\":\s*f\"',
    r'\"percent\":\s*f\"'
]

matches = []
for i, line in enumerate(lines):
    for p in patterns:
        if re.search(p, line):
            matches.append((i + 1, line.strip()))

if matches:
    print(f"Found {len(matches)} potential formatted fields:")
    for lnum, content in matches:
        print(f"Line {lnum}: {content}")
else:
    print("No matches found.")
