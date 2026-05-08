import sys

file_path = "backend/korea_data.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
in_function = False
func_start = 1320
func_end = 1681

for i, line in enumerate(lines):
    line_num = i + 1
    
    # Range of get_stock_financials
    if func_start <= line_num <= func_end:
        # Define expected indentation
        # Base function level is 0 spaces (def) -> content should be 4 spaces
        # But wait, the file uses 4 spaces for def too? No, def should be at 0.
        
        # Let's check the line content and apply correct indentation
        stripped = line.lstrip()
        if not stripped:
            new_lines.append("\n")
            continue
            
        # Determine logical depth
        # Simple heuristic for this specific function
        if stripped.startswith("def "):
            new_lines.append(stripped)
        elif stripped.startswith("if is_global:"):
            new_lines.append("    " + stripped)
        elif stripped.startswith("try:") or stripped.startswith("except") or stripped.startswith("return ") or stripped.startswith("financials = {") or stripped.startswith("# "):
             # If it was inside global logic (approx lines 1334-1468)
             if 1334 <= line_num <= 1468:
                 new_lines.append("        " + stripped)
             else:
                 new_lines.append("    " + stripped)
        else:
             # Standard lines
             if 1334 <= line_num <= 1468:
                 # Check if it's deeply nested (like inside try/if)
                 # This is getting complex. Let's just fix the broken ones.
                 new_lines.append(line)
             elif 1475 <= line_num <= 1677:
                 new_lines.append("    " + stripped)
             elif 1678 <= line_num <= 1680:
                 if stripped.startswith("except"):
                     new_lines.append("    " + stripped)
                 else:
                     new_lines.append("        " + stripped)
             else:
                 new_lines.append(line)
    else:
        new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Indentation repair complete")
