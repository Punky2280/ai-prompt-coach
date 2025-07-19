const express      = require('express');
const router       = express.Router();
const { promptsCol } = require('../lib/firestore');

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

module.exports = router;
