import os
import time
import json
import logging
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_URL = "https://sece.ac.in"
DOMAIN = "sece.ac.in"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
DELAY_SECONDS = 1.0  # Polite crawling delay

os.makedirs(DATA_DIR, exist_ok=True)

class SECEScraper:
    def __init__(self):
        self.visited = set()
        self.to_visit = [BASE_URL]
        self.rp = RobotFileParser()
        self.rp.set_url(urljoin(BASE_URL, "/robots.txt"))
        try:
            self.rp.read()
            logging.info("Successfully read robots.txt")
        except Exception as e:
            logging.warning(f"Could not read robots.txt: {e}")
        
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "SECE-RAG-Bot/1.0 (Research Project)"
        })

    def is_valid_url(self, url):
        """Check if URL belongs to sece.ac.in and is not a junk/asset link."""
        parsed = urlparse(url)
        if DOMAIN not in parsed.netloc:
            return False
            
        # Ignore media and non-HTML files
        if re.search(r'\.(pdf|jpg|jpeg|png|gif|zip|rar|tar|gz|mp4|mp3|css|js|xml)$', parsed.path.lower()):
            return False
            
        # Optional: Add specific filters for known junk paths on this site
        if any(junk in parsed.path.lower() for junk in ['/wp-content/uploads/', '/wp-json/']):
            return False
            
        return True

    def get_section_label(self, url):
        """Derive a simple section label from the URL path."""
        path = urlparse(url).path.strip('/')
        if not path:
            return "Home"
        parts = path.split('/')
        return " > ".join(p.replace('-', ' ').title() for p in parts)

    def slugify(self, text):
        return re.sub(r'[\W_]+', '-', text).strip('-')

    def crawl(self, max_pages=100):
        logging.info("Starting crawl...")
        pages_crawled = 0
        
        while self.to_visit and pages_crawled < max_pages:
            url = self.to_visit.pop(0)
            
            if url in self.visited:
                continue
                
            # if not self.rp.can_fetch(self.session.headers["User-Agent"], url):
            #     logging.warning(f"Robots.txt disallowed: {url}")
            #     self.visited.add(url)
            #     continue
                
            logging.info(f"Crawling: {url}")
            try:
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
            except requests.RequestException as e:
                logging.error(f"Failed to fetch {url}: {e}")
                self.visited.add(url)
                time.sleep(DELAY_SECONDS)
                continue

            content_type = response.headers.get('Content-Type', '')
            if 'text/html' not in content_type:
                logging.info(f"Skipping non-HTML content: {url}")
                self.visited.add(url)
                continue

            html = response.text
            soup = BeautifulSoup(html, 'html.parser')
            
            title = soup.title.string if soup.title else "Untitled"
            title = title.strip()
            
            # Save raw HTML and metadata
            metadata = {
                "url": url,
                "title": title,
                "section": self.get_section_label(url),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            slug = self.slugify(urlparse(url).path)
            if not slug:
                slug = "index"
                
            filename = f"{slug}.json"
            filepath = os.path.join(DATA_DIR, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump({
                    "metadata": metadata,
                    "html": html
                }, f, ensure_ascii=False, indent=2)
            
            self.visited.add(url)
            pages_crawled += 1
            
            # Find new links
            for link in soup.find_all('a', href=True):
                next_url = urljoin(url, link['href'])
                # remove fragments
                next_url = next_url.split('#')[0]
                
                if next_url not in self.visited and next_url not in self.to_visit:
                    if self.is_valid_url(next_url):
                        self.to_visit.append(next_url)
            
            time.sleep(DELAY_SECONDS)

        logging.info(f"Crawl finished. Crawled {pages_crawled} pages.")

if __name__ == "__main__":
    scraper = SECEScraper()
    # Limiting to 20 pages for testing purposes. Increase for full crawl.
    scraper.crawl(max_pages=20)
