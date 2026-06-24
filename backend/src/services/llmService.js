import { GoogleGenerativeAI } from '@google/generative-ai';
import DocumentChunk from '../models/DocumentChunk.js';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}

async function embed(text) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function retrieveAndAnswer(query) {
  // 1. Embed the query
  const queryVec = await embed(query);

  // 2. Load all chunks with embeddings
  const chunks = await DocumentChunk.find(
    { website: 'https://sece.ac.in', 'embedding.0': { $exists: true } },
    { content: 1, embedding: 1 }
  ).lean();

  if (!chunks.length) {
    return "The SECE knowledge base is empty. Please run the scraper first (`cd scraper && npm start`).";
  }

  // 3. Rank by cosine similarity, pick top 8
  const ranked = chunks
    .map(c => ({ content: c.content, score: cosineSim(queryVec, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(c => c.content);

  // 4. Generate answer from context
  const prompt = `You are the official AI assistant for Sri Eshwar College of Engineering (SECE).
Answer ONLY from the context below. Be clear, helpful, and use bullet points for lists.
If the answer is not in the context, say: "I couldn't find that on the official SECE website. Please visit sece.ac.in directly."
Never fabricate information.

CONTEXT:
${ranked.join('\n\n---\n\n')}

QUESTION: ${query}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
