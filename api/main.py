import os
import subprocess
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from .rag_pipeline import pipeline

app = FastAPI(title="SECE RAG Chatbot API")

# Mount frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[Message]] = []

@app.get("/", response_class=HTMLResponse)
async def get_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Frontend index.html not found.")

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        # Pass question and history to pipeline
        result = pipeline.ask(req.question, [m.model_dump() for m in req.history])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/reindex")
async def admin_reindex():
    try:
        # Run the scripts sequentially
        base_dir = os.path.join(os.path.dirname(__file__), "..")
        
        # 1. Scrape (this should ideally be async or a background task in production)
        # We will use subprocess for simplicity in this prototype
        subprocess.run(["python", "scraper/crawler.py"], cwd=base_dir, check=True)
        
        # 2. Process
        subprocess.run(["python", "processing/clean.py"], cwd=base_dir, check=True)
        subprocess.run(["python", "processing/chunk.py"], cwd=base_dir, check=True)
        
        # 3. Index
        subprocess.run(["python", "indexing/embed_and_store.py"], cwd=base_dir, check=True)
        
        return {"status": "success", "message": "Re-indexing completed successfully."}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error running pipeline: {e}")

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
