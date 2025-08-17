const express      = require('express');
const router       = express.Router();
const { promptsCol } = require('../lib/firestore');

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    
    // Try to get data from Firestore
    const snap = await promptsCol
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) {
    console.error('Firestore error:', err.message);
    
    // Return empty array if Firestore fails (rather than 500 error)
    // This prevents breaking the frontend when auth is not properly configured
    console.warn('Returning empty history due to Firestore auth issues');
    res.json([]);
  }
});

module.exports = router;
