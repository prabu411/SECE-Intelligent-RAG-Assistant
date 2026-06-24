import axios from 'axios';
import * as cheerio from 'cheerio';
import Database from 'better-sqlite3';
import { pipeline } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'backend', 'sece.db');
const START_URL = 'https://sece.ac.in';
const MAX_PAGES = 120;

// ── Init SQLite ──────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS chunks (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    url       TEXT NOT NULL,
    title     TEXT,
    content   TEXT NOT NULL,
    embedding TEXT NOT NULL
  )
`);
const insertChunk = db.prepare(
  'INSERT INTO chunks (url, title, content, embedding) VALUES (?, ?, ?, ?)'
);
const clearChunks = db.prepare('DELETE FROM chunks');

// ── Load local embedding model ───────────────────────────────────────────────
console.log('⏳ Loading local embedding model (first run downloads ~25MB)...');
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
console.log('✅ Embedding model ready\n');

async function embed(text) {
  const out = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

// ── HTML → text chunks (~500 chars each) ────────────────────────────────────
function extractChunks(html, url) {
  const $ = cheerio.load(html);
  $('header,footer,nav,script,style,iframe,noscript,.menu,.navbar,.breadcrumb').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || url;
  const segments = [];

  $('h1,h2,h3,h4,p,li,td,th').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 40) segments.push(text);
  });

  const unique = [...new Set(segments)];
  const chunks = [];
  let buf = '';
  for (const seg of unique) {
    if ((buf + ' ' + seg).length > 500) {
      if (buf) chunks.push(buf.trim());
      buf = seg;
    } else {
      buf += (buf ? ' ' : '') + seg;
    }
  }
  if (buf) chunks.push(buf.trim());

  return { title, chunks };
}

// ── Main crawl loop ──────────────────────────────────────────────────────────
async function crawl() {
  clearChunks.run();
  console.log('🗑️  Cleared previous index\n');

  const visited = new Set();
  const queue = [START_URL];
  let pageCount = 0;
  let totalChunks = 0;

  while (queue.length > 0 && pageCount < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    pageCount++;

    try {
      process.stdout.write(`[${pageCount}/${MAX_PAGES}] ${url} ... `);
      const { data: html } = await axios.get(url, {
        headers: { 'User-Agent': 'SECE-RAG-Bot/2.0' },
        timeout: 12000,
      });

      const { title, chunks } = extractChunks(html, url);

      const insertMany = db.transaction(async (chunkList) => {
        for (const chunk of chunkList) {
          const vec = await embed(`${title}: ${chunk}`);
          insertChunk.run(url, title, `[${title}] ${chunk}`, JSON.stringify(vec));
          totalChunks++;
        }
      });

      // Run serially (transaction wrapper is sync, embeddings are async)
      for (const chunk of chunks) {
        const vec = await embed(`${title}: ${chunk}`);
        insertChunk.run(url, title, `[${title}] ${chunk}`, JSON.stringify(vec));
        totalChunks++;
      }

      console.log(`✔  ${chunks.length} chunks`);

      // Discover links — normalize trailing slash to avoid dupes
      const $ = cheerio.load(html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          let resolved = new URL(href, url).href.split('#')[0].split('?')[0];
          resolved = resolved.replace(/\/$/, '') || START_URL; // strip trailing slash
          if (resolved.startsWith(START_URL) && !visited.has(resolved))
            queue.push(resolved);
        } catch {}
      });

      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }

  console.log(`\n🎉 Done! ${pageCount} pages, ${totalChunks} chunks saved to sece.db`);
  db.close();
}

crawl().catch(console.error);
