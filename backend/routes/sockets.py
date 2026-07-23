from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import json
import asyncio

router = APIRouter()

# [KIS WS Helper]
async def handle_user_ws_message(user_id: str, symbol: str, price: float, change: str):
    """Handle incoming real-time data from KIS WebSocket and route to user sockets"""
    from sockets import manager
    # Create the data payload expected by the frontend
    quote = {
        "symbol": symbol,
        "price": price,
        "change": change
    }
    await manager.send_private_update(user_id, symbol, quote)

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, user_id: str = Query("guest")):
    """
    WebSocket endpoint for real-time stock price updates.
    """
    # [Lazy Imports]
    from sockets import manager
    from user_session import session_manager
    from stock_data import get_simple_quote
    
    await manager.connect(websocket, user_id)
    
    # Guest fallback polling task
    async def poll_fallback():
        last_price = None
        while True:
            try:
                # Only poll if there's NO active private KIS websocket session running for this user
                if user_id not in session_manager.user_websockets:
                    symbol = manager.subscriptions.get(websocket)
                    if symbol:
                        quote = await asyncio.to_thread(get_simple_quote, symbol)
                        if quote and quote.get('price') != last_price:
                            last_price = quote.get('price')
                            await websocket.send_json({"type": "update", "data": quote})
                await asyncio.sleep(10) # 10 seconds interval for guest users
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[WS Poll Fallback] Error: {e}")
                await asyncio.sleep(10)

    polling_task = asyncio.create_task(poll_fallback())
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get('type')
            
            if msg_type == 'ping':
                await websocket.send_json({"type": "pong"})
            
            elif msg_type == 'auth':
                keys = message.get('keys')
                if keys:
                    manager.set_keys(websocket, keys)
                    await session_manager.start_user_session(user_id, keys, handle_user_ws_message)
                    # Also subscribe existing symbol on the newly created KIS session
                    symbol = manager.subscriptions.get(websocket)
                    if symbol:
                        await session_manager.subscribe_user_symbol(user_id, symbol)
                    await websocket.send_json({"type": "auth_success"})
            
            elif msg_type == 'subscribe':
                symbol = message.get('symbol')
                if symbol:
                    await manager.subscribe(websocket, symbol)
                    # Subscribe on KIS WebSocket if user session is active
                    await session_manager.subscribe_user_symbol(user_id, symbol)
                    # Send initial price immediately
                    initial = await asyncio.to_thread(get_simple_quote, symbol)
                    if initial:
                        await websocket.send_json({"type": "update", "data": initial})
            
            elif msg_type == 'unsubscribe':
                symbol = message.get('symbol')
                if symbol:
                    await session_manager.unsubscribe_user_symbol(user_id, symbol)
                
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        # Cleanup KIS session if no connections left
        remaining = [ws for ws, m in manager.active_connections.items() if m['user_id'] == user_id]
        if not remaining:
            await session_manager.stop_user_session(user_id)
    except Exception as e:
        print(f"[WS] Error: {e}")
        await manager.disconnect(websocket)
    finally:
        polling_task.cancel()
