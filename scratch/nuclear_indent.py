import sys

file_path = "backend/korea_data.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
indent_next = False
for line in lines:
    stripped = line.lstrip()
    if not stripped:
        new_lines.append(line)
        continue
        
    if indent_next:
        # If the line is not already more indented than the previous line
        current_indent = len(line) - len(stripped)
        if current_indent <= last_indent:
            new_lines.append("    " + line)
        else:
            new_lines.append(line)
        indent_next = False
    else:
        new_lines.append(line)
        
    # Check if this line ends with : and is a control statement
    if stripped.endswith(":\n") or stripped.endswith(": \n"):
        indent_next = True
        last_indent = len(line) - len(stripped)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Forced indentation fix complete")
