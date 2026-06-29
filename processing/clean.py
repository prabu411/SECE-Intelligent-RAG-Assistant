import os
import json
import logging
from bs4 import BeautifulSoup
import re

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "scraper", "data", "raw")
CLEAN_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "scraper", "data", "clean")

os.makedirs(CLEAN_DATA_DIR, exist_ok=True)

def clean_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove script, style, header, footer, nav, aside elements
    for element in soup(["script", "style", "header", "footer", "nav", "aside", "noscript"]):
        element.extract()
        
    # We removed the aggressive regex by class/id (nav|footer|header|menu|sidebar|widget|cookie|banner|spam)
    # because it was matching 'elementor-widget' and deleting the entire page content.

    # Get text
    text = soup.get_text(separator=' ')
    
    # Clean up whitespace
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    text = '\n'.join(chunk for chunk in chunks if chunk)
    
    return text

def process_all_files():
    if not os.path.exists(RAW_DATA_DIR):
        logging.error(f"Raw data directory not found: {RAW_DATA_DIR}")
        return
        
    files = [f for f in os.listdir(RAW_DATA_DIR) if f.endswith('.json')]
    logging.info(f"Found {len(files)} files to process.")
    
    processed_count = 0
    for filename in files:
        raw_filepath = os.path.join(RAW_DATA_DIR, filename)
        
        try:
            with open(raw_filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            html_content = data.get('html', '')
            metadata = data.get('metadata', {})
            
            clean_text = clean_html(html_content)
            
            if not clean_text.strip():
                logging.info(f"Skipping {filename}: No meaningful text found.")
                continue
                
            clean_data = {
                "metadata": metadata,
                "text": clean_text
            }
            
            clean_filepath = os.path.join(CLEAN_DATA_DIR, filename)
            with open(clean_filepath, 'w', encoding='utf-8') as f:
                json.dump(clean_data, f, ensure_ascii=False, indent=2)
                
            processed_count += 1
            
        except Exception as e:
            logging.error(f"Error processing {filename}: {e}")
            
    logging.info(f"Successfully processed {processed_count} files.")

if __name__ == "__main__":
    process_all_files()
