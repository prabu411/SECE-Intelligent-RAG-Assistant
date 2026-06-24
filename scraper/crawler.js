import axios from 'axios';
import * as cheerio from 'cheerio';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const START_URL = 'https://sece.ac.in';
const MAX_PAGES = 120;
const EMBED_BATCH_DELAY = 1200; // ms between embedding calls

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Inline schema so scraper is self-contained
const chunkSchema = new mongoose.Schema({
  website: String,
  url: String,
  title: String,
  content: String,
  embedding: [Number],
}, { timestamps: true });
const Chunk = mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', chunkSchema);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

function extractChunks(html, url) {
  const $ = cheerio.load(html);
  $('header,footer,nav,script,style,iframe,noscript,.menu,.navbar,.footer,.header,.breadcrumb').remove();

  const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || url;
  const segments = [];

  $('h1,h2,h3,h4,p,li,td,th,div.content,article,section').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 40) segments.push(text);
  });

  // Deduplicate
  const unique = [...new Set(segments)];

  // Chunk: ~500 chars each
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

  return { pageTitle, chunks };
}

async function crawl() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  // Clear old data
  await Chunk.deleteMany({ website: START_URL });
  console.log('🗑️  Cleared old chunks');

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
      console.log(`[${pageCount}/${MAX_PAGES}] Crawling: ${url}`);
      const { data: html } = await axios.get(url, {
        headers: { 'User-Agent': 'SECE-RAG-Crawler/2.0' },
        timeout: 12000,
      });

      const { pageTitle, chunks } = extractChunks(html, url);

      for (const chunk of chunks) {
        try {
          const embedding = await getEmbedding(`${pageTitle}: ${chunk}`);
          await Chunk.create({
            website: START_URL,
            url,
            title: pageTitle,
            content: `[${pageTitle}] ${chunk}`,
            embedding,
          });
          totalChunks++;
          await sleep(EMBED_BATCH_DELAY);
        } catch (e) {
          console.warn(`  ⚠️  Embed error: ${e.message}`);
        }
      }
      console.log(`  ✔  Saved ${chunks.length} chunks from "${pageTitle}"`);

      // Discover links
      const $ = cheerio.load(html);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const resolved = new URL(href, url).href.split('#')[0].split('?')[0];
          if (resolved.startsWith(START_URL) && !visited.has(resolved)) {
            queue.push(resolved);
          }
        } catch {}
      });

      await sleep(500);
    } catch (e) {
      console.error(`  ✗ Failed: ${url} — ${e.message}`);
    }
  }

  console.log(`\n🎉 Done! Crawled ${pageCount} pages, indexed ${totalChunks} chunks.`);
  await mongoose.disconnect();
}

crawl().catch(console.error);
