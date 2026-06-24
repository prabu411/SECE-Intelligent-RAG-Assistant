from flask import Flask, request, jsonify, render_template
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

import os
BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, template_folder=os.path.join(BASE, "templates"))

DATA_FILE = "D:/Web-Scrapper-project/sece_full.json"

# ── Build chunks from scraped data ────────────────────────────────────────────
def build_chunks(data):
    chunks = []
    if data.get("title"):
        chunks.append(f"College name: {data['title']}")
    for key in ("description", "keywords"):
        if data["meta"].get(key):
            chunks.append(f"{key.capitalize()}: {data['meta'][key]}")
    for h in data["headings"]:
        text = h["text"].strip()
        if text and len(text) > 3:
            chunks.append(f"{h['level'].upper()}: {text}")
    for p in data["paragraphs"]:
        p = p.strip()
        if len(p) > 20:
            chunks.append(p)
    for lst in data["lists"]:
        items = [i.strip() for i in lst["items"] if len(i.strip()) > 3]
        if items:
            chunks.append("Items: " + " | ".join(items[:20]))
    seen = set()
    nav_texts = []
    for n in data["nav_links"]:
        t = n["text"].strip()
        if t and t not in seen and len(t) > 1:
            seen.add(t)
            nav_texts.append(t)
    if nav_texts:
        chunks.append("Website sections / navigation: " + ", ".join(nav_texts))
    seen_chunks = set()
    unique = []
    for c in chunks:
        c = c.strip()
        if c and c not in seen_chunks:
            seen_chunks.add(c)
            unique.append(c)
    return unique

# ── Load model + data once at startup ─────────────────────────────────────────
print("Loading data and model...")
with open(DATA_FILE, encoding="utf-8") as f:
    data = json.load(f)

chunks = build_chunks(data)
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(chunks, show_progress_bar=False)
print(f"Ready — {len(chunks)} chunks indexed.\n")

# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    query = request.json.get("message", "").strip()
    if not query:
        return jsonify({"reply": "Please ask a question."})

    q_emb = model.encode([query])
    scores = cosine_similarity(q_emb, embeddings)[0]
    top_idx = np.argsort(scores)[::-1][:5]
    relevant = [(chunks[i], float(scores[i])) for i in top_idx if scores[i] > 0.25]

    if not relevant:
        return jsonify({"reply": "Sorry, I couldn't find relevant information about that on the SECE website."})

    reply_lines = [c for c, _ in relevant]
    return jsonify({"reply": "\n\n".join(reply_lines)})

if __name__ == "__main__":
    app.run(debug=False, port=5000)
