import re

content = open('rank_data.py', 'r', encoding='utf-8').read()

new_code = """            us_symbols = [
                "SPY", "QQQ", "DIA", "IWM", "VOO", "VTI", "IVV", "QQQM", "RSP", "MDY", "IJR", "VUG", "VTV", "IWF", "IWD", "IJH", "ITOT", "SCHX", "SCHB", "SPLG", "SPYG", "SPYV",
                "SQQQ", "PSQ", "SH", "SDS", "SPXU", "QID", "DOG", "DXD", "SDOW", "SRTY", "TZA", "HIBS", "RWM", "FAZ", "TECS", "SOXS", "SPXS", "UVXY", "VIXY", "SVXY", "REW", "PST",
                "TQQQ", "SOXL", "UPRO", "TECL", "FAS", "SSO", "QLD", "USD", "CURE", "RETL", "NAIL", "DPST", "LABU", "JNUG", "UCO", "BOIL", "YINN", "CWEB", "NUGT", "UYG", "DRN",
                "SCHD", "JEPI", "VIG", "VYM", "JEPQ", "DVY", "SPYD", "SDY", "HDV", "FVD", "NOBL", "DGRO", "PEY", "PGX", "VYMI", "IDV", "IQLT", "RDIV", "SPHD", "DON", "DGRW", "PFF",
                "TLT", "BND", "AGG", "TMF", "IEF", "SHY", "LQD", "HYG", "MUB", "VCIT", "BSV", "GOVT", "MBB", "BNDX", "JNK", "SJNK", "FLOT", "BKLN", "SRLN", "SPAB", "VGIT", "VCSH",
                "XLK", "SMH", "SOXX", "LIT", "ARKK", "XLV", "XLE", "IBIT", "GLD", "XLF", "XLY", "XLP", "XLU", "XLI", "XLB", "XLC", "VNQ", "SLV", "URNM", "URA", "COPX",
                "BATT", "ICLN", "PBW", "QCLN", "TAN", "FAN", "ACES", "XOP", "OIH", "VDE", "ERX", "ERY", "DRIP", "GUSH", "AMJ", "AMLP", "KRA", "RYE", "FENY", "NLR",
                "BOTZ", "ROBO", "IRBO", "ARKQ", "IGV", "SKYY", "CIBR", "HACK", "AIQ", "BUG", "WCLD", "XT", "KOMP", "TECB", "CLOU", "FCLD", "LNZ", "THNQ", "CHAT", "AI",
                "XSD", "PSI", "FTXL", "SOXQ", "CHPS", "SEMI",
                "VHT", "IYH", "ARKG", "XBI", "IBB", "PPH", "XHS", "CURE", "LABU", "LABD", "RXD", "RXL", "SBIO", "BBC", "BBP", "PILL", "GERN"
            ]
            
            name_map = {
                "SPY": "SPDR S&P 500 ETF", "QQQ": "Invesco QQQ Trust", "VOO": "Vanguard S&P 500 ETF", "VTI": "Vanguard Total Stock Market", 
                "SOXX": "iShares Semiconductor ETF", "TQQQ": "ProShares UltraPro QQQ", "SQQQ": "ProShares UltraPro Short QQQ",
                "SCHD": "Schwab US Dividend Equity", "JEPI": "JPMorgan Equity Premium Income", "SOXL": "Direxion Daily Semiconductor Bull 3X",
                "ARKK": "ARK Innovation ETF", "TLT": "iShares 20+ Year Treasury Bond", "IBIT": "iShares Bitcoin Trust",
                "XLK": "Technology Select Sector SPDR", "XLE": "Energy Select Sector SPDR", "XLF": "Financial Select Sector SPDR",
                "SMH": "VanEck Semiconductor ETF", "IWM": "iShares Russell 2000 ETF", "DIA": "SPDR Dow Jones Industrial Average",
                "GLD": "SPDR Gold Shares"
            }
            
            import yfinance as yf
            import pandas as pd
            
            unique_symbols = list(set(us_symbols))
            hist = yf.download(unique_symbols, period="5d", progress=False)
            
            results = []
            for sym in unique_symbols:
                try:
                    if "Close" in hist.columns.levels[0]:
                        close_col = ("Close", sym)
                        vol_col = ("Volume", sym)
                        if close_col not in hist.columns:
                            continue
                        closes = hist[close_col].dropna()
                        vols = hist[vol_col].dropna()
                    else:
                        closes = hist["Close"][sym].dropna()
                        vols = hist["Volume"][sym].dropna()
                        
                    if len(closes) < 1:
                        continue
                        
                    price = float(closes.iloc[-1])
                    prev_price = float(closes.iloc[-2]) if len(closes) >= 2 else price
                    volume = int(vols.iloc[-1]) if len(vols) >= 1 else 0
                    
                    change_val = price - prev_price
                    change_pct = (change_val / prev_price) * 100 if prev_price > 0 else 0
                    
                    if price > 0:
                        results.append({
                            "symbol": sym,
                            "name": name_map.get(sym, sym),
                            "price": f"{price:,.2f}",
                            "change": f"{change_val:+.2f}",
                            "change_percent": round(change_pct, 2),
                            "volume": str(volume)
                        })
                except Exception as e:
                    pass
            
            us_etfs = results
            
            if us_etfs:
                us_etfs.sort(key=lambda x: int(str(x.get("volume", 0)).replace(",", "")), reverse=True)
                for i, item in enumerate(us_etfs):
                    item["rank"] = i + 1
                CACHE_US_ETFS["data"] = us_etfs
                CACHE_US_ETFS["timestamp"] = current_time"""

pattern = r'^\s*us_symbols\s*=\s*\[.*?CACHE_US_ETFS\["timestamp"\]\s*=\s*current_time'
content = re.sub(pattern, new_code, content, flags=re.DOTALL | re.MULTILINE)

with open('rank_data.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated rank_data.py")
