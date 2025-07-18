const express = require('express');
const app = express();

const PORT = process.env.PORT || 8081;
const HOST = '0.0.0.0'; // Bind to all interfaces

app.get('/', (req, res) => {
  res.send('AI-Prompt-Learner backend is live!');
});

app.listen(PORT, HOST, () => {
  console.log(`✅ Server listening on http://${HOST}:${PORT}`);
});
