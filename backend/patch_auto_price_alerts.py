import os
import re

file_path = "backend/auto_price_alerts.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update tuple unpacking
content = content.replace("current, prev_close, high_52 = await asyncio.to_thread(_fetch_price_data)",
                          "current, prev_close, high_52, vol_ratio = await asyncio.to_thread(_fetch_price_data)")

# 2. Add volume check inside _fetch_price_data
target_return = "return current, prev_close, high_52"
replacement_return = """vol_ratio = 0.0
                    try:
                        import yfinance as yf
                        yf_sym = f"{clean_sym}.KS" if clean_sym.isdigit() else clean_sym
                        t = yf.Ticker(yf_sym)
                        # fast_info 호출 시 네트워크 요청 발생 가능성 있음 (yfinance 캐싱 활용)
                        curr_vol = getattr(t.fast_info, 'last_volume', 0)
                        avg_vol = getattr(t.fast_info, 'ten_day_average_volume', 0)
                        if avg_vol and avg_vol > 0 and curr_vol:
                            vol_ratio = curr_vol / avg_vol
                    except:
                        pass
                    return current, prev_close, high_52, vol_ratio"""

# Naver API success return
content = content.replace("return current, prev_close, high_52", replacement_return, 1)

# yfinance Fallback return
yfinance_return_target = """                return current, prev_close, high_52
            except Exception as e:"""
yfinance_return_replacement = """                vol_ratio = 0.0
                try:
                    curr_vol = getattr(ticker.fast_info, 'last_volume', 0)
                    avg_vol = getattr(ticker.fast_info, 'ten_day_average_volume', 0)
                    if avg_vol and avg_vol > 0 and curr_vol:
                        vol_ratio = curr_vol / avg_vol
                except: pass
                return current, prev_close, high_52, vol_ratio
            except Exception as e:"""
content = content.replace(yfinance_return_target, yfinance_return_replacement)

# Fallback failure return
content = content.replace("return None, None, None", "return None, None, None, 0.0")

# 3. Add volume_spike state initialization
state_init_target = """self.notified_events[today_str][symbol] = {"up_5": False, "down_5": False, "high_52": False}"""
state_init_replace = """self.notified_events[today_str][symbol] = {"up_5": False, "down_5": False, "high_52": False, "vol_spike": False}"""
content = content.replace(state_init_target, state_init_replace)

# 4. Add Volume Spike alert logic
alert_logic_target = """        # 🚀 5% 이상 상승 포착 (오늘 알림을 안 보낸 경우)"""
alert_logic_replace = """        # 🧨 거래량 폭발 (10일 평균 대비 500% 이상) 및 상승 포착
        if vol_ratio >= 5.0 and change_pct > 0 and not state.get("vol_spike", False):
            state["vol_spike"] = True
            alerts_to_send.append({
                "title": "🚀 거래량 폭발",
                "body": f"거래량이 평소보다 {int(vol_ratio*100)}% 급증하며 상승 중입니다! ({curr_str})",
                "type": "volume_spike"
            })

        # 🚀 5% 이상 상승 포착 (오늘 알림을 안 보낸 경우)"""
content = content.replace(alert_logic_target, alert_logic_replace)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Auto price alerts patched for volume spikes.")
