import express from 'express';
import bcrypt from 'bcrypt';
import Config from '../models/Config.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from './auth.js';
import { startScrapingJob } from '../services/scraperService.js';

const router = express.Router();

// Get current target website
router.get('/config/url', authenticate, requireAdmin, async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'TARGET_WEBSITE' });
    res.json({ url: config ? config.value : 'https://www.sece.ac.in' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update target website (requires password re-verification)
router.post('/config/url', authenticate, requireAdmin, async (req, res) => {
  try {
    const { newUrl, password } = req.body;
    if (!newUrl || !password) return res.status(400).json({ error: 'Missing newUrl or password' });

    // Verify admin password
    const adminUser = await User.findById(req.user.id);
    if (!adminUser) return res.status(404).json({ error: 'Admin user not found' });

    const match = await bcrypt.compare(password, adminUser.password);
    if (!match) return res.status(401).json({ error: 'Incorrect admin password' });

    // Update or create config
    await Config.findOneAndUpdate(
      { key: 'TARGET_WEBSITE' },
      { value: newUrl },
      { upsert: true, new: true }
    );

    // Trigger background scraping job for the new URL
    startScrapingJob(newUrl);

    res.json({ message: 'Target website updated and scraping job started', url: newUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
