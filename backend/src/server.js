import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRouter);
app.get('/api/status', (_, res) => res.json({ status: 'ok' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => console.error('MongoDB error:', err));
