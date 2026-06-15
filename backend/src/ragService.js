const { semanticChunk } = require("./chunker");
const { InMemoryVectorStore } = require("./vectorStore");
const { crawlSite } = require("./scraper");

const NOT_FOUND_MESSAGE =
  "I could not find this information in the indexed Sri Eshwar College official records.";

const STOP_WORDS = new Set([
  "the",
  "is",
  "a",
  "an",
  "in",
  "on",
  "of",
  "for",
  "to",
  "and",
  "has",
  "have",
  "any",
  "done",
  "what",
  "who",
  "where"
]);

function significantTerms(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 3 && !STOP_WORDS.has(term));
}

class RagService {
  constructor({ vectorStore = new InMemoryVectorStore(), fetchImpl = fetch } = {}) {
    this.vectorStore = vectorStore;
    this.fetchImpl = fetchImpl;
  }

  async reindexWebsite(startUrl, maxPages = 10) {
    const pages = await crawlSite(startUrl, maxPages, this.fetchImpl);
    this.vectorStore.clear();

    for (const page of pages) {
      const chunks = semanticChunk(page.text, { sourceUrl: page.url });
      this.vectorStore.addDocuments(chunks);
    }

    return {
      pagesIndexed: pages.length,
      chunksIndexed: this.vectorStore.documents.length
    };
  }

  ask(question, topK = 3) {
    const queryTerms = significantTerms(question);
    const matches = this.vectorStore.search(question, topK);
    const highConfidence = matches.filter((item) => {
      if (item.score < 0.35) return false;
      const chunkTerms = new Set(significantTerms(item.text));
      return queryTerms.some((term) => chunkTerms.has(term));
    });

    if (!highConfidence.length) {
      return {
        answer: NOT_FOUND_MESSAGE,
        evidence: []
      };
    }

    const answer = highConfidence.map((item) => item.text).join(" ").slice(0, 600);

    return {
      answer,
      evidence: highConfidence.map((item) => ({
        sourceUrl: item.metadata.sourceUrl,
        score: Number(item.score.toFixed(3))
      }))
    };
  }
}

module.exports = { RagService, NOT_FOUND_MESSAGE };
