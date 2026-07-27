import os

filepath = "backend/korea_data.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Add 삼성전기 to STOCK_MAP
if '"삼성전기": "009150"' not in content:
    content = content.replace('"삼성SDI": "006400",', '"삼성SDI": "006400",\n    "삼성전기": "009150",')

# Comment out AC API block
target_block = """    # 2. Naver Finance Auto-Complete API (Official mapping service)
    try:"""
replacement_block = """    # 2. Naver Finance Auto-Complete API (Official mapping service)
    # [DISABLED] ac.finance.naver.com is currently failing DNS resolution causing massive timeouts.
    \"\"\"
    try:"""

if "try:\n        print(f\"[Search Tier 2]" in content and "# [DISABLED]" not in content:
    content = content.replace(target_block, replacement_block)
    
    end_target_block = """    except Exception as e:
        print(f"  !! AC API Stage failed: {e}. Moving to Tier 3.")"""
    end_replacement_block = """    except Exception as e:
        print(f"  !! AC API Stage failed: {e}. Moving to Tier 3.")
    \"\"\""""
    content = content.replace(end_target_block, end_replacement_block)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("korea_data.py patched successfully.")
