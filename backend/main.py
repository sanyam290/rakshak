import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
import models
from seed import seed_database
from routers.api import router as api_router
from routers.reports import router as reports_router
from routers.websocket import ws_manager
from ingestion.scheduler import start_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend_main")

app = FastAPI(
    title="NER-Sentinel Early Warning Backend",
    description="Backend service for Landslide Early Warning & Monitoring System in North Eastern Region",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(api_router, prefix="/api")
app.include_router(reports_router, prefix="/api")

@app.on_event("startup")
def on_startup():
    logger.info("Initializing database tables...")
    models.init_db()
    from database import SessionLocal
    db = SessionLocal()
    zone_count = db.query(models.Zone).count()
    if zone_count == 0:
        logger.info("Database empty. Seeding synthetic NER geospatial data...")
        seed_database()
    db.close()

    logger.info("Starting background ingestion scheduler...")
    try:
        start_scheduler(interval_minutes=15)
    except Exception as e:
        logger.warning(f"Could not start background scheduler: {e}")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "backend",
        "version": "1.0.0"
    }

@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
