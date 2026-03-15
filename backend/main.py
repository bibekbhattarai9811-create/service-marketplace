from fastapi import FastAPI
from backend.database import engine
from backend.models import Base
from routes import users
from routes import jobs
from fastapi import FastAPI, WebSocket
from connections import active_connections

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(users.router)
app.include_router(jobs.router)


@app.get("/")
def home():
    return {"message": "Service Marketplace API is running"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except:
        active_connections.remove(websocket)


@app.get("/")
def read_root():
    return {"message": "API running successfully"}
