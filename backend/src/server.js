import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRouter);
app.get('/api/status', (_, res) => res.json({ status: 'ok', db: 'SQLite (local)', llm: 'Groq llama3-70b' }));

app.listen(PORT, () => console.log(`🚀 SECE RAG server running on http://localhost:${PORT}`));
