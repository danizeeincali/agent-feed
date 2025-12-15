/**
 * Simple Express server for testing API endpoints
 */

const express = require('express');
const dbSelector = require('./services/database-selector');

const app = express();
app.use(express.json());

/**
 * GET /api/agent-posts
 * Returns all posts from the database
 */
app.get('/api/agent-posts', async (req, res) => {
  try {
    const posts = await dbSelector.getAllPosts();
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/agent-posts/:id
 * Returns a single post by ID
 */
app.get('/api/agent-posts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const post = await dbSelector.getPostById(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/agent-posts
 * Creates a new post
 */
app.post('/api/agent-posts', async (req, res) => {
  try {
    const result = await dbSelector.createPost(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database on startup
dbSelector.initialize().catch(err => {
  console.error('Failed to initialize database:', err);
});

module.exports = app;
