const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mock API endpoints
app.get('/api/posts', (req, res) => {
  res.json([
    { id: 1, content: 'Welcome to the feed!', author: 'System', timestamp: new Date().toISOString() },
    { id: 2, content: 'Testing the posting interface', author: 'Test User', timestamp: new Date().toISOString() }
  ]);
});

app.post('/api/posts', (req, res) => {
  const { content, author } = req.body;
  res.json({
    id: Date.now(),
    content,
    author: author || 'Anonymous',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});