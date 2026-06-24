import { pipeline } from '@xenova/transformers';
import Database from 'better-sqlite3';
import Groq from 'groq-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'sece.db');

// ── Singletons ───────────────────────────────────────────────────────────────
let _embedder = null;
async function getEmbedder() {
  if (!_embedder)
    _embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return _embedder;
}

let _db = null;
function getDB() {
  if (!_db) _db = new Database(DB_PATH, { readonly: true });
  return _db;
}

function getGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_api_key_here') return null;
  return new Groq({ apiKey: key });
}

// ── Embed ─────────────────────────────────────────────────────────────────────
async function embed(text) {
  const e = await getEmbedder();
  const out = await e(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

// ── Cosine similarity ─────────────────────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}

// ── Noise filter — skip research citations, spam, travel pages ────────────────
const NOISE = [
  /international conference/i, /journal of/i, /doi\.org/i,
  /isbn|issn/i, /slot.?gacor/i, /tokyo|osaka/i,
  /transport fee management/i, /career trajectories.*placement management/i,
];
const isClean = c => !NOISE.some(p => p.test(c));

// ── Strip [Page Title] prefix for LLM context ─────────────────────────────────
const stripPrefix = c => c.replace(/^\[.+?\]\s*/, '').trim();

// ── Main ──────────────────────────────────────────────────────────────────────
export async function retrieveAndAnswer(query) {
  const db = getDB();
  const { n } = db.prepare('SELECT COUNT(*) as n FROM chunks').get();
  if (n === 0)
    return 'The knowledge base is empty. Run the scraper first: `cd scraper && node crawler.js`';

  // 1. Embed query
  const qVec = await embed(query);

  // 2. Load, filter noise, score by cosine similarity
  const rows = db.prepare('SELECT content, embedding FROM chunks').all();
  const scored = rows
    .filter(r => isClean(r.content))
    .map(r => ({ content: r.content, score: cosineSim(qVec, JSON.parse(r.embedding)) }))
    .sort((a, b) => b.score - a.score);

  // 3. Keep top chunks above relevance threshold
  const top = scored.filter(r => r.score > 0.3).slice(0, 8);

  // fallback: if nothing above threshold, take top 5 anyway
  const chunks = top.length >= 2 ? top : scored.slice(0, 5);
  const context = [...new Set(chunks.map(r => stripPrefix(r.content)))].join('\n\n');

  // 4. Use Groq if key is set
  const groq = getGroq();
  if (groq) {
    const res = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are the official AI assistant for Sri Eshwar College of Engineering (SECE), Coimbatore, Tamil Nadu.
Answer the user's question using ONLY the context below scraped from sece.ac.in.
Rules:
- Be direct and helpful. Answer in clear paragraphs or bullet points.
- If listing items (courses, departments etc.) use bullet points.
- If the context doesn't have the answer, say: "I don't have that specific information. Please visit sece.ac.in or call the admissions office."
- Never invent facts not in the context.

CONTEXT:
${context}`,
        },
        { role: 'user', content: query },
      ],
    });
    return res.choices[0].message.content;
  }

  // 5. No Groq key — return a clean structured answer from chunks
  return `Here's what I found on the official SECE website:\n\n${context}\n\n---\n*For more details visit [sece.ac.in](https://sece.ac.in)*`;
}

// Warm up embedder on server start
getEmbedder().catch(() => {});
