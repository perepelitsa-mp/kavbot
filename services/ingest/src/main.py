from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
from .embedder import Embedder
from .telegram_parser import TelegramParser
from .scheduler import setup_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Kavbot Ingest Service", version="1.0.0")

# Initialize embedder
embedder = Embedder()

# Initialize Telegram parser
telegram_parser = TelegramParser()

# Setup scheduler for periodic ingestion
setup_scheduler(telegram_parser)


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]


class IngestRequest(BaseModel):
    source_id: str


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ingest"}


@app.post("/embed", response_model=EmbedResponse)
async def generate_embedding(request: EmbedRequest):
    """Generate embedding for text"""
    try:
        embedding = embedder.encode(request.text)
        return EmbedResponse(embedding=embedding.tolist())
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/run")
async def run_ingest(request: IngestRequest):
    """Manually trigger ingestion for a specific source"""
    try:
        await telegram_parser.process_source(request.source_id)
        return {"status": "ok", "message": f"Ingestion started for source {request.source_id}"}
    except Exception as e:
        logger.error(f"Error running ingest: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ingest/status")
async def get_ingest_status():
    """Get status of all ingestion jobs"""
    # TODO: Implement status tracking
    return {"status": "ok", "active_jobs": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)