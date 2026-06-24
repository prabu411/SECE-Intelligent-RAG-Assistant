import express from 'express';
import { retrieveAndAnswer } from '../services/ragService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'Query is required' });

  try {
    const response = await retrieveAndAnswer(query.trim());
    res.json({ response });
  } catch (err) {
    console.error('[Chat Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
