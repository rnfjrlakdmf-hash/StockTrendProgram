import sqlite3
import os
from datetime import datetime

# DB File Path
# Production (Railway): Set DB_PATH=/data/stock_app.db (with Volume mounted at /data)
# Development: Falls back to local directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# [Production-Fix] Redirect DB to /tmp if in read-only/ephemeral environments
if os.environ.get("VERCEL") or os.environ.get("RAILWAY_STATIC_URL") or os.environ.get("PORT"):
    # If DB_PATH is explicitly set (e.g. Volume mounted), use it. Otherwise use /tmp
    DB_FILE = os.environ.get("DB_PATH", "/tmp/stock_app.db")
    print(f"[Production] Database path: {DB_FILE}")
else:
    DB_FILE = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "stock_app.db"))

def get_db_connection():
    # Production-ready connection factory with WAL enforcement
    # Increased timeout to 60s to handle heavy AI analysis writes
    conn = sqlite3.connect(DB_FILE, timeout=60)
    try:
        # WAL mode is crucial for allowing readers (Dashboard) while writers (AI Backfiller) are active
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
    except Exception as e:
        print(f"[DB-Error] Failed to set WAL mode: {e}")
    return conn

def init_db():
    conn = sqlite3.connect(DB_FILE, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    cursor = conn.cursor()
    
    # AI 점수 히스토리 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS score_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            price REAL,
            score INTEGER,
            supply_score INTEGER,
            financial_score INTEGER,
            news_score INTEGER,
            summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Users Table (Google Login)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, -- Google ID
            email TEXT,
            name TEXT,
            picture TEXT,
            is_pro BOOLEAN DEFAULT 0,
            pro_expires_at TIMESTAMP, -- [NEW] Pro trial expiration
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            free_trial_count INTEGER DEFAULT 2,
            kis_app_key TEXT,
            kis_secret TEXT,
            kis_account TEXT
        )
    ''')
    
    # [Migration] Add free_trial_count if not exists
    try:
        cursor.execute("SELECT free_trial_count FROM users LIMIT 1")
    except sqlite3.OperationalError:
        print("Migrating users table (adding free_trial_count)...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN free_trial_count INTEGER DEFAULT 2")
        except Exception as e:
            print(f"Migration Warning: {e}")

    # [Migration] Add pro_expires_at if not exists
    try:
        cursor.execute("SELECT pro_expires_at FROM users LIMIT 1")
    except sqlite3.OperationalError:
        print("Migrating users table (adding pro_expires_at)...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN pro_expires_at TIMESTAMP")
        except Exception as e:
            print(f"Migration Warning: {e}")

    # [Migration] Add KIS API Keys if not exists (Step Id: 669)
    try:
        cursor.execute("SELECT kis_app_key FROM users LIMIT 1")
    except sqlite3.OperationalError:
        print("Migrating users table (adding KIS keys)...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN kis_app_key TEXT")
            cursor.execute("ALTER TABLE users ADD COLUMN kis_secret TEXT")
            cursor.execute("ALTER TABLE users ADD COLUMN kis_account TEXT")
        except Exception as e:
            print(f"Migration Warning (KIS): {e}")

    # Watchlist Table (User Specific)
    # Check if watchlist table has user_id column
    try:
        cursor.execute("SELECT user_id FROM watchlist LIMIT 1")
    except sqlite3.OperationalError:
        # Migration: Drop old table and recreate with user_id
        # (Data loss acceptable for dev, or copy if needed. Let's simpler recreate)
        print("Migrating watchlist to multi-user schema...")
        cursor.execute("DROP TABLE IF EXISTS watchlist")
        
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watchlist (
            user_id TEXT,
            symbol TEXT,
            added_price REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, symbol)
        )
    ''')
    
    # [Migration] Add added_price to watchlist if not exists
    try:
        cursor.execute("SELECT added_price FROM watchlist LIMIT 1")
    except sqlite3.OperationalError:
        try:
            cursor.execute("ALTER TABLE watchlist ADD COLUMN added_price REAL DEFAULT 0")
        except: pass
    

    
    
    # [NEW] FCM Tokens Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fcm_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            device_type TEXT,
            device_name TEXT,
            pref_morning BOOLEAN DEFAULT 1,
            pref_closing BOOLEAN DEFAULT 1,
            pref_price BOOLEAN DEFAULT 1,
            pref_news BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_morning BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_closing BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_price BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_news BOOLEAN DEFAULT 1")
    except: pass

    # [NEW] User Portfolio Table (Manual Entry)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_portfolio (
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            avg_price REAL DEFAULT 0,
            quantity REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, symbol)
        )
    ''')

    # [RECONSTRUCT] Signals Table (Intraday Scanner Signals)
    # 기존에 data 컬럼으로 잘못 생성되었거나 구조가 꼬인 경우를 대비해 초기화 후 재구성합니다.
    try:
        # 컬럼 존재 여부 체크
        cursor.execute("SELECT data_json FROM signals LIMIT 1")
    except sqlite3.OperationalError:
        print("[DB-Migration] Signals table structure mismatch or missing. Reconstructing...")
        cursor.execute("DROP TABLE IF EXISTS signals")
        
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            signal_type TEXT NOT NULL, -- VOLUME_SURGE, DISCLOSURE, INVESTOR_SURGE
            title TEXT,
            summary TEXT,
            data_json TEXT, -- JSON structure
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # [Analytics] Daily Site Visitor & Pageview Counter
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS site_analytics (
            date TEXT PRIMARY KEY,
            pageviews INTEGER DEFAULT 0,
            unique_visitors INTEGER DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS visitor_sessions (
            date TEXT,
            visitor_id TEXT,
            PRIMARY KEY (date, visitor_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS active_users (
            visitor_id TEXT PRIMARY KEY,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

def create_user_if_not_exists(user_data):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_data['id'],))
        row = cursor.fetchone()
        
        if not row:
            cursor.execute('''
                INSERT INTO users (id, email, name, picture, free_trial_count)
                VALUES (?, ?, ?, ?, 2)
            ''', (user_data['id'], user_data['email'], user_data['name'], user_data['picture']))
        else:
            # Update info
            cursor.execute('''
                UPDATE users SET name = ?, picture = ? WHERE id = ?
            ''', (user_data['name'], user_data['picture'], user_data['id']))
            
        conn.commit()
        return True
    except Exception as e:
        print(f"Create User Error: {e}")
        return False
    finally:
        conn.close()

def get_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, name, picture, is_pro, free_trial_count, pro_expires_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            is_pro = bool(row[4])
            pro_expires_at = row[6]
            
            # 만료 기간이 지났으면 Pro 권한 회수
            if is_pro and pro_expires_at:
                try:
                    expires_dt = datetime.strptime(pro_expires_at, "%Y-%m-%d %H:%M:%S")
                    if datetime.utcnow() > expires_dt:
                        is_pro = False
                        cursor.execute("UPDATE users SET is_pro = 0 WHERE id = ?", (user_id,))
                        conn.commit()
                except Exception as e:
                    print(f"Date parse error: {e}")
            
            return {
                "id": row[0],
                "email": row[1],
                "name": row[2],
                "picture": row[3],
                "is_pro": is_pro,
                "free_trial_count": row[5] if row[5] is not None else 2,
                "pro_expires_at": pro_expires_at
            }
        return None
    except Exception as e:
        print(f"Get User Error: {e}")
        return None
    finally:
        conn.close()

def decrement_free_trial(user_id):
    """
    1시간 무료 이용권 사용 (차감)
    Returns: new_count or -1 if failed/already 0
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        # Decrease only if > 0 and add 1 hour to pro_expires_at
        cursor.execute("""
            UPDATE users 
            SET free_trial_count = free_trial_count - 1,
                is_pro = 1,
                pro_expires_at = CASE 
                    WHEN pro_expires_at IS NULL OR pro_expires_at < datetime('now') THEN datetime('now', '+1 hour')
                    ELSE datetime(pro_expires_at, '+1 hour')
                END
            WHERE id = ? AND free_trial_count > 0
        """, (user_id,))
        if cursor.rowcount > 0:
            conn.commit()
            # Fetch new count
            cursor.execute("SELECT free_trial_count FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return row[0]
        else:
            return -1 # No change (probably 0 left)
    except Exception as e:
        print(f"Decrement Trial Error: {e}")
        return -1
    finally:
        conn.close()

def get_all_users():
    """Admin: 모든 사용자 목록 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, name, picture, is_pro, free_trial_count, created_at FROM users ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [
            {
                "id": r[0], "email": r[1], "name": r[2], "picture": r[3],
                "is_pro": bool(r[4]), "free_trial_count": r[5], "created_at": r[6]
            } for r in rows
        ]
    except Exception as e:
        print(f"Get All Users Error: {e}")
        return []
    finally:
        conn.close()

def toggle_user_pro_status(user_id: str, is_pro: bool):
    """Admin: 사용자 Pro 상태 토글"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 영구 Pro (만료일 없음)
        cursor.execute("UPDATE users SET is_pro = ?, pro_expires_at = NULL WHERE id = ?", (1 if is_pro else 0, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Toggle Pro Error: {e}")
        return False
    finally:
        conn.close()

def start_pro_trial(user_id: str):
    """사용자 7일 평가판 시작"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 이미 이전에 평가판을 썼는지 확인하기 위한 간단한 로직 (원한다면 추가 가능)
        # 지금은 그냥 언제든 7일 부여하도록 작성 (수정 가능)
        cursor.execute(
            "UPDATE users SET is_pro = 1, pro_expires_at = datetime('now', '+7 days') WHERE id = ?", 
            (user_id,)
        )
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Start Trial Error: {e}")
        return False
    finally:
        conn.close()

def save_analysis_result(data):
    """
    AI 분석 결과를 DB에 저장합니다.
    data format matches the return of analyze_stock
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        symbol = data['symbol']
        price = data.get('price', 0)
        # Handle '75,000' string format if necessary, assuming float/int here or cleaning needed
        if isinstance(price, str):
            price = float(price.replace(',', '').replace('$', ''))
            
        score = data.get('score', 0)
        metrics = data.get('metrics', {})
        
        cursor.execute('''
            INSERT INTO score_history (symbol, price, score, supply_score, financial_score, news_score, summary)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            symbol, 
            price, 
            score, 
            metrics.get('supplyDemand', 0), 
            metrics.get('financials', 0), 
            metrics.get('news', 0), 
            data.get('analysis_summary', '')
        ))
        
        conn.commit()
    except Exception as e:
        print(f"DB Save Error: {e}")
    finally:
        conn.close()

def get_score_history(symbol):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT created_at, score, price, supply_score, financial_score, news_score
        FROM score_history
        WHERE symbol = ?
        ORDER BY created_at ASC
        LIMIT 50
    ''', (symbol,))
    
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for i, row in enumerate(rows):
        data = {
            "date": row[0],
            "score": row[1],
            "price": row[2],
            "supply": row[3],
            "financial": row[4],
            "news": row[5],
            "reason": ""
        }
        
        # Generate explanation for score change (compared to previous point)
        if i > 0:
            prev = rows[i-1]
            score_diff = row[1] - prev[1]
            supply_diff = (row[3] or 0) - (prev[3] or 0)
            financial_diff = (row[4] or 0) - (prev[4] or 0)
            news_diff = (row[5] or 0) - (prev[5] or 0)
            
            reasons = []
            
            # Identify major factors
            if abs(score_diff) >= 5:  # Significant change
                if abs(supply_diff) >= 10:
                    if supply_diff > 0:
                        reasons.append(f"수급 점수 개선 (+{supply_diff:.0f})")
                    else:
                        reasons.append(f"수급 점수 하락 ({supply_diff:.0f})")
                
                if abs(financial_diff) >= 10:
                    if financial_diff > 0:
                        reasons.append(f"재무 건전성 개선 (+{financial_diff:.0f})")
                    else:
                        reasons.append(f"재무 지표 악화 ({financial_diff:.0f})")
                
                if abs(news_diff) >= 10:
                    if news_diff > 0:
                        reasons.append(f"긍정 뉴스/심리 (+{news_diff:.0f})")
                    else:
                        reasons.append(f"부정 뉴스/심리 ({news_diff:.0f})")
                
                # Generate full reason text
                if reasons:
                    data["reason"] = ", ".join(reasons)
                elif score_diff > 0:
                    data["reason"] = f"종합 점수 상승 (+{score_diff:.1f})"
                else:
                    data["reason"] = f"종합 점수 하락 ({score_diff:.1f})"
            else:
                data["reason"] = "소폭 변동 (전일 대비)"
        else:
            data["reason"] = "최초 분석"
        
        history.append(data)
        
    return history

def get_prediction_report():
    """
    과거 AI 예측(점수)과 현재 가격을 비교하여 적중률 리포트를 생성합니다.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 최근 30개의 예측 기록 가져오기 (최신순)
    cursor.execute('''
        SELECT symbol, price, score, created_at
        FROM score_history
        ORDER BY created_at DESC
        LIMIT 30
    ''')
    rows = cursor.fetchall()
    conn.close()
    
    report = {
        "total_count": 0,
        "success_count": 0,
        "success_rate": 0,
        "details": []
    }
    
    import yfinance as yf
    
    # 중복 심볼 제거하고 최신 것만 남기거나, 개별 건으로 처리? 
    # 여기선 개별 건으로 처리하되, 현재가 조회 비용 고려 필요.
    # 데모용으로 심볼별 그룹화하여 최신 1건씩만 검증하자.
    
    unique_checks = {}
    for row in rows:
        sym = row[0]
        if sym not in unique_checks:
            unique_checks[sym] = row
            
    if not unique_checks:
        return report

    try:
        # 현재가 일괄 조회 (yfinance batch)
        symbols = list(unique_checks.keys())
        # market 등 특수 심볼 제외
        symbols = [s for s in symbols if "MARKET" not in s]
        if not symbols: return report
        
        tickers = yf.Tickers(" ".join(symbols))
        
        for sym, row in unique_checks.items():
            if "MARKET" in sym: continue
            
            past_price = row[1]
            score = row[2]
            created_at = row[3]
            
            # 현재가 가져오기
            try:
                # .fast_info.last_price or history
                current_price = tickers.tickers[sym].fast_info.last_price
            except:
                continue
                
            if not current_price: continue
            
            # 수익률
            change_pct = ((current_price - past_price) / past_price) * 100
            
            # 적중 판단
            # Score >= 60 (Bullish) -> Price Up -> Success
            # Score <= 40 (Bearish) -> Price Down -> Success
            # Else (Neutral 41-59) -> Skip or check stability? Let's skip neutrals.
            
            is_correct = False
            prediction = "Neutral"
            
            if score >= 60:
                prediction = "Bullish"
                if change_pct > 0: is_correct = True
            elif score <= 40:
                prediction = "Bearish"
                if change_pct < 0: is_correct = True
            else:
                # 중립은 적중/실패 계산에서 제외 (또는 변동폭 +-1% 이내면 성공 간주 등)
                continue
                
            report["total_count"] += 1
            if is_correct:
                report["success_count"] += 1
                
            report["details"].append({
                "symbol": sym,
                "date": created_at,
                "prediction": prediction,
                "past_price": past_price,
                "current_price": current_price,
                "change_pct": round(change_pct, 2),
                "is_correct": is_correct
            })
            
    except Exception as e:
        print(f"Prediction Report Error: {e}")
        
    if report["total_count"] > 0:
        report["success_rate"] = int((report["success_count"] / report["total_count"]) * 100)
        
    return report

def add_watchlist(user_id: str, symbol: str, added_price: float = 0):
    conn = get_db_connection()
    try:
        u_id = user_id.strip() if user_id else "guest"
        s_sym = symbol.strip() if symbol else ""
        conn.execute("INSERT OR REPLACE INTO watchlist (user_id, symbol, added_price) VALUES (?, ?, ?)", (u_id, s_sym, added_price))
        conn.commit()
        print(f"[DB] Watchlist added: {u_id} -> {s_sym} (${added_price})")
        return True
    except Exception as e:
        print(f"Error adding to watchlist: {e}")
        return False
    finally:
        conn.close()

def remove_watchlist(user_id, symbol):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    u_id = user_id.strip() if user_id else "guest"
    try:
        cursor.execute("DELETE FROM watchlist WHERE user_id = ? AND symbol = ?", (u_id, symbol))
        conn.commit()
    finally:
        conn.close()

def clear_watchlist(user_id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM watchlist WHERE user_id = ?", (user_id,))
        conn.commit()
    finally:
        conn.close()

def save_user_portfolio(user_id, symbol, price, quantity):
    """사용자 포트폴리오 종목 저장/수정"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO user_portfolio (user_id, symbol, avg_price, quantity)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, symbol) DO UPDATE SET
                avg_price = excluded.avg_price,
                quantity = excluded.quantity
        """, (user_id, symbol, price, quantity))
        conn.commit()
        return True
    except Exception as e:
        print(f"Save Portfolio Error: {e}")
        return False
    finally:
        conn.close()

def delete_user_portfolio(user_id, symbol):
    """사용자 포트폴리오 종목 삭제"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM user_portfolio WHERE user_id = ? AND symbol = ?", (user_id, symbol))
        conn.commit()
        return True
    except Exception as e:
        print(f"Delete Portfolio Error: {e}")
        return False
    finally:
        conn.close()

def get_user_portfolio(user_id):
    """사용자의 전체 포트폴리오 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT symbol, avg_price, quantity FROM user_portfolio WHERE user_id = ?", (user_id,))
        rows = cursor.fetchall()
        
        from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
        data = []
        for row in rows:
            sym = row[0]
            name = get_korean_stock_name(sym) or GLOBAL_KOREAN_NAMES.get(sym, sym)
            data.append({
                "symbol": sym, 
                "name": name,
                "price": str(row[1]), 
                "quantity": str(row[2])
            })
        return data
    except Exception as e:
        print(f"Get Portfolio Error: {e}")
        return []
    finally:
        conn.close()


def update_user_keys(user_id, app_key, secret, account):
    """Update KIS API keys for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE users 
            SET kis_app_key = ?, kis_secret = ?, kis_account = ?
            WHERE id = ?
        ''', (app_key, secret, account, user_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Update Keys Error: {e}")
        return False
    finally:
        conn.close()

def get_watchlist(user_id):
    if not user_id:
        return []
    u_id = user_id.strip() if user_id else "guest"
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT symbol, added_price FROM watchlist WHERE user_id = ?", (u_id,))
    res = cursor.fetchall()
    conn.close()
    print(f"[DB_WATCHLIST] user_id='{u_id}' found {len(res)} items")
    return res

def migrate_watchlist(from_id, to_id):
    """guest 등의 임시 ID에서 실제 로그인 ID로 관심종목 이동"""
    if not from_id or not to_id or from_id == to_id:
        return False
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        # 1. from_id의 종목들을 to_id로 복사 (INSERT OR IGNORE)
        cursor.execute("""
            INSERT OR IGNORE INTO watchlist (user_id, symbol)
            SELECT ?, symbol FROM watchlist WHERE user_id = ?
        """, (to_id, from_id))
        
        # 2. 이동 완료 후 guest(from_id) 데이터 삭제
        cursor.execute("DELETE FROM watchlist WHERE user_id = ?", (from_id,))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"Migration Error: {e}")
        return False
    finally:
        conn.close()

# Initialize on module load (or call explicitly)
# [Optimized] Moved to main.py startup event to prevent block during import
# init_db() 




# ============================================================
# FCM Token Management (Firebase Cloud Messaging)
# ============================================================

def create_fcm_tokens_table():
    """FCM 토큰 테이블 생성"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fcm_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            device_type TEXT,  -- 'web', 'android', 'ios'
            device_name TEXT,
            pref_morning BOOLEAN DEFAULT 1,
            pref_closing BOOLEAN DEFAULT 1,
            pref_price BOOLEAN DEFAULT 1,
            pref_news BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    print("[DB] FCM tokens table created")


def save_fcm_token(user_id: str, token: str, device_type: str = 'web', device_name: str = None):
    """FCM 토큰 저장 또는 업데이트"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO fcm_tokens (user_id, token, device_type, device_name, last_used)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(token) DO UPDATE SET
                user_id = excluded.user_id,
                device_type = excluded.device_type,
                device_name = excluded.device_name,
                last_used = CURRENT_TIMESTAMP
        """, (user_id, token, device_type, device_name))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] Save FCM token error: {e}")
        return False
    finally:
        conn.close()


def get_user_fcm_tokens(user_id: str) -> list:
    """사용자의 모든 FCM 토큰 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT token, device_type, device_name, pref_morning, pref_closing, pref_price, pref_news
        FROM fcm_tokens
        WHERE user_id = ?
        ORDER BY last_used DESC
    """, (user_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "token": row[0],
            "device_type": row[1],
            "device_name": row[2],
            "pref_morning": bool(row[3]),
            "pref_closing": bool(row[4]),
            "pref_price": bool(row[5]),
            "pref_news": bool(row[6]) if len(row) > 6 else True
        }
        for row in rows
    ]

def get_fcm_preferences(token: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT pref_morning, pref_closing, pref_price, pref_news FROM fcm_tokens WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"pref_morning": bool(row[0]), "pref_closing": bool(row[1]), "pref_price": bool(row[2]), "pref_news": bool(row[3]) if len(row) > 3 else True}
    return None

def update_fcm_preferences(token: str, prefs: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE fcm_tokens 
            SET pref_morning = ?, pref_closing = ?, pref_price = ?, pref_news = ?
            WHERE token = ?
        """, (
            1 if prefs.get('pref_morning', True) else 0,
            1 if prefs.get('pref_closing', True) else 0,
            1 if prefs.get('pref_price', True) else 0,
            1 if prefs.get('pref_news', True) else 0,
            token
        ))
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] Update FCM prefs error: {e}")
        return False
    finally:
        conn.close()


def delete_fcm_token(token: str):
    """FCM 토큰 삭제"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM fcm_tokens WHERE token = ?", (token,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"[DB] Delete FCM token error: {e}")
        return False
    finally:
        conn.close()

def get_all_fcm_tokens() -> list:
    """모든 사용자의 유효한 FCM 토큰 조회 (브로드캐스트용)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 중복 제거 (혹시 몰라서 DISTINCT)
        cursor.execute("SELECT DISTINCT token FROM fcm_tokens")
        rows = cursor.fetchall()
        return [row[0] for row in rows]
    except Exception as e:
        print(f"[DB] Get all FCM tokens error: {e}")
        return []
    finally:
        conn.close()


# ============================================================
# Smart Signals (스마트 시그널)
# ============================================================

def create_signals_table():
    """시그널 테이블 생성"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            signal_type TEXT NOT NULL,
            title TEXT,
            summary TEXT,
            data_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print("[DB] Signals table created")


def save_signal(symbol: str, signal_type: str, title: str, summary: str, data: dict = None):
    """시그널 저장"""
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO signals (symbol, signal_type, title, summary, data_json)
            VALUES (?, ?, ?, ?, ?)
        """, (symbol, signal_type, title, summary, json.dumps(data or {}, ensure_ascii=False)))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"[DB] Save signal error: {e}")
        return None
    finally:
        conn.close()


def get_recent_signals(limit: int = 50) -> list:
    """최근 시그널 조회"""
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 그룹바이를 통해 동일 종목/동일 유형 최신 시그널만 가져오기 (중복 방지)
        cursor.execute("""
            SELECT id, symbol, signal_type, title, summary, data_json, created_at
            FROM signals 
            WHERE id IN (
                SELECT MAX(id) 
                FROM signals 
                GROUP BY symbol, signal_type
            )
            ORDER BY created_at DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        return [{
            "id": r[0], "symbol": r[1], "signal_type": r[2],
            "title": r[3], "summary": r[4],
            "data": json.loads(r[5]) if r[5] else {},
            "created_at": r[6]
        } for r in rows]
    except Exception as e:
        print(f"[DB] Get signals error: {e}")
        return []
    finally:
        conn.close()


def get_signals_by_symbol(symbol: str, limit: int = 20) -> list:
    """종목별 시그널 조회"""
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, symbol, signal_type, title, summary, data_json, created_at
            FROM signals WHERE symbol = ? ORDER BY created_at DESC LIMIT ?
        """, (symbol, limit))
        rows = cursor.fetchall()
        return [{
            "id": r[0], "symbol": r[1], "signal_type": r[2],
            "title": r[3], "summary": r[4],
            "data": json.loads(r[5]) if r[5] else {},
            "created_at": r[6]
        } for r in rows]
    except Exception as e:
        print(f"[DB] Get signals by symbol error: {e}")
        return []
    finally:
        conn.close()




def get_user_tokens_by_watchlist_symbol(symbol: str) -> list:
    """특정 종목을 관심종목으로 등록한 모든 사용자의 FCM 토큰 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # watchlist와 fcm_tokens 테이블 조인
        # symbol은 '005930' 또는 '005930.KS' 등 다양할 수 있으므로 LIKE 검색 고려 (여기선 정확히 일치 우선)
        # 팁: .KS가 붙어있는 경우를 대비해 처리
        base_symbol = symbol.split('.')[0] if '.' in symbol else symbol
        
        cursor.execute("""
            SELECT DISTINCT ft.token
            FROM fcm_tokens ft
            JOIN watchlist w ON ft.user_id = w.user_id
            WHERE w.symbol = ? OR w.symbol LIKE ?
        """, (symbol, f"{base_symbol}%"))
        
        rows = cursor.fetchall()
        return [row[0] for row in rows]
    except Exception as e:
        print(f"[DB] Get tokens by symbol error: {e}")
        return []
    finally:
        conn.close()

# ============================================================
# [Analytics] Site Visitor & Pageview Tracking Methods
# ============================================================

def record_pageview(visitor_id: str):
    """
    KST 기준으로 일일 페이지뷰(PV) 및 순방문자수(UV)를 기록합니다.
    """
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime("%Y-%m-%d")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. 일일 순방문자 여부 검증 (동일 날짜에 동일 visitor_id가 없었으면 신규 순방문자)
        cursor.execute(
            "INSERT OR IGNORE INTO visitor_sessions (date, visitor_id) VALUES (?, ?)",
            (today_str, visitor_id)
        )
        is_unique = cursor.rowcount > 0

        # 2. 오늘 날짜 데이터 Row 생성 (없을 때만)
        cursor.execute(
            "INSERT OR IGNORE INTO site_analytics (date, pageviews, unique_visitors) VALUES (?, 0, 0)",
            (today_str,)
        )

        # 3. 누적치 카운트 업
        if is_unique:
            cursor.execute(
                "UPDATE site_analytics SET pageviews = pageviews + 1, unique_visitors = unique_visitors + 1 WHERE date = ?",
                (today_str,)
            )
        else:
            cursor.execute(
                "UPDATE site_analytics SET pageviews = pageviews + 1 WHERE date = ?",
                (today_str,)
            )
        conn.commit()
        return True
    except Exception as e:
        print(f"[Analytics-Error] Failed to record pageview: {e}")
        return False
    finally:
        conn.close()

def get_site_analytics(limit: int = 30):
    """
    최근 N일 동안의 일일 조회수 및 순방문자수 통계를 반환합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT date, pageviews, unique_visitors FROM site_analytics ORDER BY date DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        return [
            {"date": r[0], "pageviews": r[1], "unique_visitors": r[2]}
            for r in rows
        ]
    except Exception as e:
        print(f"[Analytics-Error] Failed to fetch stats: {e}")
        return []
    finally:
        conn.close()

def ping_active_user(visitor_id: str):
    """
    실시간 접속 중인 유저의 마지막 활동 시각을 갱신합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR REPLACE INTO active_users (visitor_id, last_activity) VALUES (?, datetime('now'))",
            (visitor_id,)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"[Analytics-Error] Failed to ping active user: {e}")
        return False
    finally:
        conn.close()

def get_realtime_active_count(minutes: int = 5):
    """
    최근 N분 내에 활동 기록이 있는 실시간 동시 접속자 수를 반환합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 오래된 세션 자동 정리
        cursor.execute(
            "DELETE FROM active_users WHERE last_activity < datetime('now', ?)",
            (f"-{minutes} minutes",)
        )
        conn.commit()

        cursor.execute("SELECT COUNT(*) FROM active_users")
        count = cursor.fetchone()[0]
        return count
    except Exception as e:
        print(f"[Analytics-Error] Failed to get active count: {e}")
        return 0
    finally:
        conn.close()
