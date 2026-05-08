
import os

target = 'backend/korea_data.py'
with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()

errors = []
for i, line in enumerate(lines):
    if 'f"' in line and '{' in line and '}' not in line:
        errors.append((i + 1, line.strip()))
    if "f'" in line and '{' in line and '}' not in line:
        errors.append((i + 1, line.strip()))

if errors:
    print(f"Found {len(errors)} potential broken f-strings:")
    for lnum, content in errors:
        print(f"Line {lnum}: {content}")
else:
    print("No broken f-strings found.")
