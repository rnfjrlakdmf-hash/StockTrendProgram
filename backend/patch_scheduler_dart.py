import os
import re

file_path = "backend/scheduler.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = '''            is_whale = any(kw in report_title.replace(" ", "") for kw in whale_keywords)
            if is_whale:
                try:'''

replacement = '''            is_whale = any(kw in report_title.replace(" ", "") for kw in whale_keywords)
            if is_whale:
                # [스마트 필터링] 단일판매ㆍ공급계약체결의 경우 매출액 대비 20% 이상인 초대형 계약만 발송
                skip_whale_alert = False
                prefix_title = "🚨 [세력 포착 라이브]"
                if "단일판매" in report_title.replace(" ", ""):
                    from dart_scraper import scrape_dart_text
                    import re
                    dart_text = scrape_dart_text(dart_link)
                    match = re.search(r'매출액\s*대비\s*[\(]?\s*([0-9\.]+)\s*[\)]?\s*%', dart_text)
                    if match:
                        try:
                            ratio = float(match.group(1))
                            if ratio < 20.0:
                                skip_whale_alert = True
                                logger.info(f"[WhaleSiren] Skipped {corp} (Ratio {ratio}% < 20%)")
                            else:
                                prefix_title = f"🔥 [초대박 공시: 매출액 {ratio}%]"
                                logger.info(f"[WhaleSiren] Massive contract! {corp} (Ratio {ratio}%)")
                        except:
                            pass
                
                if not skip_whale_alert:
                    try:'''

if target in content:
    content = content.replace(target, replacement)
    
    # Also replace push_title inside the block
    push_target = '''                        push_title = f"🚨 [세력 포착 라이브] {corp}"'''
    push_replacement = '''                        push_title = f"{prefix_title} {corp}"'''
    content = content.replace(push_target, push_replacement)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patch applied successfully.")
else:
    print("Target not found.")
