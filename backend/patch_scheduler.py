import codecs

with codecs.open('scheduler.py', 'r', 'utf-8') as f:
    text = f.read()

text = text.replace('from datetime import datetime, timedelta', 'from datetime import datetime, timedelta\nfrom holiday_checker import is_holiday')
text = text.replace('is_weekend = (now.weekday() >= 5)', 'is_weekend = is_holiday("kor")')

old_disclosure = """        try:
            await asyncio.sleep(300)  # 5분 간격

            # 국내 DART 공시 체크
            await check_and_notify_disclosures()

            # 해외 SEC 공시 체크
            await check_and_notify_sec_disclosures()

            # IPO는 30분마다 (5분 * 6 = 30분)
            ipo_check_counter += 1
            if ipo_check_counter >= 6:
                await check_and_notify_ipos()
                ipo_check_counter = 0

        except Exception as e:"""

new_disclosure = """        try:
            await asyncio.sleep(300)  # 5분 간격

            kor_holiday = is_holiday("kor")
            us_holiday = is_holiday("us")

            # 국내 DART 공시 체크
            if not kor_holiday:
                await check_and_notify_disclosures()

            # 해외 SEC 공시 체크
            if not us_holiday:
                await check_and_notify_sec_disclosures()

            # IPO는 30분마다 (5분 * 6 = 30분)
            ipo_check_counter += 1
            if ipo_check_counter >= 6:
                if not kor_holiday:
                    await check_and_notify_ipos()
                ipo_check_counter = 0

        except Exception as e:"""

text = text.replace(old_disclosure, new_disclosure)

with codecs.open('scheduler.py', 'w', 'utf-8') as f:
    f.write(text)

print("scheduler.py patched")
