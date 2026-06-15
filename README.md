# SECE-Intelligent-RAG-Assistant

A minimal MERN-based Retrieval-Augmented Generation assistant for Sri Eshwar College of Engineering.

## Architecture

- **Frontend (React + Vite)**: conversational UI to trigger re-indexing and query indexed data.
- **Backend (Node.js + Express)**: crawling, chunking, retrieval endpoints, and answer generation.
- **Database (MongoDB)**: optional chat-history persistence via `MONGODB_URI`.
- **RAG logic**: semantic chunking + vector similarity retrieval with zero-hallucination fallback.

## Features aligned with problem statement

- Domain crawling and ingestion with same-domain link traversal (`/api/index`)
- Text cleaning from HTML and chunking that preserves local context
- Vectorized retrieval for hyper-specific questions (`/api/query`)
- Explicit “not found in official records” response when no supporting context exists
- Manual re-index trigger from UI, suitable for periodic/trigger-based sync workflows

## Repository structure

- `/backend` - Express API, crawler, vector store, tests
- `/frontend` - React web client

## Run locally

### Backend

```bash
cd backend
npm install
npm start
```

Optional environment variables:

- `PORT` (default: `3001`)
- `MONGODB_URI` (enables MongoDB chat history)
- `MONGODB_DB` (default: `sece_rag`)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional:

- `VITE_API_BASE` (default: `http://localhost:3001`)

## Testing

```bash
cd backend
npm test
```

The test suite validates:
- Hyper-specific retrieval behavior
- Zero-hallucination fallback when data is absent
