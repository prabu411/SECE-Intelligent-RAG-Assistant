const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { RagService } = require("./ragService");
const { InMemoryChatStore, MongoChatStore } = require("./chatStore");

const app = express();
const ragService = new RagService();
let chatStore = new InMemoryChatStore();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;

  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB || "sece_rag";
  chatStore = new MongoChatStore(client.db(dbName));
}

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.post("/api/index", async (req, res) => {
  const { startUrl, maxPages = 10 } = req.body || {};

  if (!startUrl) {
    res.status(400).json({ error: "startUrl is required" });
    return;
  }

  const result = await ragService.reindexWebsite(startUrl, Number(maxPages));
  res.json(result);
});

app.post("/api/query", async (req, res) => {
  const { question, topK = 3 } = req.body || {};

  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "question is required" });
    return;
  }

  const result = ragService.ask(question, Number(topK));
  await chatStore.add({ question, answer: result.answer, evidence: result.evidence });
  res.json(result);
});

app.get("/api/history", async (req, res) => {
  const history = await chatStore.list(Number(req.query.limit || 25));
  res.json(history);
});

async function start() {
  await connectMongo();
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => {
    console.log(`SECE RAG backend listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Failed to start backend", error);
    process.exit(1);
  });
}

module.exports = { app, start };
