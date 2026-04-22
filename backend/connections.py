import json

from fastapi import WebSocket


active_connections: dict[int, set[WebSocket]] = {}


def add_connection(user_id: int, websocket: WebSocket):
    active_connections.setdefault(user_id, set()).add(websocket)


def remove_connection(user_id: int, websocket: WebSocket):
    user_connections = active_connections.get(user_id)
    if not user_connections:
        return

    user_connections.discard(websocket)
    if not user_connections:
        active_connections.pop(user_id, None)


async def send_json_to_user(user_id: int, payload: dict):
    for connection in list(active_connections.get(user_id, set())):
        try:
            await connection.send_text(json.dumps(payload))
        except Exception:
            pass
