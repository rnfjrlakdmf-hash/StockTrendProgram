from fastapi import WebSocket
from typing import List, Dict
import json
import asyncio
import logging

# Logger setup
logger = logging.getLogger("WebSocketManager")

class ConnectionManager:
    def __init__(self):
        # socket -> { 'user_id': str, 'keys': dict | None, 'last_ping': float }
        self.active_connections: Dict[WebSocket, dict] = {} 
        self.subscriptions: Dict[WebSocket, str] = {} # socket -> symbol
        self.heartbeat_tasks: Dict[WebSocket, asyncio.Task] = {} # socket -> heartbeat task

    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a new WebSocket client and start heartbeat"""
        try:
            await websocket.accept()
            import time
            self.active_connections[websocket] = {
                'user_id': user_id, 
                'keys': None,
                'last_ping': time.time()
            }
            
            # Start heartbeat task
            heartbeat_task = asyncio.create_task(self._heartbeat(websocket))
            self.heartbeat_tasks[websocket] = heartbeat_task
            logger.info(f"[WS] Client connected: {user_id} (Total: {len(self.active_connections)})")
        except Exception as e:
            logger.error(f"[WS] Failed to accept connection for {user_id}: {e}")
            raise

    async def _heartbeat(self, websocket: WebSocket):
        """Send periodic ping to keep connection alive and detect disconnections"""
        try:
            while websocket in self.active_connections:
                await asyncio.sleep(30)  # Ping every 30 seconds
                try:
                    await websocket.send_json({"type": "ping", "timestamp": asyncio.get_event_loop().time()})
                except Exception as e:
                    logger.warning(f"[WS] Heartbeat failed, disconnecting: {e}")
                    await self.disconnect(websocket)
                    break
        except asyncio.CancelledError:
            logger.debug("[WS] Heartbeat task cancelled")
        except Exception as e:
            logger.error(f"[WS] Heartbeat error: {e}")

    def set_keys(self, websocket: WebSocket, keys: dict):
        """Register ephemeral keys for this session (RAM only)"""
        if websocket in self.active_connections:
            self.active_connections[websocket]['keys'] = keys
            logger.info(f"[WS] Keys registered for {self.active_connections[websocket]['user_id']} (Memory Only)")

    async def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client and cleanup resources"""
        if websocket in self.active_connections:
            user_id = self.active_connections[websocket].get('user_id', 'unknown')
            del self.active_connections[websocket]
            logger.info(f"[WS] Client disconnected: {user_id}")
        
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
        
        # Cancel heartbeat task
        if websocket in self.heartbeat_tasks:
            self.heartbeat_tasks[websocket].cancel()
            del self.heartbeat_tasks[websocket]

        # Force close socket to validly exit any pending await state in main loop
        try:
            await websocket.close()
        except:
            pass

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a personal message to a specific WebSocket"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"[WS] Failed to send personal message: {e}")
            await self.disconnect(websocket)

    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        to_remove = []
        # Iterate over copy to allow modification during await
        for connection in list(self.active_connections.keys()):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"[WS] Broadcast failed for client: {e}")
                to_remove.append(connection)
        
        for conn in to_remove:
            await self.disconnect(conn)
                
    async def broadcast_to_symbol_public(self, symbol: str, data: dict):
        """
        Send updates to ALL subscribers of 'symbol'.
        Used for Simulation/Public Feed.
        """
        message = json.dumps({"type": "update", "data": data}, ensure_ascii=False)
        to_remove = []
        sent_count = 0
        
        # Iterate over copy to allow modification during await key lookup
        for connection, sub_symbol in list(self.subscriptions.items()):
            if sub_symbol == symbol:
                try:
                    await connection.send_text(message)
                    sent_count += 1
                except Exception as e:
                    logger.warning(f"[WS] Failed to send update for {symbol}: {e}")
                    to_remove.append(connection)
        
        if sent_count > 0:
            logger.debug(f"[WS] Broadcasted {symbol} to {sent_count} clients")
                    
        for conn in to_remove:
            await self.disconnect(conn)

    async def send_private_update(self, user_id: str, symbol: str, data: dict):
        """
        Send update ONLY to specific user's socket(s).
        """
        message = json.dumps({"type": "update", "data": data}, ensure_ascii=False)
        to_remove = []
        sent_count = 0

        # Find sockets belonging to user_id AND subscribed to symbol
        for connection, metadata in self.active_connections.items():
            if metadata['user_id'] == user_id and self.subscriptions.get(connection) == symbol:
                try:
                    await connection.send_text(message)
                    sent_count += 1
                except Exception as e:
                    logger.warning(f"[WS] Failed to send private update to {user_id}: {e}")
                    to_remove.append(connection)
        
        if sent_count > 0:
            logger.debug(f"[WS] Sent private update for {symbol} to {user_id}")

        for conn in to_remove:
            await self.disconnect(conn)

    async def subscribe(self, websocket: WebSocket, symbol: str):
        """Subscribe a WebSocket to a specific symbol"""
        old_symbol = self.subscriptions.get(websocket)
        self.subscriptions[websocket] = symbol
        
        # Confirm subscription
        try:
            await websocket.send_text(json.dumps({"type": "subscribed", "symbol": symbol}, ensure_ascii=False))
            logger.info(f"[WS] Client subscribed to {symbol}" + (f" (was {old_symbol})" if old_symbol else ""))
        except Exception as e:
            logger.error(f"[WS] Failed to confirm subscription: {e}")
            await self.disconnect(websocket)
        
    def get_connected_user_ids(self) -> List[str]:
        """Return unique user IDs of all connected clients"""
        return list(set([m['user_id'] for m in self.active_connections.values()]))
        
    def get_user_keys(self, user_id: str):
        """Find ANY active socket for this user that has keys"""
        for meta in self.active_connections.values():
            if meta['user_id'] == user_id and meta['keys']:
                return meta['keys']
        return None
    
    def get_connection_stats(self) -> dict:
        """Get statistics about current connections"""
        return {
            "total_connections": len(self.active_connections),
            "total_subscriptions": len(self.subscriptions),
            "unique_users": len(self.get_connected_user_ids()),
            "subscribed_symbols": len(set(self.subscriptions.values()))
        }

    def get_user_subscriptions(self, user_id: str) -> List[str]:
        """Get list of distinct symbols a user is subscribed to"""
        symbols = set()
        for ws, meta in self.active_connections.items():
            if meta['user_id'] == user_id:
                sym = self.subscriptions.get(ws)
                if sym:
                    symbols.add(sym)
        return list(symbols)

manager = ConnectionManager()
