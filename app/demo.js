// demo.js
import "dotenv/config";               // loads GEMINI_API_KEY
import { generateContent } from './googleGenAI.js';

(async () => {
  try {
    const reply = await generateContent('Explain how AI works in a few words');
    console.log('\nGemini says →', reply, '\n');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
