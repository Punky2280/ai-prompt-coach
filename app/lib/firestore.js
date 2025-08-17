const { Firestore } = require('@google-cloud/firestore');

/*  Auto-auth:
      • In Cloud Shell / Cloud Run it auto-detects project & creds
      • Locally you can run  `gcloud auth application-default login`
*/

// Initialize with fallback
const initializeDb = () => {
  // For testing without credentials, use mock
  if (process.env.USE_MOCK_DB === 'true' || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('⚠️  Using mock Firestore for testing');
    const mockFirestore = require('./mockFirestore');
    return {
      db: mockFirestore.db,
      promptsCol: mockFirestore.promptsCol,
      workflowsCol: mockFirestore.workflowsCol,
      workflowRunsCol: mockFirestore.workflowRunsCol,
      workflowStepsCol: mockFirestore.workflowStepsCol,
      connectorsCol: mockFirestore.connectorsCol,
      credentialsCol: mockFirestore.credentialsCol
    };
  }

  // Use real Firestore
  console.log('✅ Using Google Firestore');
  const db = new Firestore();
  return {
    db,
    promptsCol: db.collection('prompts'),
    workflowsCol: db.collection('workflows'),
    workflowRunsCol: db.collection('workflow_runs'),
    workflowStepsCol: db.collection('workflow_steps'),
    connectorsCol: db.collection('connectors'),
    credentialsCol: db.collection('credentials')
  };
};

const { db, promptsCol, workflowsCol, workflowRunsCol, workflowStepsCol, connectorsCol, credentialsCol } = initializeDb();

module.exports = { 
  db, 
  promptsCol, 
  workflowsCol, 
  workflowRunsCol, 
  workflowStepsCol,
  connectorsCol,
  credentialsCol
};
