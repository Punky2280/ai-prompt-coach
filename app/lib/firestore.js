const { Firestore } = require('@google-cloud/firestore');

/*  Auto-auth:
      • In Cloud Shell / Cloud Run it auto-detects project & creds
      • Locally you can run  `gcloud auth application-default login`
*/

let db, promptsCol;
let useInMemoryFallback = false;
let inMemoryStore = [];

try {
  // Try to initialize Firestore
  db = new Firestore();
  promptsCol = db.collection('prompts');
  console.log('✅ Firestore initialized successfully');
} catch (error) {
  console.warn('⚠️  Firestore initialization failed, using in-memory storage:', error.message);
  useInMemoryFallback = true;
  
  // Create in-memory fallback
  promptsCol = {
    add: async (data) => {
      const id = Date.now().toString();
      const doc = { id, ...data };
      inMemoryStore.unshift(doc);
      console.log('📝 Stored in memory:', { id });
      return { id };
    },
    orderBy: () => ({
      limit: (limit) => ({
        get: async () => ({
          docs: inMemoryStore.slice(0, limit).map(doc => ({
            id: doc.id,
            data: () => ({ prompt: doc.prompt, answer: doc.answer, createdAt: doc.createdAt })
          }))
        })
      })
    })
  };
}

module.exports = { db, promptsCol, useInMemoryFallback };
