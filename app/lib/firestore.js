const { Firestore } = require('@google-cloud/firestore');

/*  Auto-auth:
      • In Cloud Shell / Cloud Run it auto-detects project & creds
      • Locally you can run  `gcloud auth application-default login`
*/
const db         = new Firestore();
const promptsCol = db.collection('prompts');

module.exports = { db, promptsCol };
