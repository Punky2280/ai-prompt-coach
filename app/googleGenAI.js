// googleGenAI.js
// -------------------------------------------------------------------
// Tiny wrapper for the Google Generative Language REST API (v1beta)
// Works with API-KEY auth (no OAuth / service accounts needed).
// -------------------------------------------------------------------

const fetch =
  typeof global.fetch === 'function'
    ? global.fetch                         // Node 18+
    : (...args) => import('node-fetch').then(m => m.default(...args));

const API_KEY  = process.env.GEMINI_API_KEY;          // set in .env
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL    = 'gemini-2.0-flash';                  // change if needed

if (!API_KEY) {
  throw new Error('Missing GEMINI_API_KEY in environment variables');
}

/**
 * generateContent(prompt[, model]) → Promise<string>
 */
async function generateContent(prompt, model = MODEL) {
  const url = `${BASE_URL}/models/${model}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GenAI ${res.status} ${res.statusText}\n${errText}`);
  }

  const json = await res.json();
  return (
    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '⚠️  Empty response from Gemini'
  );
}

module.exports = { generateContent };
