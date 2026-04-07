import re

with open('frontend/src/app/discovery/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('check_out.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(lines):
        text = line.strip()
        if 'className' in text: continue
        if '?' in text and ':' in text and '{' in text and '}' in text:
            if not '<span' in text and ('\'' in text or '"' in text):
                out.write(f'{i+1}: {text[:200]}\n')
