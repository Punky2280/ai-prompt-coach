// routes/prompts.js  (CommonJS)
// ---------------------------------------------------------------
// POST /prompts
// Body: { prompt: string, model?: string, thinkingBudget?: number, enableRAG?: boolean }
// ---------------------------------------------------------------

const express   = require("express");
const router    = express.Router();
const { generateText } = require("../services/gemini");   // JS wrapper  
const { RAGPromptService } = require("../services/rag-prompt-service"); // RAG enhancement
const { promptsCol }   = require("../lib/firestore");     // your Firestore util

const ragPromptService = new RAGPromptService();

router.post("/", async (req, res) => {
  try {
    const { prompt = "", model, thinkingBudget, enableRAG = false } = req.body;
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt)
      return res.status(400).json({ error: "prompt missing" });

    let answer;
    let metadata = {};

    // Use RAG if enabled and available
    if (enableRAG && process.env.RAG_ENABLED === 'true') {
      try {
        const ragResult = await ragPromptService.processPrompt(cleanPrompt, {
          enableRAG: true,
          model,
          temperature: thinkingBudget ? 0.9 : 0.7, // Higher temp for thinking budget
          maxOutputTokens: 1024
        });
        
        answer = ragResult.answer;
        metadata = ragResult.metadata;
      } catch (ragError) {
        console.error("RAG processing failed, falling back to standard generation:", ragError);
        // Fallback to standard generation
        answer = await generateText(cleanPrompt, { model, thinkingBudget });
        metadata = { ragUsed: false, fallback: true, ragError: ragError.message };
      }
    } else {
      // Standard generation without RAG
      answer = await generateText(cleanPrompt, { model, thinkingBudget });
      metadata = { ragUsed: false };
    }

    // Persist to Firestore with metadata
    await promptsCol.add({
      prompt: cleanPrompt,
      answer,
      metadata,
      createdAt: new Date(),
    });

    res.json({ 
      success: true,
      data: {
        answer,
        metadata
      }
    });
  } catch (err) {
    console.error("POST /prompts →", err);
    res.status(500).json({ 
      success: false,
      error: "failed" 
    });
  }
});

module.exports = router;
