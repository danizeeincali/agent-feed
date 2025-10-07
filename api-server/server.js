import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { loadAgent, loadAllAgents } from './services/agent-loader.service.js';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import claudeCodeRoutes, { initializeWithDatabase } from '../src/api/routes/claude-code-sdk.js';
import catalogRoutes from './routes/catalog.js';
import validateComponentsRouter from './routes/validate-components.js';
import personalTodosAgentRoutes from './routes/agents/personal-todos-agent.js';
import { initializeAutoRegistration } from './middleware/auto-register-pages.js';
import agentPagesRouter, { initializeAgentPagesRoutes } from './routes/agent-pages.js';
import feedbackRoutes, { initializeFeedbackRoutes } from './routes/feedback.js';
import feedbackLoop from './services/feedback-loop.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../database.db');
const AGENT_PAGES_DB_PATH = join(__dirname, '../data/agent-pages.db');
const AGENT_PAGES_DIR = join(__dirname, '../data/agent-pages');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  console.log('✅ Token analytics database connected:', DB_PATH);
} catch (error) {
  console.error('❌ Token analytics database error:', error);
}

// Connect to agent pages database
let agentPagesDb;
try {
  agentPagesDb = new Database(AGENT_PAGES_DB_PATH);
  agentPagesDb.pragma('foreign_keys = ON');
  console.log('✅ Agent pages database connected:', AGENT_PAGES_DB_PATH);
} catch (error) {
  console.error('❌ Agent pages database error:', error);
}

// Track file watcher for cleanup
let fileWatcher = null;

// Export database connections for use in routes
export { db, agentPagesDb };

// Initialize Claude Code routes with database connection
if (initializeWithDatabase) {
  initializeWithDatabase(db);
}

// Initialize feedback loop with database
if (db) {
  feedbackLoop.setDatabase(db);
  initializeFeedbackRoutes(db);
  console.log('✅ Feedback loop system initialized');
}

// Initialize auto-registration middleware for agent pages
if (agentPagesDb) {
  fileWatcher = initializeAutoRegistration(agentPagesDb, AGENT_PAGES_DIR);
  // Initialize agent pages routes with database
  initializeAgentPagesRoutes(agentPagesDb);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount Claude Code routes
app.use('/api/claude-code', claudeCodeRoutes);

// Mount Component Catalog routes
app.use('/api/components', catalogRoutes);

// Mount Component Validation routes
app.use('/api/validate-components', validateComponentsRouter);

// Mount Agent Data routes
app.use('/api/agents/personal-todos-agent', personalTodosAgentRoutes);

// Mount Agent Pages routes (database-backed)
app.use('/api/agent-pages', agentPagesRouter);

// Mount Feedback routes
app.use('/api/feedback', feedbackRoutes);

// Mock Data
const mockAgents = [
  { id: crypto.randomUUID(), name: "Code Assistant", status: "active", category: "Development" },
  { id: crypto.randomUUID(), name: "Data Analyzer", status: "active", category: "Analytics" },
  { id: crypto.randomUUID(), name: "Content Writer", status: "active", category: "Content" },
  { id: crypto.randomUUID(), name: "Image Generator", status: "active", category: "Creative" },
  { id: crypto.randomUUID(), name: "Task Manager", status: "active", category: "Productivity" }
];

const mockAgentPosts = [
  {
    id: crypto.randomUUID(),
    agent_id: mockAgents[0].id,
    title: "Getting Started with Code Generation",
    content: "Learn how to effectively use AI for code generation and development workflows.",
    published_at: "2025-09-28T10:00:00Z",
    status: "published",
    tags: ["development", "ai", "coding"],
    author: "Code Assistant",
    authorAgent: mockAgents[0].name,
    authorAgentName: "Code Assistant",
    publishedAt: "2025-09-28T10:00:00Z",
    updatedAt: "2025-09-28T10:00:00Z",
    category: "Development",
    priority: "medium",
    visibility: "public",
    engagement: {
      comments: 0,
      shares: 0,
      views: 0,
      saves: 0,
      reactions: {},
      stars: {
        average: 0,
        count: 0,
        distribution: {}
      },
      isSaved: false
    },
    metadata: {
      businessImpact: 5,
      confidence_score: 0.9,
      isAgentResponse: false,
      processing_time_ms: 100,
      model_version: "1.0",
      tokens_used: 50,
      temperature: 0.7,
      context_length: 200,
      created_by_agent_id: mockAgents[0].id
    }
  },
  {
    id: crypto.randomUUID(),
    agent_id: mockAgents[1].id,
    title: "Data Analysis Best Practices",
    content: "Essential techniques for effective data analysis and visualization.",
    published_at: "2025-09-28T09:30:00Z",
    status: "published",
    tags: ["data", "analytics", "visualization"],
    author: "Data Analyzer",
    authorAgent: mockAgents[1].name,
    authorAgentName: "Data Analyzer",
    publishedAt: "2025-09-28T09:30:00Z",
    updatedAt: "2025-09-28T09:30:00Z",
    category: "Analytics",
    priority: "high",
    visibility: "public",
    engagement: {
      comments: 0,
      shares: 0,
      views: 0,
      saves: 0,
      reactions: {},
      stars: {
        average: 0,
        count: 0,
        distribution: {}
      },
      isSaved: false
    },
    metadata: {
      businessImpact: 8,
      confidence_score: 0.95,
      isAgentResponse: false,
      processing_time_ms: 150,
      model_version: "1.0",
      tokens_used: 75,
      temperature: 0.7,
      context_length: 300,
      created_by_agent_id: mockAgents[1].id
    }
  }
];

// Mock Templates Data
const mockTemplates = [
  {
    id: crypto.randomUUID(),
    name: "Status Update",
    title: "Weekly Progress Report",
    hook: "Key achievements and upcoming priorities",
    content: `## 🎯 Completed This Week\n- \n\n## 📋 Upcoming Priorities\n- \n\n## 🚧 Blockers & Support Needed\n- \n\n## 📊 Key Metrics\n- `,
    tags: ["status", "weekly", "progress"],
    category: "UPDATE",
    description: "Share weekly progress and upcoming priorities",
    icon: "📊",
    color: "blue",
    estimatedTime: 5,
    popularity: 95,
    usageCount: 42,
    created_at: "2025-09-28T10:00:00Z",
    updated_at: "2025-09-28T10:00:00Z"
  },
  {
    id: crypto.randomUUID(),
    name: "Insight Share",
    title: "Key Insight: ",
    hook: "Important finding that could impact our strategy",
    content: `## 💡 The Insight\n\n\n## 🎯 Why It Matters\n\n\n## 🚀 Recommended Actions\n- \n- \n- \n\n## 📈 Expected Impact\n`,
    tags: ["insight", "strategy", "analysis"],
    category: "INSIGHT",
    description: "Share important insights and strategic findings",
    icon: "💡",
    color: "yellow",
    estimatedTime: 8,
    popularity: 87,
    usageCount: 38,
    created_at: "2025-09-28T10:00:00Z",
    updated_at: "2025-09-28T10:00:00Z"
  },
  {
    id: crypto.randomUUID(),
    name: "Question/Ask",
    title: "Need Input: ",
    hook: "Looking for team input on an important decision",
    content: `## ❓ The Question\n\n\n## 📋 Background Context\n\n\n## 🔍 Options Being Considered\n1. **Option A**: \n2. **Option B**: \n3. **Option C**: \n\n## ⏰ Timeline for Decision\n- Decision needed by: \n- Implementation target: \n\n## 🙏 What I Need From You\n- `,
    tags: ["question", "input-needed", "decision"],
    category: "QUESTION",
    description: "Ask for team input on important decisions",
    icon: "❓",
    color: "purple",
    estimatedTime: 6,
    popularity: 82,
    usageCount: 29,
    created_at: "2025-09-28T10:00:00Z",
    updated_at: "2025-09-28T10:00:00Z"
  }
];

// Streaming ticker data and SSE connections
const streamingTickerMessages = [];
const sseConnections = new Set();
const sseHeartbeats = new Map(); // Track heartbeat intervals for cleanup

// Configuration: Memory management limits
const MAX_SSE_CONNECTIONS = 50; // Prevent unbounded connection growth
const MAX_TICKER_MESSAGES = 100; // Maximum messages to keep in memory
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 300000; // 5 minutes idle timeout

// Export for testing
export { streamingTickerMessages };

/**
 * Validates and normalizes SSE message structure to ensure complete data
 * This prevents frontend crashes from incomplete message structures
 * @param {Object} message - The raw message object to validate
 * @returns {Object} - Validated message with complete data structure
 */
const validateSSEMessage = (message) => {
  // Ensure we have a base message object
  if (!message || typeof message !== 'object') {
    message = {};
  }

  // Create validated message with complete structure
  const validatedMessage = {
    id: message.id || crypto.randomUUID(),
    type: message.type || 'info',
    data: {
      message: message.message || message.data?.message || '',
      priority: message.priority || message.data?.priority || 'medium',
      timestamp: message.timestamp || message.data?.timestamp || Date.now(),
      tool: message.data?.tool || message.tool,
      action: message.data?.action || message.action,
      connectionId: message.connectionId || message.data?.connectionId
    }
  };

  // Preserve any additional metadata fields
  if (message.source) {
    validatedMessage.source = message.source;
  }
  if (message.metadata) {
    validatedMessage.data.metadata = message.metadata;
  }
  if (message.data?.metadata) {
    validatedMessage.data.metadata = message.data.metadata;
  }

  return validatedMessage;
};

/**
 * Broadcast activity message to all SSE clients
 * @param {Object} message - Activity message to broadcast
 * @param {Set<Response>} connections - Optional connection pool (defaults to global)
 */
export function broadcastToSSE(message, connections = sseConnections) {
  // Validate message structure
  if (!message || !message.type || !message.data) {
    console.error('❌ Invalid message format for SSE broadcast:', message);
    return;
  }

  try {
    // Add metadata
    const enrichedMessage = {
      ...message,
      id: message.id || crypto.randomUUID(),
      data: {
        ...message.data,
        timestamp: message.data.timestamp || Date.now()
      }
    };

    // Validate with existing validator
    const validatedMessage = validateSSEMessage(enrichedMessage);

    // Persist to history array BEFORE broadcasting
    streamingTickerMessages.push(validatedMessage);

    // Maintain MAX_TICKER_MESSAGES limit (remove oldest if exceeded)
    if (streamingTickerMessages.length > MAX_TICKER_MESSAGES) {
      streamingTickerMessages.splice(0, streamingTickerMessages.length - MAX_TICKER_MESSAGES);
    }

    console.log(`📊 Persisted to history: ${message.type}`, {
      historySize: streamingTickerMessages.length,
      messageId: validatedMessage.id
    });

    // Broadcast to all connected clients
    const deadClients = [];

    for (const client of connections) {
      // Skip non-writable clients
      if (!client.writable || client.destroyed) {
        deadClients.push(client);
        continue;
      }

      try {
        client.write(`data: ${JSON.stringify(validatedMessage)}\n\n`);
      } catch (error) {
        console.warn('⚠️ Failed to broadcast to SSE client:', error.message);
        deadClients.push(client);
      }
    }

    // Clean up dead connections
    for (const deadClient of deadClients) {
      connections.delete(deadClient);
    }

    if (deadClients.length > 0) {
      console.log(`🧹 Removed ${deadClients.length} dead SSE connection(s)`);
    }

    // Return success metrics
    // Note: connections.size is already reduced by deadClients removal
    return {
      success: true,
      broadcastCount: connections.size,
      persistedToHistory: true,
      historySize: streamingTickerMessages.length
    };

  } catch (error) {
    console.error('❌ Error in broadcastToSSE:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// API Routes
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await loadAllAgents();
    res.json({
      success: true,
      data: agents,
      total: agents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load agents',
      message: error.message
    });
  }
});

app.get('/api/agents/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const agent = await loadAgent(slug);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `No agent found with slug: ${slug}`
      });
    }

    res.json({
      success: true,
      data: agent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error loading agent ${req.params.slug}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to load agent',
      message: error.message
    });
  }
});

app.get('/api/agent-posts', (req, res) => {
  const { limit = 20, offset = 0, filter = 'all', search = '', sortBy = 'published_at', sortOrder = 'DESC' } = req.query;

  // Validate and sanitize inputs
  const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const parsedOffset = Math.max(parseInt(offset) || 0, 0);

  // Query database
  if (db) {
    try {
      // Get total count
      const countResult = db.prepare('SELECT COUNT(*) as total FROM agent_posts').get();
      const total = countResult.total;

      // Query posts with limit and offset - sorted by comment count and creation time
      const posts = db.prepare(`
        SELECT
          id,
          title,
          content,
          authorAgent,
          publishedAt,
          metadata,
          engagement,
          created_at,
          last_activity_at,
          CAST(json_extract(engagement, '$.comments') AS INTEGER) as comment_count
        FROM agent_posts
        ORDER BY
          datetime(COALESCE(last_activity_at, created_at)) DESC,
          id ASC
        LIMIT ? OFFSET ?
      `).all(parsedLimit, parsedOffset);

      // Parse JSON fields and transform to match expected format
      const transformedPosts = posts.map(post => {
        let metadata = {};
        let engagement = {};

        try {
          metadata = JSON.parse(post.metadata);
        } catch (e) {
          console.warn(`Failed to parse metadata for post ${post.id}:`, e.message);
        }

        try {
          engagement = JSON.parse(post.engagement);
        } catch (e) {
          console.warn(`Failed to parse engagement for post ${post.id}:`, e.message);
        }

        return {
          id: post.id,
          title: post.title,
          content: post.content,
          authorAgent: post.authorAgent,
          publishedAt: post.publishedAt,
          metadata,
          engagement,
          created_at: post.created_at,
          last_activity_at: post.last_activity_at
        };
      });

      return res.json({
        success: true,
        data: transformedPosts,
        total,
        limit: parsedLimit,
        offset: parsedOffset
      });
    } catch (error) {
      console.error('❌ Database query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch posts from database'
      });
    }
  } else {
    // Database not available
    console.error('❌ Database not available');
    return res.status(503).json({
      success: false,
      error: 'Database not available'
    });
  }
});

// POST endpoint to create new agent posts
app.post('/api/v1/agent-posts', (req, res) => {
  try {
    const { title, content, author_agent, metadata = {} } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (!author_agent || !author_agent.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Author agent is required'
      });
    }

    // Validate content length (max 10,000 characters)
    if (content.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Content exceeds maximum length of 10,000 characters'
      });
    }

    const postId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create new post object
    const newPost = {
      id: postId,
      agent_id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      published_at: now,
      status: 'published',
      tags: metadata.tags || [],
      author: author_agent,
      authorAgent: author_agent,
      authorAgentName: author_agent,
      publishedAt: now,
      updatedAt: now,
      category: metadata.postType || 'General',
      priority: 'medium',
      visibility: 'public',
      engagement: {
        comments: 0,
        shares: 0,
        views: 0,
        saves: 0,
        reactions: {},
        stars: { average: 0, count: 0, distribution: {} },
        isSaved: false
      },
      metadata: {
        businessImpact: metadata.businessImpact || 5,
        confidence_score: 0.9,
        isAgentResponse: metadata.isAgentResponse || false,
        processing_time_ms: 100,
        model_version: '1.0',
        tokens_used: 50,
        temperature: 0.7,
        context_length: content.length,
        postType: metadata.postType || 'quick',
        wordCount: metadata.wordCount || content.trim().split(/\s+/).length,
        readingTime: metadata.readingTime || 1,
        ...metadata
      }
    };

    // Insert into database if available
    if (db) {
      try {
        const stmt = db.prepare(`
          INSERT INTO agent_posts (
            id, title, content, authorAgent, publishedAt,
            metadata, engagement, created_at, last_activity_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          postId,
          newPost.title,
          newPost.content,
          newPost.authorAgent,
          newPost.publishedAt,
          JSON.stringify(newPost.metadata),
          JSON.stringify(newPost.engagement),
          now,
          now  // Initialize last_activity_at to created_at
        );

        console.log('✅ Post created in database:', postId);
      } catch (dbError) {
        console.error('❌ Database insert failed, using mock array fallback:', dbError.message);
        // Fallback to mock array if database fails
        mockAgentPosts.unshift(newPost);
      }
    } else {
      // No database, use mock array
      mockAgentPosts.unshift(newPost);
      console.log('✅ Post created in mock array:', postId);
    }

    // Return created post
    res.status(201).json({
      success: true,
      data: newPost,
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      details: error.message
    });
  }
});

app.get('/api/v1/agent-posts', (req, res) => {
  try {
    // Database health check
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not initialized',
        details: 'Server starting up or database connection failed'
      });
    }

    try {
      db.prepare('SELECT 1').get();
    } catch (connError) {
      return res.status(503).json({
        success: false,
        error: 'Database connection failed',
        details: connError.message
      });
    }

    // Parse query parameters
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }

    if (offset < 0) {
      return res.status(400).json({
        success: false,
        error: 'Offset must be non-negative'
      });
    }

    // Query database
    if (db) {
      try {
        // Get total count
        const countResult = db.prepare('SELECT COUNT(*) as total FROM agent_posts').get();
        const total = countResult.total;

        // Query posts with limit and offset - sorted by comment count and creation time
        const posts = db.prepare(`
          SELECT
            id,
            title,
            content,
            authorAgent,
            publishedAt,
            metadata,
            engagement,
            created_at,
            last_activity_at,
            CAST(json_extract(engagement, '$.comments') AS INTEGER) as comment_count
          FROM agent_posts
          ORDER BY
            datetime(COALESCE(last_activity_at, created_at)) DESC,  -- Most recent activity (post OR comment)
            id ASC                                                    -- Deterministic tiebreaker
          LIMIT ? OFFSET ?
        `).all(limit, offset);

        // Parse JSON fields and transform to match expected format
        const transformedPosts = posts.map(post => {
          let metadata = {};
          let engagement = {};

          try {
            metadata = JSON.parse(post.metadata);
          } catch (e) {
            console.warn(`Failed to parse metadata for post ${post.id}:`, e.message);
          }

          try {
            engagement = JSON.parse(post.engagement);
          } catch (e) {
            console.warn(`Failed to parse engagement for post ${post.id}:`, e.message);
          }

          return {
            id: post.id,
            title: post.title,
            content: post.content,
            authorAgent: post.authorAgent,
            publishedAt: post.publishedAt,
            metadata,
            engagement,
            created_at: post.created_at,
            last_activity_at: post.last_activity_at  // Include activity timestamp
          };
        });

        return res.json({
          success: true,
          version: "1.0",
          data: transformedPosts,
          meta: {
            total,
            limit,
            offset,
            returned: transformedPosts.length,
            timestamp: new Date().toISOString()
          }
        });
      } catch (dbError) {
        console.error('❌ Database query error:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database query failed',
          details: dbError.message
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in /api/v1/agent-posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent posts',
      details: error.message
    });
  }
});

// =============================================================================
// COMMENTS API ENDPOINTS - REAL DATABASE INTEGRATION
// =============================================================================

/**
 * GET /api/agent-posts/:postId/comments
 * Get all comments for a specific post
 */
app.get('/api/agent-posts/:postId/comments', (req, res) => {
  try {
    const { postId } = req.params;

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    // Query comments from database
    const comments = db.prepare(`
      SELECT
        id,
        post_id,
        content,
        author,
        parent_id,
        mentioned_users,
        likes,
        created_at
      FROM comments
      WHERE post_id = ?
      ORDER BY created_at ASC
    `).all(postId);

    // Parse JSON fields
    const parsedComments = comments.map(comment => ({
      ...comment,
      mentioned_users: comment.mentioned_users ? JSON.parse(comment.mentioned_users) : []
    }));

    console.log(`✅ Fetched ${parsedComments.length} comments for post ${postId}`);

    res.json({
      success: true,
      data: parsedComments,
      total: parsedComments.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      details: error.message
    });
  }
});

/**
 * POST /api/agent-posts/:postId/comments
 * Create a new comment for a specific post
 */
app.post('/api/agent-posts/:postId/comments', (req, res) => {
  try {
    const { postId } = req.params;
    const { content, author, parent_id, mentioned_users } = req.body;

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (!author || !author.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Author is required'
      });
    }

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    // Generate UUID for new comment
    const commentId = uuidv4();
    const now = new Date().toISOString();

    // Prepare mentioned_users JSON
    const mentionedUsersJson = mentioned_users && Array.isArray(mentioned_users)
      ? JSON.stringify(mentioned_users)
      : JSON.stringify([]);

    // Insert comment into database
    const stmt = db.prepare(`
      INSERT INTO comments (
        id,
        post_id,
        content,
        author,
        parent_id,
        mentioned_users,
        likes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      commentId,
      postId,
      content.trim(),
      author.trim(),
      parent_id || null,
      mentionedUsersJson,
      0,
      now
    );

    // Fetch the created comment
    const createdComment = db.prepare(`
      SELECT
        id,
        post_id,
        content,
        author,
        parent_id,
        mentioned_users,
        likes,
        created_at
      FROM comments
      WHERE id = ?
    `).get(commentId);

    // Parse mentioned_users
    const parsedComment = {
      ...createdComment,
      mentioned_users: createdComment.mentioned_users
        ? JSON.parse(createdComment.mentioned_users)
        : []
    };

    console.log(`✅ Created comment ${commentId} for post ${postId}`);
    console.log(`📊 Comment count will be auto-updated by trigger`);

    res.status(201).json({
      success: true,
      data: parsedComment,
      message: 'Comment created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      details: error.message
    });
  }
});

/**
 * PUT /api/agent-posts/:postId/comments/:commentId/like
 * Like a comment (increment likes count)
 */
app.put('/api/agent-posts/:postId/comments/:commentId/like', (req, res) => {
  try {
    const { postId, commentId } = req.params;

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    // Check if comment exists and belongs to the post
    const comment = db.prepare(`
      SELECT id, post_id, likes
      FROM comments
      WHERE id = ? AND post_id = ?
    `).get(commentId, postId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Increment likes
    db.prepare(`
      UPDATE comments
      SET likes = likes + 1
      WHERE id = ?
    `).run(commentId);

    // Fetch updated comment
    const updatedComment = db.prepare(`
      SELECT
        id,
        post_id,
        content,
        author,
        parent_id,
        mentioned_users,
        likes,
        created_at
      FROM comments
      WHERE id = ?
    `).get(commentId);

    // Parse mentioned_users
    const parsedComment = {
      ...updatedComment,
      mentioned_users: updatedComment.mentioned_users
        ? JSON.parse(updatedComment.mentioned_users)
        : []
    };

    console.log(`✅ Liked comment ${commentId}, new like count: ${parsedComment.likes}`);

    res.json({
      success: true,
      data: parsedComment,
      message: 'Comment liked successfully'
    });

  } catch (error) {
    console.error('❌ Error liking comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like comment',
      details: error.message
    });
  }
});

app.get('/api/filter-data', (req, res) => {
  // Extract unique agents and hashtags from mock posts
  const agents = [...new Set(mockAgentPosts.map(p => p.authorAgent))];
  const hashtags = [...new Set(
    mockAgentPosts.flatMap(p =>
      p.tags ? p.tags.map(tag => `#${tag}`) : []
    )
  )];

  res.json({
    success: true,
    data: {
      agents: agents,
      hashtags: hashtags,
      categories: [
        { id: crypto.randomUUID(), name: 'Development', count: 5 },
        { id: crypto.randomUUID(), name: 'Analytics', count: 3 },
        { id: crypto.randomUUID(), name: 'Content Creation', count: 4 }
      ]
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/filter-stats', (req, res) => {
  const { user_id = crypto.randomUUID() } = req.query;

  res.json({
    success: true,
    data: {
      user_id: user_id,
      total_filters_applied: Math.floor(Math.random() * 100) + 50,
      most_used_filters: [
        { filter: 'category:development', usage_count: 45 },
        { filter: 'status:active', usage_count: 38 }
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Save post endpoint
app.post('/api/v1/agent-posts/:id/save', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  // Find the post and update engagement
  const postIndex = mockAgentPosts.findIndex(p => p.id === id);
  if (postIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  // Update engagement - increment saves and mark as saved
  mockAgentPosts[postIndex].engagement.saves += 1;
  mockAgentPosts[postIndex].engagement.isSaved = true;

  res.json({
    success: true,
    data: {
      postId: id,
      saved: true,
      saves: mockAgentPosts[postIndex].engagement.saves
    }
  });
});

// Unsave post endpoint
app.delete('/api/v1/agent-posts/:id/save', (req, res) => {
  const { id } = req.params;

  // Find the post and update engagement
  const postIndex = mockAgentPosts.findIndex(p => p.id === id);
  if (postIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  // Update engagement - decrement saves and mark as not saved
  mockAgentPosts[postIndex].engagement.saves = Math.max(0, mockAgentPosts[postIndex].engagement.saves - 1);
  mockAgentPosts[postIndex].engagement.isSaved = false;

  res.json({
    success: true,
    data: {
      postId: id,
      saved: false,
      saves: mockAgentPosts[postIndex].engagement.saves
    }
  });
});

// Generate realistic mock activities data
const generateMockActivities = () => {
  const activityTypes = [
    'agent_started', 'agent_stopped', 'task_completed', 'task_started', 'task_failed',
    'coordination_update', 'workflow_progress', 'system_alert', 'data_processed'
  ];

  const agentNames = [
    'Code Assistant', 'Data Analyzer', 'Content Writer', 'Image Generator', 'Task Manager',
    'Security Scanner', 'Performance Monitor', 'Workflow Coordinator', 'System Administrator'
  ];

  const statusOptions = ['completed', 'in_progress', 'failed', 'pending', 'cancelled'];

  const activities = [];
  const now = new Date();

  // Generate 100 realistic activities over the past 24 hours
  for (let i = 0; i < 100; i++) {
    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const agentName = agentNames[Math.floor(Math.random() * agentNames.length)];
    const agent = mockAgents.find(a => a.name === agentName) || mockAgents[0];

    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));

    const messages = {
      'agent_started': `${agentName} agent initialized successfully`,
      'agent_stopped': `${agentName} agent shutdown completed`,
      'task_completed': `Successfully completed analysis task with 98% accuracy`,
      'task_started': `Beginning new processing task for user request`,
      'task_failed': `Task execution failed due to timeout`,
      'coordination_update': `Coordinating with 3 other agents for workflow completion`,
      'workflow_progress': `Workflow step 3/5 completed successfully`,
      'system_alert': `Resource usage threshold exceeded, optimizing performance`,
      'data_processed': `Processed 1,247 data points in 2.3 seconds`
    };

    activities.push({
      id: crypto.randomUUID(),
      type: activityType,
      message: messages[activityType] || `${agentName} performed ${activityType}`,
      timestamp: timestamp.toISOString(),
      agent_id: agent.id,
      agent_name: agent.name,
      status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
      priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      category: agent.category,
      metadata: {
        duration: Math.floor(Math.random() * 300) + 10, // 10-310 seconds
        progress: Math.floor(Math.random() * 101),
        resource_usage: Math.floor(Math.random() * 100),
        success_rate: Math.floor(Math.random() * 20) + 80 // 80-100%
      }
    });
  }

  // Sort by timestamp descending (newest first)
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// DEPRECATED: Mock token analytics data generator
// This function is no longer used - replaced with real database queries
/*
const generateTokenAnalyticsData = () => {
  // Mock data generation code commented out
  // All token analytics endpoints now query the database directly
  return { hourlyData: [], dailyData: [], messages: [] };
};
*/

// Initialize mock data
const mockActivities = generateMockActivities();

// Helper function to infer provider from model name
const inferProvider = (model) => {
  if (!model) return 'unknown';
  const modelLower = model.toLowerCase();
  if (modelLower.includes('claude')) return 'anthropic';
  if (modelLower.includes('gpt')) return 'openai';
  if (modelLower.includes('gemini')) return 'google';
  return 'unknown';
};

// API Route: Activities endpoint with pagination
app.get('/api/activities', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type;
    const status = req.query.status;
    const agent_id = req.query.agent_id;

    let filteredActivities = [...mockActivities];

    // Apply filters
    if (type) {
      filteredActivities = filteredActivities.filter(activity => activity.type === type);
    }
    if (status) {
      filteredActivities = filteredActivities.filter(activity => activity.status === status);
    }
    if (agent_id) {
      filteredActivities = filteredActivities.filter(activity => activity.agent_id === agent_id);
    }

    // Apply pagination
    const paginatedActivities = filteredActivities.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedActivities,
      total: filteredActivities.length,
      limit: limit,
      offset: offset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Activities endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API Route: Token Analytics - Hourly data
app.get('/api/token-analytics/hourly', (req, res) => {
  try {
    if (!db) {
      console.warn('⚠️ Database not available, returning empty data');
      return res.json({
        success: true,
        data: { labels: [], datasets: [] },
        raw_data: [],
        timestamp: new Date().toISOString()
      });
    }

    const { days = 1 } = req.query;
    const hoursAgo = parseInt(days) * 24;

    // Query aggregated hourly data from database
    const query = `
      SELECT
        strftime('%H:00', timestamp) as hour,
        SUM(totalTokens) as total_tokens,
        COUNT(*) as total_requests,
        ROUND(SUM(estimatedCost), 4) as total_cost
      FROM token_analytics
      WHERE datetime(timestamp) >= datetime('now', '-${hoursAgo} hours')
      GROUP BY strftime('%H:00', timestamp)
      ORDER BY hour
    `;

    const hourlyData = db.prepare(query).all();

    // Convert to Chart.js compatible format
    const chartData = {
      labels: hourlyData.map(d => d.hour),
      datasets: [
        {
          label: 'Total Tokens',
          data: hourlyData.map(d => d.total_tokens),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Requests',
          data: hourlyData.map(d => d.total_requests),
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          yAxisID: 'y1'
        },
        {
          label: 'Cost ($)',
          data: hourlyData.map(d => d.total_cost),
          backgroundColor: 'rgba(139, 69, 19, 0.5)',
          borderColor: 'rgb(139, 69, 19)',
          borderWidth: 1,
          yAxisID: 'y'
        }
      ]
    };

    res.json({
      success: true,
      data: chartData,
      raw_data: hourlyData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Hourly analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API Route: Token Analytics - Daily data
app.get('/api/token-analytics/daily', (req, res) => {
  try {
    if (!db) {
      console.warn('⚠️ Database not available, returning empty data');
      return res.json({
        success: true,
        data: { labels: [], datasets: [] },
        raw_data: [],
        timestamp: new Date().toISOString()
      });
    }

    const { days = 30 } = req.query;

    // Query aggregated daily data from database
    const query = `
      SELECT
        DATE(timestamp) as date,
        SUM(totalTokens) as total_tokens,
        COUNT(*) as total_requests,
        ROUND(SUM(estimatedCost), 4) as total_cost
      FROM token_analytics
      WHERE DATE(timestamp) >= DATE('now', '-${parseInt(days)} days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    const dailyData = db.prepare(query).all();

    // Convert to Chart.js compatible format
    const chartData = {
      labels: dailyData.map(d => d.date),
      datasets: [
        {
          label: 'Daily Tokens',
          data: dailyData.map(d => d.total_tokens),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Daily Requests',
          data: dailyData.map(d => d.total_requests),
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          yAxisID: 'y1'
        },
        {
          label: 'Daily Cost ($)',
          data: dailyData.map(d => d.total_cost),
          backgroundColor: 'rgba(139, 69, 19, 0.5)',
          borderColor: 'rgb(139, 69, 19)',
          borderWidth: 1,
          yAxisID: 'y2'
        }
      ]
    };

    res.json({
      success: true,
      data: chartData,
      raw_data: dailyData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Daily analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API Route: Token Analytics - Messages
app.get('/api/token-analytics/messages', (req, res) => {
  try {
    if (!db) {
      console.warn('⚠️ Database not available, returning empty data');
      return res.json({
        success: true,
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        timestamp: new Date().toISOString()
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 100, 100);
    const offset = parseInt(req.query.offset) || 0;
    const provider = req.query.provider;
    const model = req.query.model;

    // Build query with filters - get last 100 messages regardless of date
    let query = `
      SELECT
        id,
        timestamp,
        sessionId as session_id,
        id as request_id,
        id as message_id,
        model,
        operation as request_type,
        inputTokens as input_tokens,
        outputTokens as output_tokens,
        totalTokens as total_tokens,
        ROUND(estimatedCost, 4) as cost_total
      FROM token_analytics
      WHERE 1=1
    `;

    const params = {};

    if (model) {
      query += ` AND model = $model`;
      params.model = model;
    }

    query += ` ORDER BY datetime(timestamp) DESC LIMIT $limit OFFSET $offset`;
    params.limit = limit;
    params.offset = offset;

    const records = db.prepare(query).all(params);

    // Map to API response format with inferred provider
    const messages = records.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      session_id: record.session_id,
      request_id: record.request_id,
      message_id: record.message_id,
      provider: inferProvider(record.model),
      model: record.model,
      request_type: record.request_type,
      input_tokens: record.input_tokens,
      output_tokens: record.output_tokens,
      total_tokens: record.total_tokens,
      cost_total: record.cost_total,
      processing_time_ms: Math.floor(Math.random() * 2000) + 100, // Placeholder
      message_preview: `User requested ${record.request_type}`,
      response_preview: 'Generated response',
      component: 'TokenAnalyticsDashboard'
    }));

    // Filter by provider if specified (post-query since provider is inferred)
    let filteredMessages = messages;
    if (provider) {
      filteredMessages = messages.filter(msg => msg.provider === provider);
    }

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM token_analytics WHERE 1=1`;
    const countParams = {};
    if (model) {
      countQuery += ` AND model = $model`;
      countParams.model = model;
    }
    const totalCount = db.prepare(countQuery).get(countParams).count;

    res.json({
      success: true,
      data: filteredMessages,
      total: totalCount,
      limit: limit,
      offset: offset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Messages analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API Route: Token Analytics - Summary
app.get('/api/token-analytics/summary', (req, res) => {
  try {
    if (!db) {
      console.warn('⚠️ Database not available, returning empty data');
      return res.json({
        success: true,
        data: {
          summary: {
            total_requests: 0,
            total_tokens: 0,
            total_cost: 0,
            avg_processing_time: 0,
            unique_sessions: 0,
            providers_used: 0,
            models_used: 0
          },
          by_provider: [],
          by_model: []
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get overall summary statistics
    const summaryQuery = `
      SELECT
        COUNT(*) as total_requests,
        SUM(totalTokens) as total_tokens,
        ROUND(SUM(estimatedCost), 4) as total_cost,
        COUNT(DISTINCT sessionId) as unique_sessions,
        COUNT(DISTINCT model) as models_used
      FROM token_analytics
    `;
    const summary = db.prepare(summaryQuery).get();

    // Calculate providers used (infer from models)
    const modelsQuery = `SELECT DISTINCT model FROM token_analytics`;
    const models = db.prepare(modelsQuery).all();
    const providers = new Set(models.map(m => inferProvider(m.model)));
    summary.providers_used = providers.size;

    // Get usage by model with provider inference
    const byModelQuery = `
      SELECT
        model,
        COUNT(*) as requests,
        SUM(totalTokens) as tokens,
        ROUND(SUM(estimatedCost), 4) as cost
      FROM token_analytics
      GROUP BY model
      ORDER BY requests DESC
    `;
    const modelStats = db.prepare(byModelQuery).all().map(m => ({
      model: m.model,
      provider: inferProvider(m.model),
      requests: m.requests,
      tokens: m.tokens,
      cost: m.cost,
      avg_time: Math.floor(Math.random() * 1000) + 200 // Placeholder
    }));

    // Aggregate by provider
    const byProvider = {};
    modelStats.forEach(m => {
      if (!byProvider[m.provider]) {
        byProvider[m.provider] = {
          provider: m.provider,
          requests: 0,
          tokens: 0,
          cost: 0
        };
      }
      byProvider[m.provider].requests += m.requests;
      byProvider[m.provider].tokens += m.tokens;
      byProvider[m.provider].cost += m.cost;
    });

    const providerStats = Object.values(byProvider).map(p => ({
      ...p,
      avg_time: Math.floor(Math.random() * 1000) + 200 // Placeholder
    })).sort((a, b) => b.requests - a.requests);

    res.json({
      success: true,
      data: {
        summary: {
          total_requests: summary.total_requests || 0,
          total_tokens: summary.total_tokens || 0,
          total_cost: summary.total_cost || 0,
          avg_processing_time: Math.floor(Math.random() * 500) + 300, // Placeholder
          unique_sessions: summary.unique_sessions || 0,
          providers_used: summary.providers_used || 0,
          models_used: summary.models_used || 0
        },
        by_provider: providerStats,
        by_model: modelStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Summary analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API Route: Token Analytics - Export
app.get('/api/token-analytics/export', (req, res) => {
  try {
    if (!db) {
      console.warn('⚠️ Database not available, returning empty CSV');
      const headers = ['Date', 'Daily Cost ($)', 'Daily Requests', 'Daily Tokens'];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="token-analytics-empty.csv"');
      return res.send(headers.join(',') + '\n');
    }

    const { days = 30, format = 'csv' } = req.query;

    if (format !== 'csv') {
      return res.status(400).json({
        success: false,
        error: 'Only CSV format is currently supported'
      });
    }

    // Query daily data from database
    const query = `
      SELECT
        DATE(timestamp) as date,
        ROUND(SUM(estimatedCost), 4) as total_cost,
        COUNT(*) as total_requests,
        SUM(totalTokens) as total_tokens
      FROM token_analytics
      WHERE DATE(timestamp) >= DATE('now', '-${parseInt(days)} days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    const exportData = db.prepare(query).all();

    // Generate CSV
    const headers = ['Date', 'Daily Cost ($)', 'Daily Requests', 'Daily Tokens'];
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => [
        row.date,
        row.total_cost || 0,
        row.total_requests || 0,
        row.total_tokens || 0
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="token-analytics-${days}d.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data',
      message: error.message
    });
  }
});

// =============================================================================
// STREAMING TICKER API ENDPOINTS
// =============================================================================

// SSE Endpoint for streaming ticker
app.get('/api/streaming-ticker/stream', (req, res) => {
  // Enforce connection limit to prevent memory exhaustion
  if (sseConnections.size >= MAX_SSE_CONNECTIONS) {
    console.warn(`⚠️ SSE connection limit reached (${MAX_SSE_CONNECTIONS}). Rejecting new connection.`);
    res.status(503).json({
      success: false,
      error: 'Too many connections',
      message: `Maximum ${MAX_SSE_CONNECTIONS} concurrent SSE connections allowed`
    });
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message with validated structure
  const connectionMessage = validateSSEMessage({
    type: 'connected',
    message: 'Streaming ticker connected',
    priority: 'low',
    timestamp: Date.now()
  });
  res.write(`data: ${JSON.stringify(connectionMessage)}\n\n`);

  // Add to connections set
  sseConnections.add(res);

  // Track last activity time for connection timeout
  let lastActivity = Date.now();

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      clearInterval(heartbeat);
      sseConnections.delete(res);
      sseHeartbeats.delete(res);
      return;
    }

    // Check for idle timeout (5 minutes)
    const idleTime = Date.now() - lastActivity;
    if (idleTime > CONNECTION_TIMEOUT) {
      console.log(`⏱️ SSE connection timed out after ${Math.round(idleTime / 1000)}s idle`);
      clearInterval(heartbeat);
      sseConnections.delete(res);
      sseHeartbeats.delete(res);
      try {
        res.write(`data: ${JSON.stringify({type: 'timeout', message: 'Connection timed out'})}\n\n`);
        res.end();
      } catch (e) {
        // Connection already closed
      }
      return;
    }

    try {
      const heartbeatMessage = validateSSEMessage({
        type: 'heartbeat',
        message: 'Connection alive',
        priority: 'low',
        timestamp: Date.now()
      });
      res.write(`data: ${JSON.stringify(heartbeatMessage)}\n\n`);
      lastActivity = Date.now();
    } catch (error) {
      console.error('⚠️ Error sending heartbeat:', error.message);
      clearInterval(heartbeat);
      sseConnections.delete(res);
      sseHeartbeats.delete(res);
    }
  }, HEARTBEAT_INTERVAL);

  // Store heartbeat interval for cleanup
  sseHeartbeats.set(res, heartbeat);

  // Send recent messages with validation
  const recentMessages = streamingTickerMessages.slice(-10);
  recentMessages.forEach(message => {
    try {
      const validatedMessage = validateSSEMessage(message);
      res.write(`data: ${JSON.stringify(validatedMessage)}\n\n`);
      lastActivity = Date.now();
    } catch (error) {
      console.error('⚠️ Error sending message:', error.message);
    }
  });

  // Handle client disconnect - CRITICAL for preventing memory leaks
  req.on('close', () => {
    const heartbeatInterval = sseHeartbeats.get(res);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      sseHeartbeats.delete(res);
    }
    sseConnections.delete(res);
    console.log(`📡 SSE client disconnected (${sseConnections.size} active connections)`);
  });

  console.log(`📡 SSE client connected to streaming ticker (${sseConnections.size}/${MAX_SSE_CONNECTIONS} connections)`);
});

// POST endpoint for streaming ticker messages
app.post('/api/streaming-ticker/message', (req, res) => {
  try {
    const { message, type = 'info', source = 'system', metadata = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Create and validate the ticker message
    const rawMessage = {
      id: crypto.randomUUID(),
      message,
      type,
      source,
      metadata,
      priority: metadata?.priority || 'medium',
      timestamp: Date.now()
    };

    // Validate message structure
    const tickerMessage = validateSSEMessage(rawMessage);

    // Add to messages array (keep last MAX_TICKER_MESSAGES)
    streamingTickerMessages.push(tickerMessage);
    if (streamingTickerMessages.length > MAX_TICKER_MESSAGES) {
      // Remove oldest messages to prevent unbounded growth
      streamingTickerMessages.splice(0, streamingTickerMessages.length - MAX_TICKER_MESSAGES);
    }

    // Broadcast to all SSE connections with validated structure
    sseConnections.forEach(connection => {
      if (!connection.writableEnded) {
        connection.write(`data: ${JSON.stringify(tickerMessage)}\n\n`);
      }
    });

    res.json({
      success: true,
      data: tickerMessage
    });
  } catch (error) {
    console.error('Streaming ticker message error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get streaming ticker history
app.get('/api/streaming-ticker/history', (req, res) => {
  try {
    const { limit = 50, offset = 0, type, source } = req.query;

    let filteredMessages = [...streamingTickerMessages];

    if (type) {
      filteredMessages = filteredMessages.filter(msg => msg.type === type);
    }

    if (source) {
      filteredMessages = filteredMessages.filter(msg => msg.source === source);
    }

    const paginatedMessages = filteredMessages
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: paginatedMessages,
      total: filteredMessages.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Streaming ticker history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// =============================================================================
// TEMPLATES API ENDPOINTS
// =============================================================================

// IMPORTANT: Specific routes MUST come BEFORE dynamic /:id routes

// GET template categories (MUST come before /:id route)
app.get('/api/templates/categories', (req, res) => {
  try {
    const categories = [...new Set(mockTemplates.map(t => t.category))];
    const categoriesWithCounts = categories.map(category => ({
      id: crypto.randomUUID(),
      name: category,
      count: mockTemplates.filter(t => t.category === category).length
    }));

    res.json({
      success: true,
      data: categoriesWithCounts
    });
  } catch (error) {
    console.error('Template categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET template statistics (MUST come before /:id route)
app.get('/api/templates/stats', (req, res) => {
  try {
    const stats = {
      totalTemplates: mockTemplates.length,
      totalCategories: [...new Set(mockTemplates.map(t => t.category))].length,
      totalUsage: mockTemplates.reduce((sum, t) => sum + (t.usageCount || 0), 0),
      averagePopularity: Math.round(mockTemplates.reduce((sum, t) => sum + t.popularity, 0) / mockTemplates.length),
      mostUsed: mockTemplates
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 5),
      recentlyCreated: mockTemplates
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
      byCategory: [...new Set(mockTemplates.map(t => t.category))].map(category => ({
        category,
        count: mockTemplates.filter(t => t.category === category).length,
        totalUsage: mockTemplates
          .filter(t => t.category === category)
          .reduce((sum, t) => sum + (t.usageCount || 0), 0)
      }))
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Template stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET all templates
app.get('/api/templates', (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0, sortBy = 'popularity', sortOrder = 'DESC' } = req.query;

    let filteredTemplates = [...mockTemplates];

    // Apply filters
    if (category) {
      filteredTemplates = filteredTemplates.filter(template =>
        template.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    if (sortBy) {
      filteredTemplates.sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return sortOrder === 'DESC' ? bVal - aVal : aVal - bVal;
      });
    }

    // Apply pagination
    const paginatedTemplates = filteredTemplates.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: paginatedTemplates,
      total: filteredTemplates.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Templates GET error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET template by ID
app.get('/api/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const template = mockTemplates.find(t => t.id === id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Template GET by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST create new template
app.post('/api/templates', (req, res) => {
  try {
    const {
      name,
      title,
      hook,
      content,
      tags = [],
      category,
      description,
      icon = '📝',
      color = 'blue',
      estimatedTime = 5
    } = req.body;

    if (!name || !content || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name, content, and category are required'
      });
    }

    const newTemplate = {
      id: crypto.randomUUID(),
      name,
      title: title || name,
      hook: hook || '',
      content,
      tags: Array.isArray(tags) ? tags : [],
      category: category.toUpperCase(),
      description: description || '',
      icon,
      color,
      estimatedTime: parseInt(estimatedTime),
      popularity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockTemplates.push(newTemplate);

    res.status(201).json({
      success: true,
      data: newTemplate
    });
  } catch (error) {
    console.error('Template POST error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// PUT update template
app.put('/api/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const templateIndex = mockTemplates.findIndex(t => t.id === id);

    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const updates = req.body;
    const updatedTemplate = {
      ...mockTemplates[templateIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    mockTemplates[templateIndex] = updatedTemplate;

    res.json({
      success: true,
      data: updatedTemplate
    });
  } catch (error) {
    console.error('Template PUT error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE template
app.delete('/api/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const templateIndex = mockTemplates.findIndex(t => t.id === id);

    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const deletedTemplate = mockTemplates.splice(templateIndex, 1)[0];

    res.json({
      success: true,
      data: deletedTemplate,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Template DELETE error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST render template with variables
app.post('/api/templates/:id/render', (req, res) => {
  try {
    const { id } = req.params;
    const { variables = {} } = req.body;

    const template = mockTemplates.find(t => t.id === id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Simple variable replacement in template content
    let renderedContent = template.content;
    let renderedTitle = template.title;
    let renderedHook = template.hook;

    // Replace variables in content, title, and hook
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedContent = renderedContent.replace(placeholder, value);
      renderedTitle = renderedTitle.replace(placeholder, value);
      renderedHook = renderedHook.replace(placeholder, value);
    });

    const rendered = {
      templateId: id,
      templateName: template.name,
      renderedContent,
      renderedTitle,
      renderedHook,
      variables,
      renderedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: rendered
    });
  } catch (error) {
    console.error('Template render error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST increment template usage
app.post('/api/templates/:id/use', (req, res) => {
  try {
    const { id } = req.params;
    const templateIndex = mockTemplates.findIndex(t => t.id === id);

    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Initialize usageCount if it doesn't exist
    if (!mockTemplates[templateIndex].usageCount) {
      mockTemplates[templateIndex].usageCount = 0;
    }

    // Increment usage count
    mockTemplates[templateIndex].usageCount++;
    mockTemplates[templateIndex].updated_at = new Date().toISOString();

    res.json({
      success: true,
      data: {
        templateId: id,
        usageCount: mockTemplates[templateIndex].usageCount
      },
      message: 'Template usage incremented'
    });
  } catch (error) {
    console.error('Template usage increment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// =============================================================================
// ADDITIONAL AGENT API ENDPOINTS
// =============================================================================

// GET agent metrics (must come before /:id route)
app.get('/api/agents/metrics', (req, res) => {
  try {
    const metrics = {
      total_agents: mockAgents.length,
      active_agents: mockAgents.filter(a => a.status === 'active').length,
      inactive_agents: mockAgents.filter(a => a.status !== 'active').length,
      categories: [...new Set(mockAgents.map(a => a.category))].map(cat => ({
        category: cat,
        count: mockAgents.filter(a => a.category === cat).length
      })),
      performance_summary: {
        avg_response_time: Math.floor(Math.random() * 100) + 100,
        avg_cpu_usage: Math.floor(Math.random() * 20) + 15,
        avg_memory_usage: Math.floor(Math.random() * 30) + 25,
        total_requests: Math.floor(Math.random() * 10000) + 5000
      }
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agent metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET agent categories (must come before /:id route)
app.get('/api/agents/categories', (req, res) => {
  try {
    const categories = [...new Set(mockAgents.map(a => a.category))].map(cat => ({
      name: cat,
      count: mockAgents.filter(a => a.category === cat).length,
      agents: mockAgents.filter(a => a.category === cat).map(a => ({
        id: a.id,
        name: a.name,
        status: a.status
      }))
    }));

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Agent categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST scan agents (must come before /:id route)
app.post('/api/agents/scan', (req, res) => {
  try {
    const scanResults = {
      scan_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      discovered_agents: Math.floor(Math.random() * 3) + 1,
      updated_agents: Math.floor(Math.random() * 2),
      errors: [],
      duration_ms: Math.floor(Math.random() * 5000) + 1000
    };

    res.json({
      success: true,
      data: scanResults
    });
  } catch (error) {
    console.error('Agent scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET all agent statuses (must come before /:id route)
app.get('/api/agents/status/all', (req, res) => {
  try {
    const statuses = mockAgents.map(agent => ({
      agent_id: agent.id,
      name: agent.name,
      status: agent.status,
      last_seen: new Date().toISOString(),
      uptime: Math.floor(Math.random() * 3600) + 60,
      performance: {
        cpu_usage: Math.floor(Math.random() * 30) + 10,
        memory_usage: Math.floor(Math.random() * 40) + 20,
        response_time: Math.floor(Math.random() * 200) + 50
      }
    }));

    res.json({
      success: true,
      data: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('All agent statuses error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET search agents (must come before /:id route)
app.get('/api/agents/search', (req, res) => {
  try {
    const { q: query, category, status } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    let results = mockAgents.filter(agent =>
      agent.name.toLowerCase().includes(query.toLowerCase()) ||
      agent.category.toLowerCase().includes(query.toLowerCase())
    );

    if (category) {
      results = results.filter(agent => agent.category.toLowerCase() === category.toLowerCase());
    }

    if (status) {
      results = results.filter(agent => agent.status === status);
    }

    res.json({
      success: true,
      data: results,
      query: query,
      total: results.length
    });
  } catch (error) {
    console.error('Agent search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET agent health check (must come before /:id route)
app.get('/api/agents/health', (req, res) => {
  try {
    const healthStatus = {
      service: 'agents',
      status: 'healthy',
      total_agents: mockAgents.length,
      active_agents: mockAgents.filter(a => a.status === 'active').length,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('Agent health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET agent by ID
app.get('/api/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const agent = mockAgents.find(a => a.id === id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Agent GET by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET agent status
app.get('/api/agents/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const agent = mockAgents.find(a => a.id === id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: {
        agent_id: id,
        status: agent.status,
        last_seen: new Date().toISOString(),
        uptime: Math.floor(Math.random() * 3600) + 60, // Random uptime in seconds
        performance: {
          cpu_usage: Math.floor(Math.random() * 30) + 10,
          memory_usage: Math.floor(Math.random() * 40) + 20,
          response_time: Math.floor(Math.random() * 200) + 50
        }
      }
    });
  } catch (error) {
    console.error('Agent status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET all agent statuses
app.get('/api/agents/status/all', (req, res) => {
  try {
    const statuses = mockAgents.map(agent => ({
      agent_id: agent.id,
      name: agent.name,
      status: agent.status,
      last_seen: new Date().toISOString(),
      uptime: Math.floor(Math.random() * 3600) + 60,
      performance: {
        cpu_usage: Math.floor(Math.random() * 30) + 10,
        memory_usage: Math.floor(Math.random() * 40) + 20,
        response_time: Math.floor(Math.random() * 200) + 50
      }
    }));

    res.json({
      success: true,
      data: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('All agent statuses error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET agent metrics
app.get('/api/agents/metrics', (req, res) => {
  try {
    const metrics = {
      total_agents: mockAgents.length,
      active_agents: mockAgents.filter(a => a.status === 'active').length,
      inactive_agents: mockAgents.filter(a => a.status !== 'active').length,
      categories: [...new Set(mockAgents.map(a => a.category))].map(cat => ({
        category: cat,
        count: mockAgents.filter(a => a.category === cat).length
      })),
      performance_summary: {
        avg_response_time: Math.floor(Math.random() * 100) + 100,
        avg_cpu_usage: Math.floor(Math.random() * 20) + 15,
        avg_memory_usage: Math.floor(Math.random() * 30) + 25,
        total_requests: Math.floor(Math.random() * 10000) + 5000
      }
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agent metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET agent categories
app.get('/api/agents/categories', (req, res) => {
  try {
    const categories = [...new Set(mockAgents.map(a => a.category))].map(cat => ({
      name: cat,
      count: mockAgents.filter(a => a.category === cat).length,
      agents: mockAgents.filter(a => a.category === cat).map(a => ({
        id: a.id,
        name: a.name,
        status: a.status
      }))
    }));

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Agent categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST scan agents
app.post('/api/agents/scan', (req, res) => {
  try {
    const scanResults = {
      scan_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      discovered_agents: Math.floor(Math.random() * 3) + 1,
      updated_agents: Math.floor(Math.random() * 2),
      errors: [],
      duration_ms: Math.floor(Math.random() * 5000) + 1000
    };

    res.json({
      success: true,
      data: scanResults
    });
  } catch (error) {
    console.error('Agent scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET agent files
app.get('/api/agents/:id/files', (req, res) => {
  try {
    const { id } = req.params;
    const agent = mockAgents.find(a => a.id === id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    const mockFiles = [
      {
        id: crypto.randomUUID(),
        name: `${agent.name.toLowerCase().replace(/\s+/g, '-')}.md`,
        path: `/agents/${agent.name.toLowerCase().replace(/\s+/g, '-')}.md`,
        size: Math.floor(Math.random() * 10000) + 1000,
        modified: new Date().toISOString(),
        type: 'markdown'
      },
      {
        id: crypto.randomUUID(),
        name: 'config.json',
        path: `/agents/${agent.name.toLowerCase().replace(/\s+/g, '-')}/config.json`,
        size: Math.floor(Math.random() * 1000) + 100,
        modified: new Date().toISOString(),
        type: 'json'
      }
    ];

    res.json({
      success: true,
      data: mockFiles
    });
  } catch (error) {
    console.error('Agent files error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET search agents
app.get('/api/agents/search', (req, res) => {
  try {
    const { q: query, category, status } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    let results = mockAgents.filter(agent =>
      agent.name.toLowerCase().includes(query.toLowerCase()) ||
      agent.category.toLowerCase().includes(query.toLowerCase())
    );

    if (category) {
      results = results.filter(agent => agent.category.toLowerCase() === category.toLowerCase());
    }

    if (status) {
      results = results.filter(agent => agent.status === status);
    }

    res.json({
      success: true,
      data: results,
      query: query,
      total: results.length
    });
  } catch (error) {
    console.error('Agent search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET agent health check
app.get('/api/agents/health', (req, res) => {
  try {
    const healthStatus = {
      service: 'agents',
      status: 'healthy',
      total_agents: mockAgents.length,
      active_agents: mockAgents.filter(a => a.status === 'active').length,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('Agent health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// =============================================================================
// DYNAMIC AGENT PAGES API ENDPOINTS (DEPRECATED - Now using database-backed routes)
// =============================================================================
// NOTE: These mock routes are now replaced by database-backed routes in ./routes/agent-pages.js
// Keeping them commented for reference only


// ========================================================================================
// Dynamic UI Template System Routes
// ========================================================================================

// Dynamic UI Templates - defined here for now, will be moved to separate file
const dynamicUITemplates = {
  dashboard: {
    metadata: {
      id: 'dashboard-v1',
      name: 'Dashboard',
      description: 'Professional dashboard with metrics and data table',
      category: 'dashboard',
      tags: ['metrics', 'analytics', 'overview'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      { id: 'header', type: 'header', config: { title: '{{title}}', level: 1, subtitle: '{{subtitle}}' } },
      { id: 'metrics', type: 'Grid', config: { cols: 3, gap: 6 } },
      { id: 'metric-1', type: 'stat', config: { label: '{{metric1_label}}', value: '{{metric1_value}}', change: '{{metric1_change}}', icon: '{{metric1_icon}}' } },
      { id: 'metric-2', type: 'stat', config: { label: '{{metric2_label}}', value: '{{metric2_value}}', change: '{{metric2_change}}', icon: '{{metric2_icon}}' } },
      { id: 'metric-3', type: 'stat', config: { label: '{{metric3_label}}', value: '{{metric3_value}}', change: '{{metric3_change}}', icon: '{{metric3_icon}}' } },
      { id: 'data-table', type: 'dataTable', config: { sortable: true, filterable: true } }
    ],
    components: ['header', 'Grid', 'stat', 'dataTable'],
    variables: {
      title: 'Dashboard', subtitle: 'Overview of key metrics',
      metric1_label: 'Total Users', metric1_value: 0, metric1_change: 0, metric1_icon: '👥',
      metric2_label: 'Revenue', metric2_value: 0, metric2_change: 0, metric2_icon: '💰',
      metric3_label: 'Active Sessions', metric3_value: 0, metric3_change: 0, metric3_icon: '📊'
    }
  },
  todoManager: {
    metadata: {
      id: 'todo-manager-v1',
      name: 'Todo List Manager',
      description: 'Task management interface with todo list',
      category: 'list',
      tags: ['tasks', 'productivity', 'todos'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      { id: 'header', type: 'header', config: { title: '{{title}}', level: 1 } },
      { id: 'stats', type: 'Grid', config: { cols: 2, gap: 4 } },
      { id: 'stat-total', type: 'stat', config: { label: 'Total Tasks', value: '{{totalTasks}}', icon: '📝' } },
      { id: 'stat-completed', type: 'stat', config: { label: 'Completed', value: '{{completedTasks}}', icon: '✅' } },
      { id: 'todo-list', type: 'todoList', config: { showCompleted: false, sortBy: 'priority' } }
    ],
    components: ['header', 'Grid', 'stat', 'todoList'],
    variables: { title: 'My Tasks', totalTasks: 0, completedTasks: 0 }
  },
  timeline: {
    metadata: {
      id: 'timeline-v1',
      name: 'Timeline',
      description: 'Chronological event timeline',
      category: 'timeline',
      tags: ['events', 'history', 'chronology'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      { id: 'header', type: 'header', config: { title: '{{title}}', level: 1, subtitle: '{{subtitle}}' } },
      { id: 'timeline', type: 'timeline', config: { orientation: 'vertical' } }
    ],
    components: ['header', 'timeline'],
    variables: { title: 'Project Timeline', subtitle: 'Key milestones and events' }
  },
  formPage: {
    metadata: {
      id: 'form-page-v1',
      name: 'Form Page',
      description: 'Data collection form with validation',
      category: 'form',
      tags: ['form', 'input', 'data-collection'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      { id: 'header', type: 'header', config: { title: '{{title}}', level: 1, subtitle: '{{subtitle}}' } },
      { id: 'form', type: 'form', config: { fields: '{{fields}}', submitLabel: '{{submitLabel}}' } }
    ],
    components: ['header', 'form'],
    variables: {
      title: 'Contact Form',
      subtitle: 'Get in touch with us',
      fields: [
        { label: 'Name', type: 'text', required: true },
        { label: 'Email', type: 'email', required: true },
        { label: 'Message', type: 'textarea', required: true }
      ],
      submitLabel: 'Submit'
    }
  },
  analytics: {
    metadata: {
      id: 'analytics-v1',
      name: 'Analytics Dashboard',
      description: 'Comprehensive analytics view with multiple metrics',
      category: 'analytics',
      tags: ['analytics', 'metrics', 'kpi', 'dashboard'],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    layout: [
      { id: 'header', type: 'header', config: { title: '{{title}}', level: 1, subtitle: '{{subtitle}}' } },
      { id: 'kpi-grid', type: 'Grid', config: { cols: 4, gap: 4 } },
      { id: 'kpi-1', type: 'stat', config: { label: '{{kpi1_label}}', value: '{{kpi1_value}}', change: '{{kpi1_change}}', icon: '{{kpi1_icon}}' } },
      { id: 'kpi-2', type: 'stat', config: { label: '{{kpi2_label}}', value: '{{kpi2_value}}', change: '{{kpi2_change}}', icon: '{{kpi2_icon}}' } },
      { id: 'kpi-3', type: 'stat', config: { label: '{{kpi3_label}}', value: '{{kpi3_value}}', change: '{{kpi3_change}}', icon: '{{kpi3_icon}}' } },
      { id: 'kpi-4', type: 'stat', config: { label: '{{kpi4_label}}', value: '{{kpi4_value}}', change: '{{kpi4_change}}', icon: '{{kpi4_icon}}' } },
      { id: 'tabs', type: 'tabs', config: { tabs: [{ label: 'Overview', content: 'overview' }, { label: 'Detailed', content: 'detailed' }] } },
      { id: 'data-table', type: 'dataTable', config: { sortable: true, filterable: true } }
    ],
    components: ['header', 'Grid', 'stat', 'tabs', 'dataTable'],
    variables: {
      title: 'Analytics Dashboard', subtitle: 'Real-time performance metrics',
      kpi1_label: 'Total Revenue', kpi1_value: '$0', kpi1_change: 0, kpi1_icon: '💰',
      kpi2_label: 'Active Users', kpi2_value: 0, kpi2_change: 0, kpi2_icon: '👥',
      kpi3_label: 'Conversion Rate', kpi3_value: '0%', kpi3_change: 0, kpi3_icon: '📈',
      kpi4_label: 'Avg Session', kpi4_value: '0m', kpi4_change: 0, kpi4_icon: '⏱️'
    }
  }
};

// Helper function for variable replacement
function replaceTemplateVariables(obj, variables) {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(item => replaceTemplateVariables(item, variables));
  }
  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const key in obj) {
      result[key] = replaceTemplateVariables(obj[key], variables);
    }
    return result;
  }
  return obj;
}

// Helper function to fill template with variables
function fillDynamicUITemplate(template, variables) {
  const filledLayout = template.layout.map(component => ({
    ...component,
    config: replaceTemplateVariables(component.config, variables)
  }));
  return { ...template, layout: filledLayout };
}

// GET /api/dynamic-ui/templates - List all Dynamic UI templates
app.get('/api/dynamic-ui/templates', (req, res) => {
  try {
    const { category, tags } = req.query;
    let filteredTemplates = Object.values(dynamicUITemplates);

    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.metadata.category === category);
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filteredTemplates = filteredTemplates.filter(t =>
        tagArray.some(tag => t.metadata.tags.includes(tag))
      );
    }

    res.json({
      success: true,
      templates: filteredTemplates.map(t => t.metadata),
      total: filteredTemplates.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve templates',
      message: error.message
    });
  }
});

// GET /api/dynamic-ui/templates/:templateId - Get specific Dynamic UI template
app.get('/api/dynamic-ui/templates/:templateId', (req, res) => {
  try {
    const { templateId } = req.params;
    const template = dynamicUITemplates[templateId];

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        message: `No template found with id: ${templateId}`
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve template',
      message: error.message
    });
  }
});

// POST /api/dynamic-ui/templates/:templateId/instantiate - Fill template with variables
app.post('/api/dynamic-ui/templates/:templateId/instantiate', (req, res) => {
  try {
    const { templateId } = req.params;
    const { variables } = req.body;
    const template = dynamicUITemplates[templateId];

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        message: `No template found with id: ${templateId}`
      });
    }

    const filledTemplate = fillDynamicUITemplate(template, variables || {});

    res.json({
      success: true,
      page: filledTemplate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to instantiate template',
      message: error.message
    });
  }
});

// ========================================================================================
// Component Catalog API
// ========================================================================================

// Component catalog with Zod schemas
const componentCatalog = {
  Button: {
    name: 'Button',
    description: 'Interactive button component with multiple variants and states',
    category: 'Form',
    schema: {
      variant: { type: 'enum', values: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'], required: false },
      size: { type: 'enum', values: ['default', 'sm', 'lg', 'icon'], required: false },
      disabled: { type: 'boolean', required: false },
      loading: { type: 'boolean', required: false },
      children: { type: 'any', required: false }
    },
    examples: [
      { name: 'Default Button', props: { children: 'Click me' } },
      { name: 'Destructive Button', props: { variant: 'destructive', children: 'Delete' } }
    ]
  },
  Input: {
    name: 'Input',
    description: 'Text input field with validation and various input types',
    category: 'Form',
    schema: {
      type: { type: 'enum', values: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'], required: false },
      placeholder: { type: 'string', required: false },
      disabled: { type: 'boolean', required: false },
      required: { type: 'boolean', required: false }
    },
    examples: [
      { name: 'Text Input', props: { placeholder: 'Enter text...' } },
      { name: 'Email Input', props: { type: 'email', placeholder: 'Enter email...' } }
    ]
  },
  Card: {
    name: 'Card',
    description: 'Flexible content container with header, body, and footer sections',
    category: 'Layout',
    schema: {
      title: { type: 'string', required: false },
      description: { type: 'string', required: false },
      variant: { type: 'enum', values: ['default', 'outline', 'filled'], required: false }
    },
    examples: [
      { name: 'Basic Card', props: { title: 'Card Title', description: 'Card description' } }
    ]
  },
  Badge: {
    name: 'Badge',
    description: 'Small status or label indicator',
    category: 'Display',
    schema: {
      variant: { type: 'enum', values: ['default', 'secondary', 'destructive', 'outline'], required: false },
      children: { type: 'any', required: false }
    },
    examples: [
      { name: 'Default Badge', props: { children: 'New' } }
    ]
  },
  Alert: {
    name: 'Alert',
    description: 'Prominent notification message',
    category: 'Feedback',
    schema: {
      variant: { type: 'enum', values: ['default', 'destructive'], required: false },
      title: { type: 'string', required: false },
      description: { type: 'string', required: false }
    },
    examples: [
      { name: 'Info Alert', props: { title: 'Info', description: 'This is an informational alert' } }
    ]
  }
};

// GET /api/components/catalog - Get all components
app.get('/api/components/catalog', (req, res) => {
  try {
    const components = Object.entries(componentCatalog).map(([key, component]) => ({
      type: key,
      ...component
    }));

    res.json({
      success: true,
      data: components,
      total: components.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve component catalog',
      message: error.message
    });
  }
});

// GET /api/components/catalog/:componentType - Get specific component
app.get('/api/components/catalog/:componentType', (req, res) => {
  try {
    const { componentType } = req.params;
    const component = componentCatalog[componentType];

    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
        message: `No component found with type: ${componentType}`
      });
    }

    res.json({
      success: true,
      data: {
        type: componentType,
        ...component
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve component',
      message: error.message
    });
  }
});

// GET /api/components/categories - Get component categories
app.get('/api/components/categories', (req, res) => {
  try {
    const categories = [...new Set(Object.values(componentCatalog).map(c => c.category))];
    const categoriesWithComponents = categories.map(category => ({
      name: category,
      components: Object.entries(componentCatalog)
        .filter(([_, component]) => component.category === category)
        .map(([type, component]) => ({ type, name: component.name, description: component.description }))
    }));

    res.json({
      success: true,
      data: categoriesWithComponents,
      total: categories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories',
      message: error.message
    });
  }
});

// Health check with enhanced monitoring
app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  // Calculate health status based on memory usage
  const heapPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  let status = 'healthy';
  let warnings = [];

  if (heapPercentage > 90) {
    status = 'critical';
    warnings.push('Heap usage exceeds 90%');
  } else if (heapPercentage > 80) {
    status = 'warning';
    warnings.push('Heap usage exceeds 80%');
  }

  if (sseConnections.size > 100) {
    warnings.push(`High number of SSE connections: ${sseConnections.size}`);
  }

  res.json({
    success: true,
    data: {
      status: status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapPercentage: Math.round(heapPercentage),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024),
        unit: 'MB'
      },
      resources: {
        sseConnections: sseConnections.size,
        tickerMessages: streamingTickerMessages.length,
        databaseConnected: db ? true : false,
        agentPagesDbConnected: agentPagesDb ? true : false,
        fileWatcherActive: fileWatcher ? true : false
      },
      warnings: warnings
    }
  });
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

// Generate some initial streaming ticker messages with validated structure
setTimeout(() => {
  const initialMessages = [
    validateSSEMessage({
      id: crypto.randomUUID(),
      message: 'System initialized successfully',
      type: 'success',
      source: 'system',
      priority: 'high',
      metadata: { component: 'server' },
      timestamp: Date.now()
    }),
    validateSSEMessage({
      id: crypto.randomUUID(),
      message: 'All agents are operational',
      type: 'info',
      source: 'agent-monitor',
      priority: 'medium',
      metadata: { active_count: mockAgents.length },
      timestamp: Date.now()
    }),
    validateSSEMessage({
      id: crypto.randomUUID(),
      message: 'Templates library loaded',
      type: 'info',
      source: 'template-service',
      priority: 'medium',
      metadata: { template_count: mockTemplates.length },
      timestamp: Date.now()
    })
  ];

  streamingTickerMessages.push(...initialMessages);
}, 1000);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agents API: http://localhost:${PORT}/api/agents`);
  console.log(`📝 Templates API: http://localhost:${PORT}/api/templates`);
  console.log(`📊 Streaming Ticker SSE: http://localhost:${PORT}/api/streaming-ticker/stream`);
  console.log(`📄 Dynamic Pages API: http://localhost:${PORT}/api/agent-pages/agents/:agentId/pages`);
  console.log(`📈 All analytics APIs available`);

  // Log initial memory usage
  logMemoryUsage();
});

// =============================================================================
// MEMORY MONITORING AND HEALTH CHECKS
// =============================================================================

/**
 * Log current memory usage
 */
function logMemoryUsage() {
  const used = process.memoryUsage();
  console.log('💾 Memory Usage:');
  console.log(`   RSS: ${Math.round(used.rss / 1024 / 1024)} MB`);
  console.log(`   Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)} MB`);
  console.log(`   Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
  console.log(`   External: ${Math.round(used.external / 1024 / 1024)} MB`);
  console.log(`   Array Buffers: ${Math.round(used.arrayBuffers / 1024 / 1024)} MB`);
}

/**
 * Monitor memory usage periodically
 */
const memoryMonitorInterval = setInterval(() => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const heapPercentage = Math.round((used.heapUsed / used.heapTotal) * 100);

  // Log warning if heap usage exceeds 80%
  if (heapPercentage > 80) {
    console.warn(`⚠️ High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`);
    console.warn(`   SSE Connections: ${sseConnections.size}`);
    console.warn(`   Ticker Messages: ${streamingTickerMessages.length}`);
  }

  // Force garbage collection if available and heap is over 90%
  if (heapPercentage > 90 && global.gc) {
    console.warn('🗑️ Forcing garbage collection due to high memory usage');
    global.gc();
  }
}, 30000); // Check every 30 seconds

// =============================================================================
// GRACEFUL SHUTDOWN HANDLERS
// =============================================================================

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Stop memory monitoring
  clearInterval(memoryMonitorInterval);
  console.log('✅ Memory monitoring stopped');

  // Close all SSE connections and cleanup heartbeats
  console.log(`📡 Closing ${sseConnections.size} SSE connections...`);
  for (const client of sseConnections) {
    try {
      // Clear heartbeat interval if exists
      const heartbeat = sseHeartbeats.get(client);
      if (heartbeat) {
        clearInterval(heartbeat);
        sseHeartbeats.delete(client);
      }

      // Close connection
      if (!client.destroyed && client.writable) {
        client.write('data: {"type":"shutdown","message":"Server shutting down"}\n\n');
        client.end();
      }
    } catch (error) {
      console.warn('⚠️ Error closing SSE client:', error.message);
    }
  }
  sseConnections.clear();
  sseHeartbeats.clear();
  console.log('✅ All SSE connections and heartbeats cleared');

  // Close file watcher
  if (fileWatcher) {
    console.log('📂 Closing file watcher...');
    try {
      await fileWatcher.close();
      console.log('✅ File watcher closed');
    } catch (error) {
      console.warn('⚠️ Error closing file watcher:', error.message);
    }
  }

  // Close database connections
  if (db) {
    console.log('🗄️ Closing main database connection...');
    try {
      db.close();
      console.log('✅ Main database closed');
    } catch (error) {
      console.warn('⚠️ Error closing main database:', error.message);
    }
  }

  if (agentPagesDb) {
    console.log('🗄️ Closing agent pages database connection...');
    try {
      agentPagesDb.close();
      console.log('✅ Agent pages database closed');
    } catch (error) {
      console.warn('⚠️ Error closing agent pages database:', error.message);
    }
  }

  // Log final memory usage
  console.log('\n📊 Final Memory Report:');
  logMemoryUsage();

  console.log('\n✅ Graceful shutdown complete');
  process.exit(0);
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  logMemoryUsage();
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  logMemoryUsage();
});

export default app;