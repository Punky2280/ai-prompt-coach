const express      = require('express');
const router       = express.Router();
const { promptsCol, useInMemoryFallback } = require('../lib/firestore');

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    
    if (useInMemoryFallback) {
      // Return empty array for in-memory fallback since we don't have persistence yet
      console.log('📋 Returning empty history (in-memory mode)');
      return res.json([]);
    }
    
    const snap  = await promptsCol
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) {
    console.error('History endpoint error:', err.message);
    // Return empty array instead of error for graceful degradation
    res.json([]);
  }
});

module.exports = router;
