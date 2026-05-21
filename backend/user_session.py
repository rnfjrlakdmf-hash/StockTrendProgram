import asyncio
import logging
from typing import Dict
from kis_api import KisApi
from kis_ws import KisWebSocket
from sockets import manager

# Logger
logger = logging.getLogger("UserSessionManager")

class UserSessionManager:
    """
    Manages user-specific KIS API and WebSocket sessions.
    """
    def __init__(self):
        # user_id -> KisWebSocket
        self.user_websockets: Dict[str, KisWebSocket] = {}
        # user_id -> KisApi
        self.user_rest_clients: Dict[str, KisApi] = {}

    async def start_user_session(self, user_id: str, keys: dict, message_handler):
        """
        Start a KIS WebSocket session for a specific user.
        """
        try:
            # 1. Create REST API client to get Approval Key
            kis_rest = KisApi(keys['kis_app_key'], keys['kis_secret'], keys['kis_account'])
            self.user_rest_clients[user_id] = kis_rest
            
            # 2. Get Approval Key
            approval_key = kis_rest.get_approval_key()
            if not approval_key:
                logger.error(f"[UserSession] Failed to get approval key for {user_id}")
                return False

            # 3. Create WebSocket Client
            ws_client = KisWebSocket(approval_key)
            
            # 4. Set Callback to route messages to this user ONLY (or Public if desired)
            # For now, we route to a specific handler that can decide
            ws_client.set_callback(lambda s, p, c: message_handler(user_id, s, p, c))
            
            # 5. Connect
            await ws_client.connect()
            self.user_websockets[user_id] = ws_client
            logger.info(f"[UserSession] Started session for {user_id}")
            return True

        except Exception as e:
            logger.error(f"[UserSession] Error starting session for {user_id}: {e}")
            return False

    async def stop_user_session(self, user_id: str):
        """
        Stop and cleanup user session.
        """
        if user_id in self.user_websockets:
            try:
                await self.user_websockets[user_id].close()
                del self.user_websockets[user_id]
                logger.info(f"[UserSession] Stopped session for {user_id}")
            except Exception as e:
                logger.error(f"[UserSession] Error stopping session for {user_id}: {e}")

        if user_id in self.user_rest_clients:
            del self.user_rest_clients[user_id]

    async def subscribe_user_symbol(self, user_id: str, symbol: str):
        """
        Subscribe a symbol on the user's private WebSocket.
        """
        if user_id in self.user_websockets:
            ws = self.user_websockets[user_id]
            if ws.connected:
                await ws.subscribe(symbol)

    async def unsubscribe_user_symbol(self, user_id: str, symbol: str):
        if user_id in self.user_websockets:
             ws = self.user_websockets[user_id]
             if ws.connected:
                 await ws.unsubscribe(symbol)

session_manager = UserSessionManager()
