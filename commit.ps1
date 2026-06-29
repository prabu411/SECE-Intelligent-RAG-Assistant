git init
git branch -M main
git remote add origin https://github.com/prabu411/SECE-Intelligent-RAG-Assistant.git

git add .gitignore
git commit -m "Initial commit: Add .gitignore to exclude sensitive files and huge DB chunks"

git add README.md
git commit -m "docs: Add comprehensive README.md with architecture flow, setup guide, and fallback mechanism"

git add requirements.txt
git commit -m "build: Add requirements.txt defining project dependencies including FastAPI, LangChain, and Generative AI SDKs"

git add scraper/crawler.py
git commit -m "feat(scraper): Add crawler.py to fetch raw HTML content from SECE website with robots.txt bypass"

git add processing/clean.py
git commit -m "feat(processing): Add clean.py to strip HTML boilerplate and extract meaningful text"

git add processing/chunk.py
git commit -m "feat(processing): Add chunk.py to split cleaned text into manageable segments for embedding"

git add indexing/embed_and_store.py
git commit -m "feat(indexing): Add embed_and_store.py to generate HuggingFace embeddings and populate ChromaDB"

git add api/rag_pipeline.py
git commit -m "feat(api): Add rag_pipeline.py containing core LangChain retrieval logic and robust multi-LLM fallback (OpenAI/Grok/Gemini)"

git add api/main.py
git commit -m "feat(api): Add main.py to serve FastAPI endpoints for chat interaction and data re-indexing"

git add frontend/index.html
git commit -m "feat(frontend): Add index.html defining modern chat interface layout"

git add frontend/style.css
git commit -m "style(frontend): Add style.css implementing premium dark mode and glassmorphism aesthetics"

git add frontend/app.js
git commit -m "feat(frontend): Add app.js to handle asynchronous chat interactions and API integration"

Write-Host "All files have been committed successfully to the local main branch."
Write-Host "Please run 'git push -u origin main' in your terminal to push them to GitHub."
