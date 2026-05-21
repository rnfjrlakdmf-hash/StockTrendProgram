
import os

filepath = r'c:\Users\rnfjr\StockTrendProgram\backend\korea_data.py'

with open(filepath, 'rb') as f:
    content = f.read()

null_indices = [i for i, b in enumerate(content) if b == 0]

if not null_indices:
    print("No null bytes found. File might be fine or just wrong encoding.")
    exit()

first_null = null_indices[0]
valid_part = content[:first_null]
# Backtrack to last newline to find the join point (assuming line-based append)
last_newline = valid_part.rfind(b'\n')
if last_newline != -1:
    split_point = last_newline + 1
else:
    split_point = first_null

clean_part = content[:split_point]
# The remainder is presumably the UTF-16 part.
# However, if it was appended with '>>' in Powershell, it likely starts with a BOM or just the chars.
# If we cut at newline, the next char might be the start of the UTF-16 string.
dirty_part = content[split_point:]

print(f"Clean part size: {len(clean_part)}")
print(f"Dirty part size: {len(dirty_part)}")

decoded_dirty = ""
try:
    decoded_dirty = dirty_part.decode('utf-16le')
    print("Successfully decoded dirty part as utf-16le")
except Exception as e:
    print(f"Failed to decode as utf-16le: {e}")
    decoded_dirty = dirty_part.decode('utf-16le', errors='ignore')

decoded_clean = ""
try:
    decoded_clean = clean_part.decode('utf-8')
except:
    try:
        decoded_clean = clean_part.decode('cp949')
    except:
        decoded_clean = clean_part.decode('utf-8', errors='replace')

full_text = decoded_clean + "\n" + decoded_dirty

# Remove BOM if present inside the text (FEFF)
full_text = full_text.replace('\ufeff', '')

with open(filepath + '.bak', 'wb') as f:
    f.write(content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(full_text)

print("File fixed and saved.")
