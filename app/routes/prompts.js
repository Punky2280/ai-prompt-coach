// routes/prompts.js  (ES6 modules)
// ---------------------------------------------------------------
// POST /prompts
// Body: { prompt: string, model?: string, thinkingBudget?: number }
// ---------------------------------------------------------------

import express from "express";
import { generateText } from "../services/gemini.js";   // JS wrapper
import { promptsCol } from "../lib/firestore.js";       // your Firestore util

const router = express.Router();

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

export default router;
