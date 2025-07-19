// routes/prompts.js  (CommonJS)
// ---------------------------------------------------------------
// POST /prompts
// Body: { prompt: string, model?: string, thinkingBudget?: number }
// ---------------------------------------------------------------

const express   = require("express");
const router    = express.Router();
const { generateText } = require("../services/gemini");   // JS wrapper
const { promptsCol }   = require("../lib/firestore");     // your Firestore util

router.post("/", async (req, res) => {
  try {
    const { prompt = "", model, thinkingBudget } = req.body;
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt)
      return res.status(400).json({ error: "prompt missing" });

    // Forward optional knobs to the wrapper if you like
    const answer = await generateText(cleanPrompt, { model, thinkingBudget });

    // Persist to Firestore
    await promptsCol.add({
      prompt: cleanPrompt,
      answer,
      createdAt: new Date(),          // nicer in the console / query
    });

    res.json({ answer });
  } catch (err) {
    console.error("POST /prompts →", err);
    res.status(500).json({ error: "failed" });
  }
});

module.exports = router;
