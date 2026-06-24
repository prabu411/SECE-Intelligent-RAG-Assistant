import os
import json
import logging
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

CHUNKS_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "scraper", "data", "chunks")
DB_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

def embed_and_store():
    if not os.path.exists(CHUNKS_DATA_DIR):
        logging.error(f"Chunks directory not found: {CHUNKS_DATA_DIR}")
        return

    files = [f for f in os.listdir(CHUNKS_DATA_DIR) if f.endswith('.json')]
    if not files:
        logging.warning("No chunks to process.")
        return
        
    logging.info("Loading embedding model (this might take a minute on first run)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    docs = []
    for filename in files:
        filepath = os.path.join(CHUNKS_DATA_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            chunks = json.load(f)
            
        for chunk in chunks:
            # Prepare metadata for ChromaDB (must be strings, ints, floats)
            meta = chunk["metadata"]
            clean_meta = {
                "source": meta.get("url", ""),
                "title": meta.get("title", ""),
                "section": meta.get("section", ""),
            }
            
            doc = Document(page_content=chunk["text"], metadata=clean_meta)
            docs.append(doc)
            
    logging.info(f"Loaded {len(docs)} chunk documents. Generating embeddings and storing in ChromaDB...")
    
    # Create or update ChromaDB
    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=DB_DIR
    )
    
    logging.info(f"Successfully persisted vectors to {DB_DIR}")

if __name__ == "__main__":
    embed_and_store()
