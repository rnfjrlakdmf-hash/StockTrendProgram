import websockets
import asyncio
import json
import logging
import time
try:
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad
except ImportError:
    AES = None
    unpad = None
    print("⚠️ [Warning] Crypto(pycryptodome) package not found. KIS WebSocket encryption will be disabled.")
import base64

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KisWS")

class KisWebSocket:
    # [New] 해외거래소 코드 매핑 (KIS HDFSCNT0 tr_key 형식)
    EXCHANGE_MAP = {
        '.O': 'NASD',   # NASDAQ
        '.N': 'NYSE',   # NYSE
        '.A': 'AMEX',   # AMEX
        '.K': 'NASD',   # NASDAQ 대체어
    }

    def __init__(self, approval_key):
        self.url = "ws://ops.koreainvestment.com:21000" # Real Server
        self.approval_key = approval_key
        self.connected = False
        self.websocket = None
        self.subscriptions = set() # Set of codes '005930'
        self.lock = asyncio.Lock()
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.reconnect_delay = 5  # Initial delay in seconds
        self.should_reconnect = True
        
        # Callback for incoming data: function(symbol, price, change_rate)
        self.on_message_callback = None

    def set_callback(self, callback):
        self.on_message_callback = callback

    async def connect(self):
        """Connect to KIS WebSocket with error handling"""
        try:
            logger.info(f"[KIS WS] Connecting to {self.url}...")
            self.websocket = await websockets.connect(self.url, ping_interval=60, ping_timeout=30)
            self.connected = True
            self.reconnect_attempts = 0  # Reset on successful connection
            logger.info("[KIS WS] Connected successfully")
            
            # Start listener
            asyncio.create_task(self.listen())
            
            # Start auto-reconnect monitor
            asyncio.create_task(self.auto_reconnect())
            
            # Resubscribe if we had subscriptions (reconnection scenario)
            if self.subscriptions:
                logger.info(f"[KIS WS] Resubscribing to {len(self.subscriptions)} symbols...")
                for code in list(self.subscriptions):  # Use list() to avoid set modification during iteration
                    await self.send_subscribe(code)
                    await asyncio.sleep(0.1)  # Small delay to avoid overwhelming the server
                    
        except Exception as e:
            logger.error(f"[KIS WS] Connection Failed: {e}")
            self.connected = False
            # Trigger reconnect
            if self.should_reconnect:
                await self.schedule_reconnect()

    async def auto_reconnect(self):
        """Monitor connection and auto-reconnect if disconnected"""
        while self.should_reconnect:
            await asyncio.sleep(10)  # Check every 10 seconds
            
            if not self.connected and self.reconnect_attempts < self.max_reconnect_attempts:
                logger.info("[KIS WS] Connection lost, attempting to reconnect...")
                await self.schedule_reconnect()
    
    async def schedule_reconnect(self):
        """Schedule a reconnection attempt with exponential backoff"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error("[KIS WS] Max reconnection attempts reached. Giving up.")
            return
        
        delay = min(self.reconnect_delay * (2 ** self.reconnect_attempts), 300)  # Max 5 minutes
        self.reconnect_attempts += 1
        
        logger.info(f"[KIS WS] Reconnecting in {delay}s (attempt {self.reconnect_attempts}/{self.max_reconnect_attempts})...")
        await asyncio.sleep(delay)
        
        if not self.connected:
            await self.connect()

    async def listen(self):
        """Listen for incoming messages with robust error handling"""
        try:
            while self.connected and self.websocket:
                try:
                    msg = await asyncio.wait_for(self.websocket.recv(), timeout=90)
                except asyncio.TimeoutError:
                    logger.warning("[KIS WS] Receive timeout, connection may be stale")
                    self.connected = False
                    break
                
                # Check formatting (KIS sends plain text usually with | delimiter)
                # Format: 0|H0STCNT0|001|...data...
                # First char 0: Data, 1: Response
                
                if not msg:
                    continue
                
                try:
                    text_data = str(msg)
                    
                    if text_data[0] == '0' or text_data[0] == '1':
                        parts = text_data.split('|')
                        if len(parts) >= 4:
                            tr_id = parts[1]
                            
                            if tr_id == "H0STCNT0": # 국내주식 실시간 체결가
                                # Parsing Data
                                # Data part is after the 3rd delimiter
                                # But KIS data is tricky, often ^ delimited
                                raw_data = parts[3]
                                items = raw_data.split('^')
                                
                                if len(items) > 10:
                                    try:
                                        symbol = items[0] # MKSC_SHRN_ISCD
                                        price = items[2]  # STCK_PRPR
                                        change_rate = items[4] # PRDY_CTRT
                                        
                                        # Call callback
                                        if self.on_message_callback:
                                            await self.on_message_callback(symbol, price, change_rate)
                                    except (IndexError, ValueError) as e:
                                        logger.warning(f"[KIS WS] Data parsing error: {e}")

                            elif tr_id == "HDFSCNT0": # [New] 해외주식 실시간 체결가
                                raw_data = parts[3]
                                items = raw_data.split('^')
                                # HDFSCNT0 필드 순서 (KIS 공식문서 기준):
                                # [0] RSYM: 실종목코드 (NASDAAPL 등)
                                # [2] LAST: 현재가
                                # [4] RATE: 등락률
                                # [7] SIGN: 부호 (1:상한 2:상승 3:보합 4:하락 5:하한)
                                if len(items) > 7:
                                    try:
                                        rsym = items[0]   # e.g. "NASDAAPL"
                                        price = items[2]  # 현재가
                                        change_rate = items[4]  # 등락률
                                        sign = items[7] if len(items) > 7 else '3'

                                        # RSYM 에서 순수 심볼 복원 (NASDAAPL -> AAPL)
                                        clean_symbol = rsym[4:] if len(rsym) > 4 else rsym

                                        # 부호 반영: 4(하락)이면 음수
                                        rate_val = float(change_rate) if change_rate else 0.0
                                        if sign in ('4', '5'):
                                            rate_val = -abs(rate_val)

                                        logger.debug(f"[KIS WS OVERSEAS] {clean_symbol}: {price} ({rate_val:+.2f}%)")
                                        if self.on_message_callback:
                                            await self.on_message_callback(
                                                clean_symbol, price, f"{rate_val:+.2f}%"
                                            )
                                    except (IndexError, ValueError) as e:
                                        logger.warning(f"[KIS WS] HDFSCNT0 parse error: {e}")
                                        
                    else:
                        # Json control message response
                        try:
                            data = json.loads(msg)
                            if data.get('header', {}).get('tr_id') == 'PINGPONG':
                                await self.websocket.send(msg) # Echo ping
                                logger.debug("[KIS WS] Responded to PINGPONG")
                        except json.JSONDecodeError:
                            logger.debug(f"[KIS WS] Non-JSON control message: {text_data[:50]}")
                            
                except Exception as e:
                    logger.warning(f"[KIS WS] Message processing error: {e}")
                    continue
                        
        except websockets.exceptions.ConnectionClosed as e:
            logger.warning(f"[KIS WS] Connection closed: {e}")
            self.connected = False
        except Exception as e:
            logger.error(f"[KIS WS] Listener Error: {e}")
            self.connected = False
        finally:
            logger.info("[KIS WS] Listener stopped")
            # Trigger reconnect if needed
            if self.should_reconnect and not self.connected:
                await self.schedule_reconnect()

    @staticmethod
    def _get_kis_exchange_code(symbol: str) -> str | None:
        """
        [New] 심볼에서 KIS 거래소코드 반환.
        'AAPL' -> 'NASD', 'GOOGL.O' -> 'NASD', 'NVDA.N' -> 'NYSE'
        국내주식(6자리 숫자 또는 .KS/.KQ):는 None 반환
        """
        sym = symbol.upper()
        for suffix, code in KisWebSocket.EXCHANGE_MAP.items():
            if sym.endswith(suffix.upper()):
                return code
        # .O .N 등 접미사 없는 순수 영어 티커 (예: AAPL, NVDA)
        clean = sym.split('.')[0]
        if clean.isalpha() and len(clean) <= 5:
            return 'NASD'  # 기본값 NASDAQ
        return None  # 국내 주식

    async def subscribe(self, symbol):
        """Subscribe to a symbol with error handling (국내/해외 자동 구분)"""
        if not self.connected or not self.websocket:
            logger.warning(f"[KIS WS] Cannot subscribe to {symbol}: not connected")
            # Add to subscriptions anyway so it will be resubscribed on reconnect
            self.subscriptions.add(symbol)
            return
            
        async with self.lock:
            if symbol in self.subscriptions:
                return # Already subbed
            
            self.subscriptions.add(symbol)
            await self.send_subscribe(symbol)

    async def send_subscribe(self, symbol, tr_type="1"):
        """[Updated] 국내(H0STCNT0) / 해외(HDFSCNT0) 자동 구분 구독"""
        if not self.connected or not self.websocket:
            logger.warning(f"[KIS WS] Cannot send subscribe for {symbol}: not connected")
            return
            
        try:
            exchange_code = self._get_kis_exchange_code(symbol)
            is_overseas = exchange_code is not None

            if is_overseas:
                # [New] 해외주식: HDFSCNT0, tr_key = 거래소코드 + 순수심볼
                clean_symbol = symbol.upper().split('.')[0]  # GOOGL.O -> GOOGL
                tr_key = f"{exchange_code}{clean_symbol}"    # NASD + GOOGL = NASDGOOGL
                tr_id = "HDFSCNT0"
                logger.info(f"[KIS WS] Subscribing overseas: {symbol} -> tr_key={tr_key}")
            else:
                # 국내주식: H0STCNT0
                tr_key = symbol
                tr_id = "H0STCNT0"

            data = {
                "header": {
                    "approval_key": self.approval_key,
                    "custtype": "P",
                    "tr_type": tr_type,  # "1": Subscribe, "2": Unsubscribe
                    "content-type": "utf-8"
                },
                "body": {
                    "input": {
                        "tr_id": tr_id,
                        "tr_key": tr_key
                    }
                }
            }
            await self.websocket.send(json.dumps(data))
            action = "Subscribed" if tr_type == "1" else "Unsubscribed"
            logger.info(f"[KIS WS] {action} {'overseas' if is_overseas else 'domestic'}: {symbol} ({tr_id})")
        except Exception as e:
            logger.error(f"[KIS WS] Failed to subscribe to {symbol}: {e}")
            self.connected = False

    async def unsubscribe(self, symbol):
        """Unsubscribe from a symbol with error handling"""
        if not self.connected or not self.websocket:
            logger.warning(f"[KIS WS] Cannot unsubscribe from {symbol}: not connected")
            self.subscriptions.discard(symbol)
            return
            
        async with self.lock:
            if symbol not in self.subscriptions:
                return
            
            self.subscriptions.remove(symbol)
            # 해외/국내 구분하여 unsubscribe (통일된 send_subscribe에 tr_type="2" 전달)
            await self.send_subscribe(symbol, tr_type="2")
    
    async def close(self):
        """Gracefully close the WebSocket connection"""
        logger.info("[KIS WS] Closing connection...")
        self.should_reconnect = False
        self.connected = False
        
        if self.websocket:
            try:
                await self.websocket.close()
            except Exception as e:
                logger.error(f"[KIS WS] Error closing websocket: {e}")
        
        logger.info("[KIS WS] Connection closed")
