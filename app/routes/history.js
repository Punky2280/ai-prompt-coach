import express from 'express';
import { promptsCol } from '../lib/firestore.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const snap  = await promptsCol
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

export default router;
