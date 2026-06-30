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

    # 시스템 에러 및 알림 발송 로그 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            component TEXT NOT NULL,
            message TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # [AI Cache] AI 분석 결과 영구 캐싱 테이블 (6시간 TTL)
    # 동일 종목 재검색 시 Gemini API 재호출 없이 즉시 반환
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_analysis_cache (
            symbol TEXT PRIMARY KEY,
            score INTEGER,
            supply_score INTEGER,
            financial_score INTEGER,
            news_score INTEGER,
            summary TEXT,
            rationale_json TEXT,
            related_stocks_json TEXT,
            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    # [Migration] Add points if not exists
    try:
        cursor.execute("SELECT points FROM users LIMIT 1")
    except sqlite3.OperationalError:
        print("Migrating users table (adding points)...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0")
        except Exception as e:
            print(f"Migration Warning: {e}")


    # [Migration] Add Referral System Columns
    try:
        cursor.execute("SELECT referral_code FROM users LIMIT 1")
    except sqlite3.OperationalError:
        print("Migrating users table (adding referral columns)...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE")
            cursor.execute("ALTER TABLE users ADD COLUMN referred_by TEXT")
            cursor.execute("ALTER TABLE users ADD COLUMN is_unlimited_alerts BOOLEAN DEFAULT 0")
            cursor.execute("ALTER TABLE users ADD COLUMN daily_alert_count INTEGER DEFAULT 0")
            cursor.execute("ALTER TABLE users ADD COLUMN last_alert_date TEXT")
        except Exception as e:
            print(f"Migration Warning (Referral): {e}")

    # [Migration] Add User Rankings Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_rankings (
            user_id TEXT PRIMARY KEY,
            nickname TEXT,
            score REAL DEFAULT 0,
            rank INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

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
            quantity REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, symbol)
        )
    ''')
    
    # [Migration] Add added_price and quantity to watchlist if not exists
    try:
        cursor.execute("SELECT added_price FROM watchlist LIMIT 1")
    except sqlite3.OperationalError:
        try:
            cursor.execute("ALTER TABLE watchlist ADD COLUMN added_price REAL DEFAULT 0")
        except: pass

    try:
        cursor.execute("SELECT quantity FROM watchlist LIMIT 1")
    except sqlite3.OperationalError:
        try:
            cursor.execute("ALTER TABLE watchlist ADD COLUMN quantity REAL DEFAULT 0")
        except: pass

    # Watchlist Backup Table (For self-healing and data protection)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watchlist_backup (
            user_id TEXT,
            symbol TEXT,
            added_price REAL DEFAULT 0,
            quantity REAL DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, symbol)
        )
    ''')
    
    # [Migration] Copy existing items in watchlist to watchlist_backup if not exists
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO watchlist_backup (user_id, symbol, added_price, quantity, is_deleted)
            SELECT user_id, symbol, added_price, quantity, 0 FROM watchlist
        """)
    except Exception as e:
        print(f"Error copying existing watchlist to backup: {e}")
    

    
    
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
            pref_watch_compact BOOLEAN DEFAULT 0,
            pref_ipo BOOLEAN DEFAULT 1,
            pref_whale_alert BOOLEAN DEFAULT 1,
            pref_insider_alert BOOLEAN DEFAULT 1,
            pref_watchlist_live BOOLEAN DEFAULT 1,
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
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_watch_compact BOOLEAN DEFAULT 0")
    except: pass
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_ipo BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_whale_alert BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_watchlist_live BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_dividend BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE fcm_tokens ADD COLUMN pref_insider_alert BOOLEAN DEFAULT 1")
    except: pass
    
    print("[DB] FCM tokens table created")

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

    # [NEW] Alert History Table (Prevent Duplicate Real-time Alerts)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alert_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            alert_type TEXT NOT NULL, -- PRICE_SPIKE, BREAKING_NEWS
            content_hash TEXT NOT NULL, -- Unique identifier for the news/event
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("[DB] Alert history table created")

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

    # [NEW] IPO Watchlist Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ipo_watchlist (
            user_id TEXT,
            ipo_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, ipo_name)
        )
    ''')

    # [NEW] Community Chats
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS community_chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            text TEXT NOT NULL,
            image_url TEXT,
            profit_verified REAL,
            parent_id INTEGER,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(parent_id) REFERENCES community_chats(id)
        )
    ''')

    # [NEW] Community Likes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS community_likes (
            chat_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(chat_id, user_id),
            FOREIGN KEY(chat_id) REFERENCES community_chats(id)
        )
    ''')

    # [NEW] Community Posts (Blog)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS community_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # [NEW] Community Post Comments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS community_post_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(post_id) REFERENCES community_posts(id)
        )
    ''')
    
    # [NEW] Community Post Likes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS community_post_likes (
            post_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(post_id, user_id),
            FOREIGN KEY(post_id) REFERENCES community_posts(id)
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
        
        admin_emails = {'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}
        is_admin = user_data.get('email', '').lower() in admin_emails
        is_pro_val = 1 if is_admin else 0
        
        if not row:
            cursor.execute('''
                INSERT INTO users (id, email, name, picture, is_pro, free_trial_count)
                VALUES (?, ?, ?, ?, ?, 2)
            ''', (user_data['id'], user_data['email'], user_data['name'], user_data['picture'], is_pro_val))
        else:
            # Update info
            if is_admin:
                cursor.execute('''
                    UPDATE users SET name = ?, picture = ?, is_pro = 1, pro_expires_at = NULL WHERE id = ?
                ''', (user_data['name'], user_data['picture'], user_data['id']))
            else:
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

def get_user_info(user_id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, name, picture, is_pro, free_trial_count, pro_expires_at, points FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            is_pro = bool(row[4])
            pro_expires_at = row[6]
            points = row[7] if row[7] is not None else 0
            
            # 1. 관리자 강제 Pro 부여 (이메일 기반 2차 안전장치)
            admin_emails = {'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}
            if row[1] and str(row[1]).lower() in admin_emails:
                is_pro = True
                
            elif is_pro and pro_expires_at:
                expires = datetime.fromisoformat(pro_expires_at)
                if datetime.now() > expires:
                    print(f"[Pro Expired] User {user_id} trial ended.")
                    is_pro = False
                    cursor.execute("UPDATE users SET is_pro = 0 WHERE id = ?", (user_id,))
                    conn.commit()

            return {
                "id": row[0],
                "email": row[1],
                "name": row[2],
                "picture": row[3],
                "is_pro": is_pro,
                "free_trial_count": row[5],
                "pro_expires_at": pro_expires_at,
                "points": points
            }
        return None
    except Exception as e:
        print(f"Error fetching user info: {e}")
        return None
    finally:
        conn.close()

def get_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, name, picture, is_pro, free_trial_count, pro_expires_at, points FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            is_pro = bool(row[4])
            pro_expires_at = row[6]
            email = row[1]
            points = row[7] if row[7] is not None else 0
            
            # 관리자 계정은 항상 PRO 상태 유지
            admin_emails = {'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}
            if email and email.lower() in admin_emails:
                is_pro = True
            # 만료 기간이 지났으면 Pro 권한 회수 (관리자 제외)
            elif is_pro and pro_expires_at:
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
                "pro_expires_at": pro_expires_at,
                "points": points
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

# ─────────────────────────────────────────────
# [AI Cache] 종목별 AI 분석 결과 DB 캐싱 (6시간)
# ─────────────────────────────────────────────
AI_CACHE_TTL_HOURS = 24  # [Optimized] 6시간 → 24시간. AI 분석은 뉴스/가격보다 느리게 변하므로 재호출 비용 절감

def get_cached_ai_analysis(symbol: str):
    """
    DB에서 AI 분석 캐시를 조회합니다.
    6시간 이내 분석 결과가 있으면 반환, 없으면 None 반환.
    """
    import json
    conn = sqlite3.connect(DB_FILE, timeout=10)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT score, supply_score, financial_score, news_score,
                   summary, rationale_json, related_stocks_json, cached_at
            FROM ai_analysis_cache
            WHERE symbol = ?
              AND cached_at >= datetime('now', ?, 'utc')
        """, (symbol.upper(), f'-{AI_CACHE_TTL_HOURS} hours'))
        row = cursor.fetchone()
        if row:
            print(f"[AI-Cache] DB Cache HIT for {symbol} (cached at {row[7]})")
            return {
                "score": row[0],
                "metrics": {
                    "supplyDemand": row[1],
                    "financials": row[2],
                    "news": row[3]
                },
                "summary": row[4],
                "rationale": json.loads(row[5]) if row[5] else {},
                "related_stocks": json.loads(row[6]) if row[6] else []
            }
        return None
    except Exception as e:
        print(f"[AI-Cache] DB Read Error: {e}")
        return None
    finally:
        conn.close()

def save_ai_analysis_cache(symbol: str, ai_result: dict):
    """
    AI 분석 결과를 DB에 저장합니다. (UPSERT)
    다음 조회 시 Gemini API 없이 즉시 반환합니다.
    """
    import json
    conn = sqlite3.connect(DB_FILE, timeout=10)
    cursor = conn.cursor()
    try:
        metrics = ai_result.get('metrics', {})
        rationale = ai_result.get('rationale', {})
        related = ai_result.get('related_stocks', [])
        summary = ai_result.get('summary', ai_result.get('analysis_summary', ''))

        cursor.execute("""
            INSERT INTO ai_analysis_cache
                (symbol, score, supply_score, financial_score, news_score,
                 summary, rationale_json, related_stocks_json, cached_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'utc'))
            ON CONFLICT(symbol) DO UPDATE SET
                score              = excluded.score,
                supply_score       = excluded.supply_score,
                financial_score    = excluded.financial_score,
                news_score         = excluded.news_score,
                summary            = excluded.summary,
                rationale_json     = excluded.rationale_json,
                related_stocks_json= excluded.related_stocks_json,
                cached_at          = excluded.cached_at
        """, (
            symbol.upper(),
            ai_result.get('score', 50),
            metrics.get('supplyDemand', 50),
            metrics.get('financials', 50),
            metrics.get('news', 50),
            summary,
            json.dumps(rationale, ensure_ascii=False),
            json.dumps(related, ensure_ascii=False)
        ))
        conn.commit()
        print(f"[AI-Cache] Saved to DB: {symbol} (expires in {AI_CACHE_TTL_HOURS}h)")
    except Exception as e:
        print(f"[AI-Cache] DB Write Error: {e}")
    finally:
        conn.close()

# ─────────────────────────────────────────────
# [Cost-Save Cache] 공급망/테마/나비효과 분석 캐시 (3시간)
# - 유저 100명이 같은 종목/테마를 봐도 AI 호출은 1번만 하고 나머지는 캐시 사용
# ─────────────────────────────────────────────
GENERAL_AI_CACHE_TTL_HOURS = 3

def _get_general_cache(cache_type: str, key: str):
    """공통 AI 캐시 조회 (supply_chain / theme / scenario)"""
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 테이블 없으면 자동 생성
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_general_cache (
                cache_type TEXT NOT NULL,
                cache_key  TEXT NOT NULL,
                result_json TEXT NOT NULL,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (cache_type, cache_key)
            )
        ''')
        conn.commit()
        cursor.execute("""
            SELECT result_json FROM ai_general_cache
            WHERE cache_type = ? AND cache_key = ?
              AND cached_at >= datetime('now', ?, 'utc')
        """, (cache_type, key.upper(), f'-{GENERAL_AI_CACHE_TTL_HOURS} hours'))
        row = cursor.fetchone()
        if row:
            print(f"[Cost-Save] Cache HIT: {cache_type}/{key}")
            return json.loads(row[0])
        return None
    except Exception as e:
        print(f"[Cost-Save] Cache Read Error: {e}")
        return None
    finally:
        conn.close()

def _save_general_cache(cache_type: str, key: str, data: dict):
    """공통 AI 캐시 저장 (supply_chain / theme / scenario)"""
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_general_cache (
                cache_type TEXT NOT NULL,
                cache_key  TEXT NOT NULL,
                result_json TEXT NOT NULL,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (cache_type, cache_key)
            )
        ''')
        cursor.execute("""
            INSERT INTO ai_general_cache (cache_type, cache_key, result_json, cached_at)
            VALUES (?, ?, ?, datetime('now', 'utc'))
            ON CONFLICT(cache_type, cache_key) DO UPDATE SET
                result_json = excluded.result_json,
                cached_at   = excluded.cached_at
        """, (cache_type, key.upper(), json.dumps(data, ensure_ascii=False)))
        conn.commit()
        print(f"[Cost-Save] Cache SAVED: {cache_type}/{key} (TTL={GENERAL_AI_CACHE_TTL_HOURS}h)")
    except Exception as e:
        print(f"[Cost-Save] Cache Write Error: {e}")
    finally:
        conn.close()

# 공급망 분석 캐시
def get_cached_supply_chain(symbol: str): return _get_general_cache("supply_chain", symbol)
def save_supply_chain_cache(symbol: str, data: dict): _save_general_cache("supply_chain", symbol, data)

# 테마 분석 캐시
def get_cached_theme(keyword: str): return _get_general_cache("theme", keyword)
def save_theme_cache(keyword: str, data: dict): _save_general_cache("theme", keyword, data)

# 나비효과 시나리오 캐시
def get_cached_scenario(keyword: str, target: str = ""): return _get_general_cache("scenario", f"{keyword}__{target}")
def save_scenario_cache(keyword: str, target: str, data: dict): _save_general_cache("scenario", f"{keyword}__{target}", data)

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

def add_watchlist(user_id: str, symbol: str, added_price: float = 0, quantity: float = 0):
    conn = get_db_connection()
    try:
        u_id = user_id.strip() if user_id else "guest"
        s_sym = symbol.strip() if symbol else ""
        
        # 1. 실제 테이블에 저장
        conn.execute("INSERT OR REPLACE INTO watchlist (user_id, symbol, added_price, quantity) VALUES (?, ?, ?, ?)", (u_id, s_sym, added_price, quantity))
        
        # 2. 백업 테이블에 저장 (is_deleted = 0)
        conn.execute("""
            INSERT OR REPLACE INTO watchlist_backup (user_id, symbol, added_price, quantity, is_deleted, updated_at)
            VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        """, (u_id, s_sym, added_price, quantity))
        
        conn.commit()
        print(f"[DB] Watchlist added & backed up: {u_id} -> {s_sym} (${added_price}, qty: {quantity})")
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
        # 1. 실제 테이블에서 제거
        cursor.execute("DELETE FROM watchlist WHERE user_id = ? AND symbol = ?", (u_id, symbol))
        
        # 2. 백업 테이블에 삭제 마크 (is_deleted = 1)
        cursor.execute("""
            INSERT INTO watchlist_backup (user_id, symbol, is_deleted, updated_at)
            VALUES (?, ?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, symbol) DO UPDATE SET
                is_deleted = 1,
                updated_at = CURRENT_TIMESTAMP
        """, (u_id, symbol))
        
        conn.commit()
        print(f"[DB] Watchlist removed & backup updated: {u_id} -> {symbol}")
    except Exception as e:
        print(f"Error removing from watchlist: {e}")
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

def heal_watchlist(user_id: str):
    """
    관심종목 백업 테이블(watchlist_backup)에서 삭제되지 않은(is_deleted = 0) 종목이
    실제 관심종목 테이블(watchlist)에 누락되어 있다면 자동으로 복구합니다.
    """
    if not user_id:
        return
    u_id = user_id.strip()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        # 백업 테이블에는 존재(is_deleted = 0)하지만 실제 테이블에는 없는 종목을 찾아서 복구
        cursor.execute("""
            INSERT OR IGNORE INTO watchlist (user_id, symbol, added_price, quantity)
            SELECT user_id, symbol, added_price, quantity
            FROM watchlist_backup
            WHERE user_id = ? AND is_deleted = 0
        """, (u_id,))
        if cursor.rowcount > 0:
            print(f"[Watchlist-Healing] Restored {cursor.rowcount} missing symbols for user: {u_id}")
            conn.commit()
    except Exception as e:
        print(f"[Watchlist-Healing] Error during healing: {e}")
    finally:
        conn.close()

def get_watchlist(user_id):
    if not user_id:
        return []
    u_id = user_id.strip() if user_id else "guest"
    
    # 힐링 메커니즘 가동 (백업에서 복구)
    heal_watchlist(u_id)
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT symbol, added_price, quantity FROM watchlist WHERE user_id = ?", (u_id,))
    res = cursor.fetchall()
    conn.close()
    print(f"[DB_WATCHLIST] user_id='{u_id}' found {len(res)} items")
    return res

def migrate_watchlist(from_id, to_id):
    """guest 등의 임시 ID에서 실제 로그인 ID로 관심종목 이동 및 백업"""
    if not from_id or not to_id or from_id == to_id:
        return False
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        # 1. watchlist 테이블 마이그레이션 (added_price, quantity 포함 복사)
        cursor.execute("""
            INSERT OR REPLACE INTO watchlist (user_id, symbol, added_price, quantity)
            SELECT ?, symbol, added_price, quantity FROM watchlist WHERE user_id = ?
        """, (to_id, from_id))
        
        # 2. watchlist_backup 테이블 마이그레이션 (added_price, quantity, is_deleted 포함 복사)
        cursor.execute("""
            INSERT OR REPLACE INTO watchlist_backup (user_id, symbol, added_price, quantity, is_deleted)
            SELECT ?, symbol, added_price, quantity, is_deleted FROM watchlist_backup WHERE user_id = ?
        """, (to_id, from_id))
        
        # 3. 이동 완료 후 guest(from_id) 데이터 삭제
        cursor.execute("DELETE FROM watchlist WHERE user_id = ?", (from_id,))
        cursor.execute("DELETE FROM watchlist_backup WHERE user_id = ?", (from_id,))
        
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
            pref_watch_compact BOOLEAN DEFAULT 0,
            pref_ipo BOOLEAN DEFAULT 1,
            pref_whale_alert BOOLEAN DEFAULT 1,
            pref_insider_alert BOOLEAN DEFAULT 1,
            pref_watchlist_live BOOLEAN DEFAULT 1,
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
    
    # [Fix-3] user_id 정규화: 앞뒤 공백 및 null 처리
    clean_user_id = (user_id or '').strip()
    if not clean_user_id or clean_user_id == 'guest':
        print(f"[FCM-Save] Blocked: guest or empty user_id='{user_id}'")
        conn.close()
        return False
    
    try:
        # [강력 조치 해제] 다중 기기 허용을 위해 기존 토큰 전체 삭제 로직 제거
        # cursor.execute("DELETE FROM fcm_tokens WHERE user_id = ?", (clean_user_id,))
        
        cursor.execute("""
            INSERT INTO fcm_tokens (user_id, token, device_type, device_name, last_used)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(token) DO UPDATE SET
                user_id = excluded.user_id,
                device_type = excluded.device_type,
                device_name = excluded.device_name,
                last_used = CURRENT_TIMESTAMP
        """, (clean_user_id, token, device_type, device_name))
        
        conn.commit()
        print(f"[FCM-Save] Token saved (Multiple devices allowed): user_id='{clean_user_id}', token={token[:20]}...")
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
        SELECT token, device_type, device_name, pref_morning, pref_closing, pref_price, pref_news, pref_watch_compact, pref_ipo
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
            "pref_news": bool(row[6]) if len(row) > 6 else True,
            "pref_watch_compact": bool(row[7]) if len(row) > 7 else False
        }
        for row in rows
    ]

def get_fcm_preferences(token: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fcm_tokens WHERE token = ?", (token,))
    row = cursor.fetchone()
    if row:
        col_names = [desc[0] for desc in cursor.description]
        row_dict = dict(zip(col_names, row))
        conn.close()
        return {
            "pref_morning": bool(row_dict.get("pref_morning", True)), 
            "pref_closing": bool(row_dict.get("pref_closing", True)), 
            "pref_price": bool(row_dict.get("pref_price", True)), 
            "pref_news": bool(row_dict.get("pref_news", True)), 
            "pref_watch_compact": bool(row_dict.get("pref_watch_compact", False)),
            "pref_dividend": bool(row_dict.get("pref_dividend", True)),
            "pref_whale_alert": bool(row_dict.get("pref_whale_alert", True)),
            "pref_insider_alert": bool(row_dict.get("pref_insider_alert", True)),
            "pref_watchlist_live": bool(row_dict.get("pref_watchlist_live", True)),
            "user_id": row_dict.get("user_id", "guest")
        }
    conn.close()
    return None

def update_fcm_preferences(token: str, prefs: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE fcm_tokens 
            SET pref_morning = ?, pref_closing = ?, pref_price = ?, pref_news = ?, pref_watch_compact = ?, pref_ipo = ?, pref_dividend = ?, pref_whale_alert = ?, pref_insider_alert = ?, pref_watchlist_live = ?
            WHERE token = ?
        """, (
            1 if prefs.get('pref_morning', True) else 0,
            1 if prefs.get('pref_closing', True) else 0,
            1 if prefs.get('pref_price', True) else 0,
            1 if prefs.get('pref_news', True) else 0,
            1 if prefs.get('pref_watch_compact', False) else 0,
            1 if prefs.get('pref_ipo', True) else 0,
            1 if prefs.get('pref_dividend', True) else 0,
            1 if prefs.get('pref_whale_alert', True) else 0,
            1 if prefs.get('pref_insider_alert', True) else 0,
            1 if prefs.get('pref_watchlist_live', True) else 0,
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


def delete_user_data(user_id: str) -> bool:
    """
    개인정보 보호법에 의거, 회원 탈퇴 시 해당 유저의 모든 개인정보 및 관련 레코드를
    DB에서 즉시 영구 삭제(DELETE)합니다.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. users 테이블 삭제
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        # 2. watchlist 테이블 삭제
        cursor.execute("DELETE FROM watchlist WHERE user_id = ?", (user_id,))
        # 3. watchlist_backup 테이블 삭제
        cursor.execute("DELETE FROM watchlist_backup WHERE user_id = ?", (user_id,))
        # 4. user_portfolio 테이블 삭제
        cursor.execute("DELETE FROM user_portfolio WHERE user_id = ?", (user_id,))
        # 5. fcm_tokens 테이블 삭제
        cursor.execute("DELETE FROM fcm_tokens WHERE user_id = ?", (user_id,))
        
        conn.commit()
        print(f"[DB] User data permanently deleted for user_id: {user_id}")
        return True
    except Exception as e:
        print(f"[DB] Delete user data error: {e}")
        return False
    finally:
        conn.close()

def get_all_fcm_tokens(require_whale_alert=False) -> list:
    """모든 사용자의 유효한 FCM 토큰 조회 (브로드캐스트용)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 중복 제거 (혹시 몰라서 DISTINCT)
        if require_whale_alert:
            cursor.execute("SELECT DISTINCT token FROM fcm_tokens WHERE pref_whale_alert = 1")
        else:
            cursor.execute("SELECT DISTINCT token FROM fcm_tokens")
        rows = cursor.fetchall()
        return [row[0] for row in rows]
    except Exception as e:
        print(f"[DB] Get all FCM tokens error: {e}")
        return []
    finally:
        conn.close()


def get_all_fcm_tokens_with_user(require_whale_alert=False) -> list:
    """모든 사용자의 유효한 FCM 토큰을 user_id와 함께 반환 (limit check용)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if require_whale_alert:
            cursor.execute("SELECT DISTINCT user_id, token FROM fcm_tokens WHERE pref_whale_alert = 1")
        else:
            cursor.execute("SELECT DISTINCT user_id, token FROM fcm_tokens")
        return cursor.fetchall()
    except Exception as e:
        print(f"[DB] Get all FCM tokens with user error: {e}")
        return []
    finally:
        conn.close()

def get_dormant_fcm_tokens_with_user(days: int = 3) -> list:
    """3일 이상 접속하지 않은 휴면 유저의 FCM 토큰과 user_id 반환"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT DISTINCT user_id, token FROM fcm_tokens WHERE last_used < datetime('now', ?)", (f"-{days} days",))
        return cursor.fetchall()
    except Exception as e:
        print(f"[DB] Get dormant FCM tokens error: {e}")
        return []
    finally:
        conn.close()


def get_fcm_tokens_for_ipo() -> list:
    """공모주 알림 수신에 동의한(혹은 기본값 1인) 모든 토큰 반환"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT DISTINCT token FROM fcm_tokens WHERE pref_ipo = 1")
        rows = cursor.fetchall()
        return [row[0] for row in rows]
    except Exception as e:
        print(f"[DB] Get IPO FCM tokens error: {e}")
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


# --- Real-time Watchlist Alerts Functions ---

def get_unique_watched_symbols() -> list:
    """Returns a list of all unique symbols that users are watching and have pref_watchlist_live = 1"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT w.symbol 
        FROM watchlist w
        JOIN fcm_tokens f ON w.user_id = f.user_id
        WHERE f.pref_watchlist_live = 1
    """)
    res = [row[0] for row in cursor.fetchall()]
    conn.close()
    return res

def get_watchers_by_symbol(symbol: str) -> list:
    """Returns a list of FCM tokens for users who are watching a specific symbol and have pref_watchlist_live = 1"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT f.token 
        FROM watchlist w
        JOIN fcm_tokens f ON w.user_id = f.user_id
        WHERE w.symbol = ? AND f.pref_watchlist_live = 1
    """, (symbol,))
    res = [row[0] for row in cursor.fetchall()]
    conn.close()
    return res

def check_and_record_alert(symbol: str, alert_type: str, content_hash: str) -> bool:
    """
    Checks if an alert for this symbol and content_hash was already sent today.
    If not, records it and returns True (meaning 'send alert').
    If yes, returns False (meaning 'skip alert').
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if already exists for today
    cursor.execute("""
        SELECT id FROM alert_history 
        WHERE symbol = ? AND alert_type = ? AND content_hash = ? 
        AND date(created_at, 'localtime') = date('now', 'localtime')
    """, (symbol, alert_type, content_hash))
    
    exists = cursor.fetchone()
    if exists:
        conn.close()
        return False
        
    # Record it
    cursor.execute("""
        INSERT INTO alert_history (symbol, alert_type, content_hash)
        VALUES (?, ?, ?)
    """, (symbol, alert_type, content_hash))
    conn.commit()
    conn.close()
    return True


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

def get_user_ids_and_tokens_by_watchlist_symbol(symbol: str) -> list:
    """특정 종목을 관심종목으로 등록한 모든 사용자의 (user_id, FCM token) 조회"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        base_symbol = symbol.split('.')[0] if '.' in symbol else symbol
        
        cursor.execute("""
            SELECT DISTINCT ft.user_id, ft.token
            FROM fcm_tokens ft
            JOIN watchlist w ON ft.user_id = w.user_id
            WHERE w.symbol = ? OR w.symbol LIKE ?
        """, (symbol, f"{base_symbol}%"))
        
        rows = cursor.fetchall()
        return [{"user_id": row[0], "token": row[1]} for row in rows if row[1]]
    except Exception as e:
        print(f"[DB] Get user ids and tokens by symbol error: {e}")
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

    # 관리자 조회수 집계 방지 (이메일 및 고유 Google ID 식별자)
    admin_emails = {'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}
    admin_user_ids = {'110418985320259217419', 'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}
    
    visitor_clean = visitor_id.lower()
    is_admin = False
    
    if any(email in visitor_clean for email in admin_emails) or \
       any(uid in visitor_clean for uid in admin_user_ids):
        is_admin = True
        
    if not is_admin and visitor_id.startswith("user_"):
        extracted_user_id = visitor_id[5:]
        user_info = get_user(extracted_user_id)
        if user_info and user_info.get('email', '').lower() in admin_emails:
            is_admin = True
            
    if is_admin:
        print(f"[Analytics-Skip] Skipped recording pageview for admin visitor: {visitor_id}")
        return True

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

# ─────────────────────────────────────────────
# IPO Watchlist Management
# ─────────────────────────────────────────────
def add_ipo_watchlist(user_id: str, ipo_name: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR REPLACE INTO ipo_watchlist (user_id, ipo_name) VALUES (?, ?)",
            (user_id, ipo_name)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] Error adding IPO watchlist: {e}")
        return False
    finally:
        conn.close()

def remove_ipo_watchlist(user_id: str, ipo_name: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM ipo_watchlist WHERE user_id = ? AND ipo_name = ?",
            (user_id, ipo_name)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] Error removing IPO watchlist: {e}")
        return False
    finally:
        conn.close()

def get_user_ipo_watchlist(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT ipo_name FROM ipo_watchlist WHERE user_id = ?", (user_id,))
        return [row[0] for row in cursor.fetchall()]
    except Exception as e:
        print(f"[DB] Error fetching IPO watchlist: {e}")
        return []
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")


def check_and_consume_alert_quota(user_id: str) -> str:
    """
    프리미엄 알림 발송 전 한도를 체크하고 차감합니다.
    Returns:
        'OK': 발송 가능
        'LIMIT_REACHED': 방금 한도 도달함 (초대 유도 알림 발송 필요)
        'EXHAUSTED': 이미 한도 초과됨 (알림 발송 안 함)
    """
    if user_id == "guest":
        return "OK"  # 게스트는 일단 패스 (또는 제한 가능)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    from datetime import datetime
    today = datetime.now().strftime('%Y-%m-%d')
    
    cursor.execute("SELECT is_unlimited_alerts, daily_alert_count, last_alert_date FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return "OK"
        
    is_unlimited, count, last_date = row
    if is_unlimited:
        conn.close()
        return "OK"
        
    if last_date != today:
        count = 0
        
    MAX_ALERTS = 3
    
    if count >= MAX_ALERTS:
        # If it was exactly MAX_ALERTS yesterday, it would be reset. So this means they hit it today.
        # Wait, if they already hit it, we just return EXHAUSTED so we don't spam them with 'limit reached' every time.
        # But how do we know if we already sent the 'limit reached' message?
        # Let's say count == MAX_ALERTS means we send the "LIMIT_REACHED" message, then increment to MAX_ALERTS + 1
        if count == MAX_ALERTS:
            cursor.execute("UPDATE users SET daily_alert_count = ?, last_alert_date = ? WHERE id = ?", (count + 1, today, user_id))
            conn.commit()
            conn.close()
            return "LIMIT_REACHED"
        else:
            conn.close()
            return "EXHAUSTED"
            
    cursor.execute("UPDATE users SET daily_alert_count = ?, last_alert_date = ? WHERE id = ?", (count + 1, today, user_id))
    conn.commit()
    conn.close()
    return "OK"

def add_system_log(level: str, component: str, message: str, details: str = ""):
    """시스템 로그(푸시 알림 결과, 스케줄러 에러 등)를 DB에 저장합니다."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO system_logs (level, component, message, details) VALUES (?, ?, ?, ?)",
            (level, component, message, details)
        )
        conn.commit()
    except Exception as e:
        print(f"[DB Error] Failed to insert system log: {e}")
    finally:
        conn.close()

def get_system_logs(limit: int = 100):
    """최근 시스템 로그를 반환합니다."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, level, component, message, details, created_at FROM system_logs ORDER BY id DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "level": r[1],
                "component": r[2],
                "message": r[3],
                "details": r[4],
                "created_at": r[5]
            }
            for r in rows
        ]
    except Exception as e:
        print(f"[DB Error] Failed to fetch system logs: {e}")
        return []
    finally:
        conn.close()

def cleanup_old_system_logs(days: int = 3):
    """3일(기본값)이 지난 시스템 로그를 자동으로 삭제하여 DB 용량을 절약합니다."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM system_logs WHERE created_at < datetime('now', '-' || ? || ' days')",
            (days,)
        )
        deleted = cursor.rowcount
        conn.commit()
        if deleted > 0:
            print(f"[DB Cleanup] Deleted {deleted} old system_logs (older than {days} days).")
        return deleted
    except Exception as e:
        print(f"[DB Error] Failed to cleanup system logs: {e}")
        return 0
    finally:
        conn.close()
