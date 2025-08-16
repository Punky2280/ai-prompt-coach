// routes/prompts.js  (CommonJS)
// ---------------------------------------------------------------
// POST /prompts
// Body: { prompt: string, options?: object }
// ---------------------------------------------------------------

const express   = require("express");
const router    = express.Router();
const { processPrompt, getRoutingStats } = require("../services/model-router-service");
const { promptsCol }   = require("../lib/firestore");     // your Firestore util

router.post("/", async (req, res) => {
  try {
    const { prompt = "", options = {} } = req.body;
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt)
      return res.status(400).json({ error: "prompt missing" });

    // Process with enhanced routing system
    const result = await processPrompt(cleanPrompt, {
      ...options,
      debug: req.query.debug === 'true' // Allow debug mode via query param
    });

    // Persist to Firestore with routing information
    await promptsCol.add({
      prompt: cleanPrompt,
      answer: result.answer,
      routing_info: result.routing_info,
      createdAt: new Date(),
    });

    res.json(result);
  } catch (err) {
    console.error("POST /prompts →", err);
    res.status(500).json({ error: "failed" });
  }
});

// GET /stats - Get routing statistics and model health
router.get("/stats", async (req, res) => {
  try {
    const stats = getRoutingStats();
    res.json(stats);
  } catch (err) {
    console.error("GET /prompts/stats →", err);
    res.status(500).json({ error: "failed to get stats" });
  }
});

module.exports = router;
