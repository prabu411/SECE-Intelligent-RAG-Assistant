import requests
from bs4 import BeautifulSoup
import json
import csv

URL = "https://sece.ac.in/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print(f"Fetching {URL} ...")
res = requests.get(URL, headers=HEADERS, timeout=30)
res.raise_for_status()
print(f"Status: {res.status_code}  |  Page size: {len(res.text):,} bytes\n")

soup = BeautifulSoup(res.text, "html.parser")

title = soup.title.get_text(strip=True) if soup.title else ""

meta = {}
for tag in soup.find_all("meta"):
    key = tag.get("name") or tag.get("property") or tag.get("http-equiv")
    val = tag.get("content")
    if key and val:
        meta[key] = val

headings = [
    {"level": h.name, "text": h.get_text(strip=True)}
    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
    if h.get_text(strip=True)
]

paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if p.get_text(strip=True)]

links = [
    {"text": a.get_text(strip=True), "href": a.get("href", "").strip()}
    for a in soup.find_all("a")
    if a.get("href", "").strip()
]

images = [
    {"src": img.get("src", "").strip(), "alt": img.get("alt", "").strip()}
    for img in soup.find_all("img")
    if img.get("src", "").strip()
]

lists = []
for lst in soup.find_all(["ul", "ol"]):
    items = [li.get_text(strip=True) for li in lst.find_all("li") if li.get_text(strip=True)]
    if items:
        lists.append({"type": lst.name, "items": items})

nav_links = [
    {"text": a.get_text(strip=True), "href": a.get("href", "").strip()}
    for nav in soup.find_all("nav")
    for a in nav.find_all("a")
    if a.get_text(strip=True)
]

print(f"Title      : {title}")
print(f"Meta tags  : {len(meta)}")
print(f"Headings   : {len(headings)}")
print(f"Paragraphs : {len(paragraphs)}")
print(f"Links      : {len(links)}")
print(f"Images     : {len(images)}")
print(f"Lists      : {len(lists)}")
print(f"Nav links  : {len(nav_links)}\n")

output = {
    "url": URL,
    "title": title,
    "meta": meta,
    "headings": headings,
    "paragraphs": paragraphs,
    "links": links,
    "images": images,
    "lists": lists,
    "nav_links": nav_links
}
with open("sece_full.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print("Saved -> sece_full.json")

with open("sece_links.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["text", "href"])
    w.writeheader()
    w.writerows(links)
print("Saved -> sece_links.csv")

with open("sece_images.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["src", "alt"])
    w.writeheader()
    w.writerows(images)
print("Saved -> sece_images.csv")

with open("sece_content.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["type", "level", "text"])
    for h in headings:
        w.writerow(["heading", h["level"], h["text"]])
    for p in paragraphs:
        w.writerow(["paragraph", "p", p])
print("Saved -> sece_content.csv")

print("\nDone! All files saved.")
