import express from 'express';
import { authenticate, requireAdmin } from './auth.js';
import WebsiteRequest from '../models/WebsiteRequest.js';
import { startScrapingJob } from '../services/scraperService.js';
import DocumentChunk from '../models/DocumentChunk.js';

const router = express.Router();

// Client: Request a new website
router.post('/client', authenticate, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const newRequest = await WebsiteRequest.create({
      clientUsername: req.user.username,
      url,
      status: 'pending'
    });
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client: Get my websites
router.get('/client', authenticate, async (req, res) => {
  try {
    const requests = await WebsiteRequest.find({ clientUsername: req.user.username });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all requests
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const requests = await WebsiteRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Approve request
router.post('/admin/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const request = await WebsiteRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'approved';
    await request.save();

    // Trigger scraper for this URL
    startScrapingJob(request.url);

    res.json({ message: 'Request approved and scraping started', request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get HTML Viewer Data
router.get('/admin/html-viewer', authenticate, requireAdmin, async (req, res) => {
  try {
    const { website } = req.query;
    if (!website) return res.status(400).json({ error: 'Website query param required' });

    const chunks = await DocumentChunk.find({ website }).select('url rawHtml').limit(20);
    res.json(chunks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
