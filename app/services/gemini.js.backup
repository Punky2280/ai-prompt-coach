// services/gemini.js
// ------------------------------------------------------------------
//  Gemini wrapper – NodeJS (CommonJS)
//  npm i @google/generative-ai
//  export GEMINI_API_KEY=AIzaSy*********************************
// ------------------------------------------------------------------

require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// ➊ Create the client ------------------------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Default model; change to “gemini-pro-vision” etc. if you like
const DEFAULT_MODEL = "gemini-1.5-flash";

/**
 * Generate text with Gemini
 *
 * @param {string} prompt  – user prompt
 * @param {{
 *   model?: string,
 *   temperature?: number,
 *   maxOutputTokens?: number
 * }} [opts]
 * @returns {Promise<string>}
 */
async function generateText(prompt, opts = {}) {
  const {
    model           = DEFAULT_MODEL,
    temperature     = 0.7,
    maxOutputTokens = 1024,
  } = opts;

  try {
    // ➋ Pick the model ---------------------------------------------
    const gModel = genAI.getGenerativeModel({ model });

    // ➌ Build the request ------------------------------------------
    // Contents must be an array of {role, parts:[{text:""}]}
    const request = {
      contents: [
        { role: "user", parts: [{ text: prompt }] },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    };

    // ➍ Call Gemini -------------------------------------------------
    const result   = await gModel.generateContent(request);
    const response = result.response;
    const text     = response.text();

    return text || "No response from Gemini";
  } catch (err) {
    console.error("Gemini error →", err);
    return `Error: ${err.message ?? err}`;
  }
}

module.exports = { generateText };
