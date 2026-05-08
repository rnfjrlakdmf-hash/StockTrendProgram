import sys

file_path = "backend/korea_data.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
deindent_start = 0
for i, line in enumerate(lines):
    # Find the start of domestic logic
    if i >= 1475 and "# Domestic Stock Logic (Naver)" in line:
        deindent_start = i
        break

if deindent_start == 0:
    print("Could not find start point")
    sys.exit(1)

for i, line in enumerate(lines):
    if i >= deindent_start:
        # Check if line starts with 8 spaces
        if line.startswith("        "):
            new_lines.append(line[4:])
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"Successfully de-indented from line {deindent_start+1}")
