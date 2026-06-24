import os
import json
import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

CLEAN_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "scraper", "data", "clean")
CHUNKS_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "scraper", "data", "chunks")

os.makedirs(CHUNKS_DATA_DIR, exist_ok=True)

def chunk_all_files():
    if not os.path.exists(CLEAN_DATA_DIR):
        logging.error(f"Clean data directory not found: {CLEAN_DATA_DIR}")
        return

    files = [f for f in os.listdir(CLEAN_DATA_DIR) if f.endswith('.json')]
    logging.info(f"Found {len(files)} files to chunk.")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        length_function=len,
        is_separator_regex=False,
    )
    total_chunks = 0
    for filename in files:
        clean_filepath = os.path.join(CLEAN_DATA_DIR, filename)
        
        try:
            with open(clean_filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            text = data.get('text', '')
            metadata = data.get('metadata', {})
            
            chunks = text_splitter.split_text(text)
            
            chunked_data = []
            for i, chunk in enumerate(chunks):
                chunk_metadata = metadata.copy()
                chunk_metadata["chunk_index"] = i
                
                chunked_data.append({
                    "metadata": chunk_metadata,
                    "text": chunk
                })
                
            chunks_filepath = os.path.join(CHUNKS_DATA_DIR, filename)
            with open(chunks_filepath, 'w', encoding='utf-8') as f:
                json.dump(chunked_data, f, ensure_ascii=False, indent=2)
                
            total_chunks += len(chunks)
            
        except Exception as e:
            logging.error(f"Error chunking {filename}: {e}")
            
    logging.info(f"Successfully created {total_chunks} total chunks.")

if __name__ == "__main__":
    chunk_all_files()
