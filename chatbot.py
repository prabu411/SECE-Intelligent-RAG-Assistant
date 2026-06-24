import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

DATA_FILE = "D:/Web-Scrapper-project/sece_full.json"

# ── Load & chunk the scraped data ─────────────────────────────────────────────
def build_chunks(data):
    chunks = []

    # Title
    if data.get("title"):
        chunks.append(f"College name: {data['title']}")

    # Meta description / keywords
    for key in ("description", "keywords"):
        if data["meta"].get(key):
            chunks.append(f"{key.capitalize()}: {data['meta'][key]}")

    # Headings paired with nearby context
    for h in data["headings"]:
        text = h["text"].strip()
        if text and len(text) > 3:
            chunks.append(f"{h['level'].upper()}: {text}")

    # Paragraphs
    for p in data["paragraphs"]:
        p = p.strip()
        if len(p) > 20:
            chunks.append(p)

    # Lists — join items into a readable sentence
    for lst in data["lists"]:
        items = [i.strip() for i in lst["items"] if len(i.strip()) > 3]
        if items:
            chunks.append("Items: " + " | ".join(items[:20]))  # cap at 20 items

    # Nav links — capture menu structure
    seen = set()
    nav_texts = []
    for n in data["nav_links"]:
        t = n["text"].strip()
        if t and t not in seen and len(t) > 1:
            seen.add(t)
            nav_texts.append(t)
    if nav_texts:
        chunks.append("Website sections / navigation: " + ", ".join(nav_texts))

    # Deduplicate
    seen_chunks = set()
    unique = []
    for c in chunks:
        c = c.strip()
        if c and c not in seen_chunks:
            seen_chunks.add(c)
            unique.append(c)
    return unique


# ── RAG Retriever ─────────────────────────────────────────────────────────────
class SECEChatbot:
    def __init__(self):
        print("Loading data...")
        with open(DATA_FILE, encoding="utf-8") as f:
            data = json.load(f)

        self.chunks = build_chunks(data)
        print(f"Built {len(self.chunks)} knowledge chunks.")

        print("Loading embedding model (first run downloads ~90MB)...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

        print("Encoding chunks...")
        self.embeddings = self.model.encode(self.chunks, show_progress_bar=False)
        print("Ready!\n")

    def retrieve(self, query, top_k=5):
        q_emb = self.model.encode([query])
        scores = cosine_similarity(q_emb, self.embeddings)[0]
        top_idx = np.argsort(scores)[::-1][:top_k]
        return [(self.chunks[i], float(scores[i])) for i in top_idx]

    def answer(self, query):
        results = self.retrieve(query, top_k=5)

        # Filter out low-relevance chunks
        relevant = [(c, s) for c, s in results if s > 0.25]

        if not relevant:
            return "Sorry, I couldn't find relevant information about that in the SECE website data."

        context = "\n".join(f"- {c}" for c, _ in relevant)

        # Simple generative response: surface context clearly
        response = f"Based on the SECE website, here's what I found:\n\n{context}"
        return response


# ── Chat loop ─────────────────────────────────────────────────────────────────
def main():
    bot = SECEChatbot()
    print("=" * 60)
    print("  SECE RAG Chatbot — Sri Eshwar College of Engineering")
    print("  Type 'quit' or 'exit' to stop.")
    print("=" * 60)

    while True:
        try:
            query = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not query:
            continue
        if query.lower() in ("quit", "exit", "bye"):
            print("Goodbye!")
            break

        print("\nBot:", bot.answer(query))


if __name__ == "__main__":
    main()
