# SECE RAG Bot — v2

100% local. No API keys. No cloud database.

## Stack
| Layer | Tech |
|---|---|
| Embeddings | `@xenova/transformers` — `all-MiniLM-L6-v2` (runs locally, ~25MB download) |
| Database | **SQLite** via `better-sqlite3` (single file: `backend/sece.db`) |
| Vector search | Cosine similarity in-memory |
| Backend | Express.js |
| Frontend | React + Vite |

## Run Order

### Step 1 — Scrape & index SECE website (one-time)
```bash
cd scraper
npm install
npm start
# Crawls up to 120 pages of sece.ac.in
# Saves embeddings to ../backend/sece.db
# Takes ~15-30 minutes
```

### Step 2 — Start backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

### Step 3 — Start frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

## Notes
- The scraper writes `sece.db` directly into `backend/` — no config needed
- First run of scraper/backend will download the embedding model (~25MB) and cache it locally
- No `.env` file required — zero configuration
