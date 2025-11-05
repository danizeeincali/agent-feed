import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
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
import dbSelector from './config/database-selector.js';
import aviControlRouter from './routes/avi-control.js';
import monitoringRouter from './routes/monitoring.js';
import streamingMonitoringRouter from './routes/streaming-monitoring.js';
import reasoningBankRouter from './routes/reasoningbank.js';
import userSettingsRouter, { initializeUserSettingsRoutes } from './routes/user-settings.js';
import onboardingRouter from './routes/onboarding/index.js';
import systemInitializationRouter, { initializeSystemRoutes } from './routes/system-initialization.js';
import agentIntroductionRouter from './routes/agents-introduction.js';
import bridgesRouter, { initializeBridgeRoutes } from './routes/bridges.js';
// Phase 5: Monitoring service integration
import { MonitoringService, AlertingService } from './services/monitoring-service.js';
// Work queue repository - dynamically selects SQLite or PostgreSQL
import workQueueSelector from './config/work-queue-selector.js';

// Proactive agent work queue (for link-logger, etc.)
import { WorkQueueRepository } from './repositories/work-queue-repository.js';
import { processPostForProactiveAgents } from './services/ticket-creation-service.cjs';

// WebSocket service for real-time updates
import websocketService from './services/websocket-service.js';

// Ticket status service for post/comment ticket tracking
import ticketStatusService from './services/ticket-status-service.js';

// AVI Orchestrator (Phase 1)
import { startOrchestrator, stopOrchestrator } from './avi/orchestrator.js';

// AVI Session Manager (Phase 2) - Persistent AVI for DM and Q&A
import { getAviSession } from './avi/session-manager.js';

// Security middleware imports
import security from './middleware/security.js';
import auth from './middleware/auth.js';
import { protectCriticalPaths } from './middleware/protectCriticalPaths.js';
import { readFileSync } from 'fs';

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

// Initialize proactive agent work queue (for link-logger, follow-ups, etc.)
const proactiveWorkQueue = new WorkQueueRepository(db);
console.log('✅ Proactive agent work queue initialized (SQLite for proactive agents)');

// Track file watcher for cleanup
let fileWatcher = null;

// Initialize database selector (PostgreSQL or SQLite based on environment)
await dbSelector.initialize();

// Initialize work queue selector (must be called after database connections are established)
workQueueSelector.initialize(db);
console.log('✅ Work queue selector initialized');

// Note: System agent templates already seeded in database (Phase 1: AVI Architecture)
// Templates are stored in config/system/agent-templates/*.json
// And persisted in system_agent_templates table
if (process.env.USE_POSTGRES === 'true') {
  console.log('✅ System agent templates ready (22 templates in database)');
}

// Export database connections and websocket service for use in routes (maintains backward compatibility)
export { db, agentPagesDb, websocketService };

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

// Initialize user settings routes with database
if (db) {
  initializeUserSettingsRoutes(db);
  console.log('✅ User settings system initialized');
}

// Initialize system initialization routes with database
if (db) {
  initializeSystemRoutes(db);
  console.log('✅ System initialization routes ready');
}

// Initialize bridge routes with database
if (db) {
  initializeBridgeRoutes(db);
  console.log('✅ Bridge routes initialized');
}

// Initialize auto-registration middleware for agent pages
if (agentPagesDb) {
  fileWatcher = initializeAutoRegistration(agentPagesDb, AGENT_PAGES_DIR);
  // Initialize agent pages routes with database
  initializeAgentPagesRoutes(agentPagesDb);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Make database available to all routes via app.locals
app.locals.db = db;
app.locals.agentPagesDb = agentPagesDb;

// Load security configuration
let securityConfig;
try {
  const configPath = join(__dirname, '../config/security-config.json');
  securityConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  console.log('✅ Security configuration loaded');
} catch (error) {
  console.warn('⚠️  Security config not found, using defaults');
  securityConfig = {};
}

// ============================================================================
// SECURITY MIDDLEWARE - Applied in order of priority
// ============================================================================

// 1. Security Headers (Helmet) - Must be first
app.use(security.securityHeaders);

// 2. Request Size Validation - Prevent large payload attacks
app.use(security.validateRequestSize);

// 3. CORS - Configured with whitelist
const corsWhitelist = securityConfig.cors?.whitelist || [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (corsWhitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: securityConfig.cors?.credentials !== false,
  methods: securityConfig.cors?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: securityConfig.cors?.allowedHeaders || [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-CSRF-Token',
    'X-Session-ID',
    'Cache-Control'
  ],
  exposedHeaders: securityConfig.cors?.exposedHeaders || [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
}));

// 4. Body Parsers with size limits
const maxSize = securityConfig.inputValidation?.maxRequestSize || '10mb';
app.use(express.json({ limit: maxSize }));
app.use(express.urlencoded({ extended: true, limit: maxSize }));

// 5. Global Rate Limiter - Prevent DoS
app.use(security.globalRateLimiter);

// 6. Speed Limiter - Slow down excessive requests
app.use(security.speedLimiter);

// 7. Protected Path Middleware - Block access to /prod/, /node_modules/, /.git/
app.use(protectCriticalPaths);

// ============================================================================
// REMOVED AGGRESSIVE SECURITY (Single-user VPS - User accepts risk)
// ============================================================================
// The following middleware has been disabled for single-user VPS deployment:
// - security.sanitizeInputs (NoSQL injection prevention)
// - security.preventParameterPollution (HPP protection)
// - security.preventSQLInjection (SQL keyword blocking - too aggressive)
// - security.preventXSS (XSS pattern blocking - blocks normal posts)
//
// Remaining Protection:
// ✅ Rate limiting (DoS prevention)
// ✅ CORS (origin validation)
// ✅ Helmet (security headers)
// ✅ Request size limits (memory protection)
// ✅ Protected path blocking (/prod/, /node_modules/, /.git/)
//
// Risk Acceptance:
// - Single-user VPS deployment
// - User accepts responsibility for input validation
// - Protected paths prevent critical system damage
// - Database backups available for recovery
// ============================================================================

console.log('✅ Minimal security middleware initialized (single-user mode)');

// ============================================================================
// AVI HELPER FUNCTIONS (Phase 3: Post Creation Integration)
// ============================================================================

/**
 * Check if text contains URL
 */
function containsURL(text) {
  const urlPattern = /https?:\/\/[^\s]+/;
  return urlPattern.test(text);
}

/**
 * Detect if post is a question for AVI
 * Questions without URLs are directed to AVI
 * Questions with URLs go to link-logger-agent
 */
function isAviQuestion(content) {
  const lowerContent = content.toLowerCase();

  // Skip if contains URL (goes to link-logger)
  if (containsURL(content)) {
    return false;
  }

  // Pattern 1: Direct address
  if (lowerContent.includes('avi') || lowerContent.includes('λvi')) {
    return true;
  }

  // Pattern 2: Question marks
  if (content.includes('?')) {
    return true;
  }

  // Pattern 3: Common command/question patterns
  const questionPatterns = [
    /^(what|where|when|why|how|who|status|help)/i,
    /directory/i,
    /working on/i,
    /tell me/i,
    /show me/i
  ];

  return questionPatterns.some(pattern => pattern.test(content));
}

/**
 * Handle AVI response to post (async)
 * Does not block post creation
 */
async function handleAviResponse(post) {
  try {
    console.log(`💬 Post ${post.id} detected as AVI question`);

    // Get AVI session (initializes on first use)
    const aviSession = getAviSession({
      idleTimeout: 60 * 60 * 1000 // 60 minutes
    });

    // Chat with AVI
    const result = await aviSession.chat(post.content, {
      includeSystemPrompt: !aviSession.sessionActive, // Only first time
      maxTokens: 2000 // Keep responses concise
    });

    if (!result.success) {
      console.error('❌ AVI chat failed:', result.error);
      return;
    }

    console.log(`✅ AVI generated response (${result.tokensUsed} tokens)`);

    // Post AVI's response as comment
    const comment = {
      content: result.response,
      author: 'avi',        // Backward compatibility
      author_agent: 'avi',  // Primary field
      parent_id: null,
      mentioned_users: [],
      skipTicket: true // Don't create ticket for AVI's response
    };

    const response = await fetch(
      `http://localhost:3001/api/agent-posts/${post.id}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to post AVI comment:', errorText);
      return;
    }

    const commentResult = await response.json();
    console.log(`✅ AVI comment posted: ${commentResult.data?.id}`);
    console.log(`   Session: ${result.sessionId}, Total tokens: ${result.totalTokens}`);

  } catch (error) {
    console.error('❌ Error handling AVI response:', error);
  }
}

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

// Mount AVI Control routes (Phase 2: Orchestrator Core)
app.use('/api/avi', aviControlRouter);

// Mount Phase 5 Monitoring routes
app.use('/api/monitoring', monitoringRouter);

// Mount Streaming Loop Protection Monitoring routes
app.use('/api/streaming-monitoring', streamingMonitoringRouter);

// Mount ReasoningBank routes (Memory System)
app.use('/api/reasoningbank', reasoningBankRouter);

// User Settings routes
app.use('/api/user-settings', userSettingsRouter);

// Onboarding routes
app.use('/api/onboarding', onboardingRouter);

// System initialization routes
app.use('/api/system', systemInitializationRouter);

// Agent introduction routes
app.use('/api/agents', agentIntroductionRouter);

// Bridge routes (Hemingway Bridge engagement system)
app.use('/api/bridges', bridgesRouter);

// ============================================================================
// SECURITY & AUTHENTICATION ROUTES
// ============================================================================

// Health check endpoint (public, no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Security report endpoint (protected - requires admin role)
app.get('/api/security/report',
  auth.authenticateJWT,
  auth.requireRole(auth.ROLES.ADMIN),
  security.getSuspiciousActivityReport
);

// Authentication endpoints
app.post('/api/auth/login',
  security.authRateLimiter, // Strict rate limiting for login
  security.validators.email(),
  security.validators.password(),
  security.handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.validatedData;

      // TODO: Replace with real user lookup from database
      // This is a demo implementation
      const mockUser = {
        userId: 'user_123',
        username: 'demo',
        email: 'demo@example.com',
        passwordHash: await auth.hashPassword('Demo123!'), // Demo password
        role: auth.ROLES.USER
      };

      // Verify password
      const isValid = await auth.verifyPassword(password, mockUser.passwordHash);

      if (!isValid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Generate tokens
      const accessToken = auth.generateAccessToken({
        userId: mockUser.userId,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role
      });

      const refreshToken = auth.generateRefreshToken({
        userId: mockUser.userId,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role
      });

      // Create session
      const sessionId = auth.createSession(mockUser.userId, {
        loginTime: Date.now(),
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        accessToken,
        refreshToken,
        sessionId,
        expiresIn: '1h',
        user: {
          userId: mockUser.userId,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during login'
      });
    }
  }
);

// Token refresh endpoint
app.post('/api/auth/refresh', auth.refreshAccessToken);

// Logout endpoint
app.post('/api/auth/logout',
  auth.authenticateJWT,
  (req, res) => {
    // Revoke refresh token if provided
    if (req.body.refreshToken) {
      auth.revokeRefreshToken(req, res);
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  }
);

// Generate API key endpoint (protected)
app.post('/api/auth/api-key',
  auth.authenticateJWT,
  (req, res) => {
    const apiKey = auth.generateAPIKey(
      req.user.userId,
      req.body.description || 'API Key'
    );

    res.json({
      apiKey,
      description: req.body.description || 'API Key',
      createdAt: new Date().toISOString()
    });
  }
);

// Protected endpoint example - requires authentication
app.get('/api/protected/example',
  auth.authenticateJWT,
  auth.userRateLimiter(), // Per-user rate limiting
  (req, res) => {
    res.json({
      message: 'This is a protected endpoint',
      user: {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role
      }
    });
  }
);

// Admin-only endpoint example
app.get('/api/admin/example',
  auth.authenticateJWT,
  auth.requireRole(auth.ROLES.ADMIN),
  (req, res) => {
    res.json({
      message: 'This is an admin-only endpoint',
      user: req.user
    });
  }
);

// Permission-based endpoint example
app.post('/api/content/create',
  auth.authenticateJWT,
  auth.requirePermission(auth.PERMISSIONS.WRITE_OWN),
  (req, res) => {
    res.json({
      message: 'Content created successfully',
      user: req.user
    });
  }
);

console.log('✅ Security and authentication routes initialized');

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
const KEEPALIVE_INTERVAL = 30000; // 30 seconds - SSE comment keepalive to prevent proxy timeout
const HEARTBEAT_INTERVAL = 45000; // 45 seconds - Heartbeat data event for client health monitoring
const CONNECTION_TIMEOUT = 3600000; // 1 hour idle timeout (increased from 5 minutes)

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
      connectionId: message.connectionId || message.data?.connectionId,
      // Preserve heartbeat/connection health fields
      uptime: message.uptime || message.data?.uptime,
      lastActivity: message.lastActivity || message.data?.lastActivity
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
    // Use database selector for dual database support (PostgreSQL or SQLite)
    const userId = req.query.userId || 'anonymous';

    // Parse tier filtering parameters
    const tierParam = req.query.tier;
    const includeSystemParam = req.query.include_system;

    // Validate tier parameter
    if (tierParam && !['1', '2', 'all'].includes(tierParam)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier parameter',
        message: 'Tier must be 1, 2, or "all"',
        code: 'INVALID_TIER'
      });
    }

    // Build filter options
    const options = {};
    if (tierParam) {
      options.tier = tierParam === 'all' ? 'all' : Number(tierParam);
    }
    if (includeSystemParam) {
      options.include_system = includeSystemParam === 'true';
    }

    // Get filtered agents
    const filteredAgents = await dbSelector.getAllAgents(userId, options);

    // Get all agents for metadata calculation
    const allAgents = await dbSelector.getAllAgents(userId, { tier: 'all' });

    // Calculate tier metadata
    const appliedTier = options.tier !== undefined ? options.tier : 1;
    const metadata = {
      total: allAgents.length,
      tier1: allAgents.filter(a => a.tier === 1).length,
      tier2: allAgents.filter(a => a.tier === 2).length,
      protected: allAgents.filter(a => a.visibility === 'protected').length,
      filtered: filteredAgents.length,
      appliedTier: String(appliedTier)
    };

    res.json({
      success: true,
      data: filteredAgents,
      metadata,
      timestamp: new Date().toISOString(),
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'Filesystem'
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

// API v1 endpoint: /api/v1/claude-live/prod/agents
// New endpoint with tier filtering and modified response format
app.get('/api/v1/claude-live/prod/agents', async (req, res) => {
  try {
    console.log(`\n🌐 GET /api/v1/claude-live/prod/agents - Query params:`, req.query);

    // Use database selector for dual database support (PostgreSQL or SQLite)
    const userId = req.query.userId || 'anonymous';

    // Parse tier filtering parameters
    const tierParam = req.query.tier;
    console.log(`📊 Tier parameter: "${tierParam}" (type: ${typeof tierParam})`);

    // Validate tier parameter
    if (tierParam && !['1', '2', 'all'].includes(tierParam)) {
      console.log(`❌ Invalid tier parameter: ${tierParam}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid tier parameter',
        message: 'Tier must be 1, 2, or "all"',
        code: 'INVALID_TIER'
      });
    }

    // Build filter options
    const options = {};
    if (tierParam) {
      options.tier = tierParam === 'all' ? 'all' : Number(tierParam);
    }
    console.log(`⚙️  Filter options:`, options);

    // Get filtered agents
    console.log(`📡 Calling dbSelector.getAllAgents with options:`, options);
    const filteredAgents = await dbSelector.getAllAgents(userId, options);
    console.log(`✅ Received ${filteredAgents.length} filtered agents from repository`);

    // Get all agents for metadata calculation
    const allAgents = await dbSelector.getAllAgents(userId, { tier: 'all' });
    console.log(`📊 Total agents for metadata: ${allAgents.length}`);

    // Calculate tier metadata
    const appliedTier = options.tier !== undefined ? options.tier : 1;
    const metadata = {
      total: allAgents.length,
      tier1: allAgents.filter(a => a.tier === 1).length,
      tier2: allAgents.filter(a => a.tier === 2).length,
      protected: allAgents.filter(a => a.visibility === 'protected').length,
      filtered: filteredAgents.length,
      appliedTier: String(appliedTier)
    };
    console.log(`📊 Metadata:`, metadata);

    // Log response details before sending
    console.log(`📤 Sending response with ${filteredAgents.length} agents`);
    if (filteredAgents.length > 0) {
      console.log(`📤 First agent:`, { name: filteredAgents[0].name, tier: filteredAgents[0].tier });
    } else {
      console.log(`⚠️  WARNING: Sending empty agents array!`);
    }

    // Return response with "agents" field instead of "data"
    res.json({
      success: true,
      agents: filteredAgents,
      metadata
    });
  } catch (error) {
    console.error('❌ Error loading agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load agents',
      message: error.message
    });
  }
});

// Helper function to load tools from agent markdown file
function loadAgentTools(agentName) {
  try {
    const agentFilePath = '/workspaces/agent-feed/prod/.claude/agents/' + agentName + '.md';
    const fileContent = readFileSync(agentFilePath, 'utf-8');

    // Extract YAML frontmatter
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) {
      return [];
    }

    // Parse tools from frontmatter
    const frontmatter = frontmatterMatch[1];
    const toolsMatch = frontmatter.match(/tools:\s*\[([^\]]+)\]/);

    if (!toolsMatch) {
      return [];
    }

    // Extract and clean tool names
    const tools = toolsMatch[1]
      .split(',')
      .map(tool => tool.trim().replace(/^['"]|['"]$/g, ''))
      .filter(tool => tool.length > 0);

    return tools;
  } catch (error) {
    // Agent markdown file doesn't exist or can't be read - return empty array
    console.log(`Could not load tools for agent ${agentName}:`, error.message);
    return [];
  }
}

app.get('/api/agents/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.query.userId || 'anonymous';

    // Try slug lookup first (primary method)
    let agent = await dbSelector.getAgentBySlug(slug, userId);
    let lookupMethod = 'slug';

    // Fallback to name lookup for backward compatibility
    if (!agent) {
      agent = await dbSelector.getAgentByName(slug, userId);
      lookupMethod = 'name';
    }

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `No agent found with slug: ${slug}`,
        attempted_lookups: ['slug', 'name'],
        source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
      });
    }

    // Load tools from agent markdown file
    const tools = loadAgentTools(agent.name || agent.slug || slug);
    agent.tools = tools;

    res.json({
      success: true,
      data: agent,
      lookup_method: lookupMethod,
      timestamp: new Date().toISOString(),
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
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

app.get('/api/agent-posts', async (req, res) => {
  try {
    const { limit = 20, offset = 0, filter = 'all', search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const userId = req.query.userId || 'anonymous';

    // Validate and sanitize inputs
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // Use database selector for dual database support
    const posts = await dbSelector.getAllPosts(userId, {
      limit: parsedLimit,
      offset: parsedOffset,
      orderBy: `${sortBy} ${sortOrder}`
    });

    return res.json({
      success: true,
      data: posts,
      total: posts.length,
      limit: parsedLimit,
      offset: parsedOffset,
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
      message: error.message
    });
  }
});

// POST endpoint to create new agent posts
app.post('/api/v1/agent-posts', async (req, res) => {
  try {
    const { title, content, author_agent, metadata = {} } = req.body;
    const userId = req.body.userId || 'anonymous';

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

    // Create post data
    const postData = {
      author_agent: author_agent.trim(),
      content: content.trim(),
      title: title.trim(),
      tags: metadata.tags || [],
      metadata: {
        postType: metadata.postType || 'quick',
        wordCount: metadata.wordCount || content.trim().split(/\s+/).length,
        readingTime: metadata.readingTime || 1,
        ...metadata
      }
    };

    // Use database selector to create post
    const createdPost = await dbSelector.createPost(userId, postData);

    console.log(`✅ Post created in ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'}:`, createdPost.id);

    // Create work queue ticket for AVI orchestrator (Post-to-Ticket Integration)
    // SKIP ticket creation if this is a direct AVI question (handled by AVI DM system)
    let ticket = null;
    const isDirectAviQuestion = isAviQuestion(content);

    if (!isDirectAviQuestion) {
      try {
        // Helper to sanitize content (remove null bytes that break PostgreSQL JSONB)
        const sanitize = (str) => str ? str.replace(/\u0000/g, '') : '';

        ticket = await workQueueSelector.repository.createTicket({
          user_id: userId,
          post_id: createdPost.id,
          post_content: createdPost.content,
          post_author: createdPost.author_agent,
          post_metadata: {
            // Spread business metadata first (allows overrides)
            ...metadata,

            // Outcome posting metadata (for WorkContextExtractor)
            // These fields enable outcome comment posting for post-originated tickets
            type: 'post',
            parent_post_id: createdPost.id,  // Post replies to itself (top-level comment)
            parent_post_title: sanitize(createdPost.title) || '',
            parent_post_content: sanitize(createdPost.content) || '',

            // Existing metadata (override to ensure correctness)
            title: createdPost.title,
            tags: createdPost.tags || [],
          },
          assigned_agent: null, // Let orchestrator assign
          priority: 5 // Default medium priority
        });

        console.log(`✅ Work ticket created for orchestrator: ticket-${ticket.id}`);
      } catch (ticketError) {
        console.error('❌ Failed to create work ticket:', ticketError);
        // Log error but don't fail the post creation
        // This maintains backward compatibility
      }
    } else {
      console.log(`⏭️ Skipping ticket creation - Post is direct AVI question (handled by AVI DM)`);
    }

    // Process URLs for proactive agents (link-logger, follow-ups, etc.)
    try {
      const proactiveTickets = await processPostForProactiveAgents(createdPost, proactiveWorkQueue);
      if (proactiveTickets.length > 0) {
        console.log(`✅ Created ${proactiveTickets.length} proactive agent ticket(s)`);
      }
    } catch (proactiveError) {
      console.error('❌ Proactive agent ticket creation failed:', proactiveError);
      // Log error but don't fail the post creation
    }

    // Check if post is directed at AVI (not a URL for link-logger)
    if (isAviQuestion(content)) {
      console.log(`💬 Post ${createdPost.id} appears to be question for AVI`);

      // Trigger AVI response (async, don't wait)
      handleAviResponse(createdPost).catch(error => {
        console.error('❌ AVI response error:', error);
      });
    }

    // Return created post
    res.status(201).json({
      success: true,
      data: createdPost,
      ticket: ticket ? { id: ticket.id, status: ticket.status } : null,
      message: 'Post created successfully',
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
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

app.get('/api/v1/agent-posts', async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      filter = 'all',
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    const userId = req.query.userId || 'anonymous';

    // Validate and sanitize inputs
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // Use database selector for dual database support (matches /api/agent-posts pattern)
    const posts = await dbSelector.getAllPosts(userId, {
      limit: parsedLimit,
      offset: parsedOffset,
      orderBy: `${sortBy} ${sortOrder}`
    });

    // Always enrich posts with ticket status
    let enrichedPosts = posts;
    if (db && posts.length > 0) {
      try {
        const postIds = posts.map(p => p.id);
        const placeholders = postIds.map(() => '?').join(',');

        // Use db (database.db) where work_queue_tickets has valid post_id values
        const ticketsStmt = db.prepare(`
          SELECT
            id,
            post_id,
            agent_id,
            status,
            retry_count,
            created_at,
            assigned_at,
            completed_at,
            metadata,
            result
          FROM work_queue_tickets
          WHERE post_id IN (${placeholders})
          ORDER BY created_at DESC
        `);

        const allTickets = ticketsStmt.all(...postIds);
        console.log(`🎫 Found ${allTickets.length} tickets for ${postIds.length} posts`);

        // Deserialize and group tickets by post_id
        const ticketsByPost = {};
        allTickets.forEach(ticket => {
          if (!ticketsByPost[ticket.post_id]) {
            ticketsByPost[ticket.post_id] = [];
          }
          // Deserialize JSON fields
          ticketsByPost[ticket.post_id].push({
            ...ticket,
            metadata: ticket.metadata ? JSON.parse(ticket.metadata) : null,
            result: ticket.result ? JSON.parse(ticket.result) : null
          });
        });

        // Add ticket status to each post
        enrichedPosts = posts.map(post => {
          try {
            const tickets = ticketsByPost[post.id] || [];
            const summary = ticketStatusService.getTicketStatusSummary(tickets);

            return {
              ...post,
              ticket_status: summary
            };
          } catch (postTicketError) {
            console.error(`Error processing ticket status for post ${post.id}:`, postTicketError);
            // Graceful fallback for individual post
            return {
              ...post,
              ticket_status: {
                total: 0,
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                agents: []
              }
            };
          }
        });
      } catch (ticketError) {
        console.error('Error enriching posts with ticket status:', ticketError);
        // Continue without ticket data on error - add null ticket_status to all posts
        enrichedPosts = posts.map(post => ({
          ...post,
          ticket_status: null
        }));
      }
    } else {
      // No posts or no database - add empty ticket status
      enrichedPosts = posts.map(post => ({
        ...post,
        ticket_status: {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          agents: []
        }
      }));
    }

    return res.json({
      success: true,
      version: "1.0",
      data: enrichedPosts,
      meta: {
        total: posts.length,
        limit: parsedLimit,
        offset: parsedOffset,
        returned: posts.length,
        timestamp: new Date().toISOString()
      },
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  } catch (error) {
    console.error('❌ Error in /api/v1/agent-posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent posts',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/agent-posts/:id
 * Get a single agent post by ID
 */
app.get('/api/v1/agent-posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }

    // Get post from database
    const post = await dbSelector.getPostById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    return res.json({
      success: true,
      version: "1.0",
      data: post,
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  } catch (error) {
    console.error(`❌ Error in GET /api/v1/agent-posts/:id:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent post',
      details: error.message
    });
  }
});

/**
 * GET /api/agent-posts/:postId/tickets
 * Get ticket status for a specific post
 * Returns all tickets associated with the post and a status summary
 */
app.get('/api/agent-posts/:postId/tickets', async (req, res) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required',
        code: 'MISSING_POST_ID'
      });
    }

    // Get ticket status from main database (where work_queue_tickets are stored)
    const ticketStatus = ticketStatusService.getPostTicketStatus(postId, db);

    return res.json({
      success: true,
      data: ticketStatus,
      meta: {
        post_id: postId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in GET /api/agent-posts/:postId/tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket status',
      details: error.message
    });
  }
});

/**
 * GET /api/tickets/stats
 * Get global ticket statistics across all posts
 * Useful for dashboard/monitoring views
 */
app.get('/api/tickets/stats', async (req, res) => {
  try {
    const stats = ticketStatusService.getGlobalTicketStats(db);

    return res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in GET /api/tickets/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket statistics',
      details: error.message
    });
  }
});

/**
 * GET /api/search/posts
 * Search agent posts by title, content, or author
 */
app.get('/api/search/posts', async (req, res) => {
  try {
    // Extract and validate query parameters
    const query = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    // Validate required query parameter
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query parameter 'q' is required",
        code: 'MISSING_QUERY'
      });
    }

    // Validate query length
    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be less than 500 characters',
        code: 'QUERY_TOO_LONG'
      });
    }

    // Call database selector search method
    const results = await dbSelector.searchPosts(query, limit, offset);

    // Return formatted response
    res.json({
      success: true,
      data: {
        items: results.posts,
        total: results.total,
        query: query
      }
    });

  } catch (error) {
    console.error('❌ Search endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed. Please try again.',
      code: 'DATABASE_ERROR'
    });
  }
});

/**
 * DELETE /api/v1/agent-posts/:id
 * Delete an agent post by ID
 */
app.delete('/api/v1/agent-posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }

    // Check if post exists
    const post = await dbSelector.getPostById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Delete post from database
    await dbSelector.deletePost(id);

    return res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error(`❌ Error in DELETE /api/v1/agent-posts/:id:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent post',
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
app.get('/api/agent-posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Get comments using database selector
    const comments = await dbSelector.getCommentsByPostId(postId, userId);

    console.log(`✅ Fetched ${comments.length} comments for post ${postId} from ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'}`);

    res.json({
      success: true,
      data: comments,
      total: comments.length,
      timestamp: new Date().toISOString(),
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
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
app.post('/api/agent-posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, author, author_agent, parent_id, mentioned_users, content_type } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // Accept either author or author_agent for backward compatibility
    const authorValue = author_agent || author || userId;

    if (!authorValue || !authorValue.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Author or author_agent is required'
      });
    }

    // Prepare comment data
    const commentData = {
      id: uuidv4(),
      post_id: postId,
      content: content.trim(),
      // Smart default: markdown for agents, text for users (unless explicitly overridden)
      content_type: content_type || (authorValue.trim() !== 'anonymous' && authorValue.trim() !== userId ? 'markdown' : 'text'),
      author: author || authorValue.trim(),  // Backward compatibility
      author_agent: authorValue.trim(),       // Primary field
      user_id: userId,                        // NEW: Store user_id for proper display name lookup
      parent_id: parent_id || null,
      mentioned_users: mentioned_users || [],
      depth: 0
    };

    // Create comment using database selector
    const createdComment = await dbSelector.createComment(userId, commentData);

    console.log(`✅ Created comment ${createdComment.id} for post ${postId} in ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'}`);

    // Broadcast comment via WebSocket for real-time updates
    try {
      if (websocketService && websocketService.broadcastCommentAdded) {
        websocketService.broadcastCommentAdded({
          postId: postId,
          commentId: createdComment.id,
          parentCommentId: parent_id || null,
          author: createdComment.author_agent || userId,
          content: createdComment.content,
          comment: createdComment  // Full comment object for frontend
        });
      }
    } catch (wsError) {
      console.error('❌ Failed to broadcast comment via WebSocket:', wsError);
      // Don't fail the request if WebSocket broadcast fails
    }

    // Create work queue ticket for AVI orchestrator (Comment-to-Ticket Integration)
    // CRITICAL: Check skipTicket parameter to prevent infinite loops
    // When agents post outcomes, they set skipTicket=true to avoid creating new tickets
    const skipTicket = req.body.skipTicket === true;

    let ticket = null;
    if (!skipTicket) {
      try {
        // Fetch parent post for context
        const parentPost = await dbSelector.getPostById(postId);

        ticket = await workQueueSelector.repository.createTicket({
          user_id: userId,
          post_id: createdComment.id, // Use comment ID as ticket identifier
          post_content: createdComment.content,
          post_author: createdComment.author_agent,
          post_metadata: {
            type: 'comment', // Discriminator for comment vs post
            parent_post_id: postId,
            parent_post_title: parentPost?.title || 'Unknown Post',
            parent_post_content: parentPost?.content || '',
            parent_comment_id: parent_id || null,
            mentioned_users: mentioned_users || [],
            depth: commentData.depth || 0
          },
          assigned_agent: null, // Let orchestrator assign
          priority: 5 // Default medium priority
        });

        console.log(`✅ Work ticket created for comment: ticket-${ticket.id}`);
      } catch (ticketError) {
        console.error('❌ Failed to create work ticket for comment:', ticketError);
        // Log error but don't fail the comment creation
        // This maintains backward compatibility
      }
    } else {
      console.log(`⏭️  Skipping ticket creation for comment ${createdComment.id} (skipTicket=true)`);
    }

    res.status(201).json({
      success: true,
      data: createdComment,
      ticket: ticket ? { id: ticket.id, status: ticket.status } : null,
      message: 'Comment created successfully',
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
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

// =============================================================================
// COMMENTS API V1 ENDPOINTS - For frontend compatibility
// =============================================================================

/**
 * GET /api/v1/agent-posts/:postId/comments
 * Get all comments for a specific post (V1 endpoint for frontend)
 */
app.get('/api/v1/agent-posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Get comments using database selector
    const comments = await dbSelector.getCommentsByPostId(postId, userId);

    console.log(`✅ Fetched ${comments.length} comments for post ${postId} from ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'} (V1 endpoint)`);

    res.json({
      success: true,
      data: comments,
      total: comments.length,
      timestamp: new Date().toISOString(),
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });

  } catch (error) {
    console.error('❌ Error fetching comments (V1):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/agent-posts/:postId/comments
 * Create a new comment for a specific post (V1 endpoint for frontend)
 */
app.post('/api/v1/agent-posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, author, author_agent, authorAgent, parent_id, mentioned_users, content_type } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // Accept multiple field name variations for compatibility
    const authorValue = author_agent || authorAgent || author || userId;

    if (!authorValue || !authorValue.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Author or author_agent is required'
      });
    }

    // Prepare comment data
    const commentData = {
      id: uuidv4(),
      post_id: postId,
      content: content.trim(),
      // Smart default: markdown for agents, text for users (unless explicitly overridden)
      content_type: content_type || (authorValue.trim() !== 'anonymous' && authorValue.trim() !== userId ? 'markdown' : 'text'),
      author: author || authorValue.trim(),  // Backward compatibility
      author_agent: authorValue.trim(),       // Primary field
      user_id: userId,                        // NEW: Store user_id for proper display name lookup
      parent_id: parent_id || null,
      mentioned_users: mentioned_users || [],
      depth: 0
    };

    // Create comment using database selector
    const createdComment = await dbSelector.createComment(userId, commentData);

    console.log(`✅ Created comment ${createdComment.id} for post ${postId} in ${dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'} (V1 endpoint)`);

    // Broadcast comment via WebSocket for real-time updates
    try {
      if (websocketService && websocketService.broadcastCommentAdded) {
        websocketService.broadcastCommentAdded({
          postId: postId,
          commentId: createdComment.id,
          parentCommentId: parent_id || null,
          author: createdComment.author_agent || userId,
          content: createdComment.content,
          comment: createdComment  // Full comment object for frontend
        });
      }
    } catch (wsError) {
      console.error('❌ Failed to broadcast comment via WebSocket:', wsError);
      // Don't fail the request if WebSocket broadcast fails
    }

    // Create work queue ticket for AVI orchestrator (Comment-to-Ticket Integration)
    // CRITICAL: Check skipTicket parameter to prevent infinite loops
    const skipTicket = req.body.skipTicket === true;

    let ticket = null;
    if (!skipTicket) {
      try {
        // Fetch parent post for context
        const parentPost = await dbSelector.getPostById(postId);

        ticket = await workQueueSelector.repository.createTicket({
          user_id: userId,
          post_id: createdComment.id,
          comment_id: createdComment.id,
          content: content.trim(),
          context: {
            parent_post: parentPost ? {
              id: parentPost.id,
              content: parentPost.content,
              author: parentPost.authorAgent
            } : null,
            comment: {
              id: createdComment.id,
              content: createdComment.content,
              author: createdComment.author_agent
            }
          }
        });

        console.log(`✅ Created work queue ticket ${ticket.id} for comment ${createdComment.id}`);
      } catch (ticketError) {
        console.error('❌ Failed to create work queue ticket:', ticketError);
        // Don't fail the entire request if ticket creation fails
      }
    }

    res.status(201).json({
      success: true,
      data: createdComment,
      ticket: ticket ? { id: ticket.id, status: ticket.status } : null,
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });

  } catch (error) {
    console.error('❌ Error creating comment (V1):', error);
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
 * NOTE: Currently only supported in SQLite mode
 */
app.put('/api/agent-posts/:postId/comments/:commentId/like', (req, res) => {
  try {
    const { postId, commentId } = req.params;

    // PostgreSQL schema doesn't support likes yet
    if (dbSelector.usePostgres) {
      return res.status(501).json({
        success: false,
        error: 'Comment likes are not yet supported in PostgreSQL mode',
        message: 'This feature is only available when using SQLite',
        source: 'PostgreSQL'
      });
    }

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        source: 'SQLite'
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
        error: 'Comment not found',
        source: 'SQLite'
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

    console.log(`✅ Liked comment ${commentId} in SQLite, new like count: ${parsedComment.likes}`);

    res.json({
      success: true,
      data: parsedComment,
      message: 'Comment liked successfully',
      source: 'SQLite'
    });

  } catch (error) {
    console.error('❌ Error liking comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like comment',
      details: error.message,
      source: 'SQLite'
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

  // Track last activity time for connection timeout and connection start time
  let lastActivity = Date.now();
  const connectionStart = Date.now();

  // DUAL-LAYER KEEPALIVE SYSTEM:
  // Layer 1: SSE comment keepalive (prevents proxy/intermediary timeout)
  const keepalive = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      clearInterval(keepalive);
      return;
    }

    try {
      // Send SSE comment (doesn't trigger client events, just keeps connection alive)
      res.write(': keepalive\n\n');
    } catch (error) {
      console.error('⚠️ Error sending keepalive:', error.message);
      clearInterval(keepalive);
    }
  }, KEEPALIVE_INTERVAL);

  // Layer 2: Heartbeat data events (for client-side health monitoring)
  const heartbeat = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      clearInterval(heartbeat);
      clearInterval(keepalive);
      sseConnections.delete(res);
      sseHeartbeats.delete(res);
      return;
    }

    // Check for idle timeout (1 hour max connection age)
    const idleTime = Date.now() - lastActivity;
    if (idleTime > CONNECTION_TIMEOUT) {
      console.log(`⏱️ SSE connection timed out after ${Math.round(idleTime / 1000)}s idle`);
      clearInterval(heartbeat);
      clearInterval(keepalive);
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
      const uptime = Date.now() - connectionStart;
      const heartbeatMessage = validateSSEMessage({
        type: 'heartbeat',
        message: 'Connection alive',
        priority: 'low',
        timestamp: Date.now(),
        uptime: uptime, // Connection uptime in milliseconds
        lastActivity: lastActivity
      });
      res.write(`data: ${JSON.stringify(heartbeatMessage)}\n\n`);
      lastActivity = Date.now();
    } catch (error) {
      console.error('⚠️ Error sending heartbeat:', error.message);
      clearInterval(heartbeat);
      clearInterval(keepalive);
      sseConnections.delete(res);
      sseHeartbeats.delete(res);
    }
  }, HEARTBEAT_INTERVAL);

  // Store both intervals for cleanup
  sseHeartbeats.set(res, { heartbeat, keepalive });

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
    const intervals = sseHeartbeats.get(res);
    if (intervals) {
      if (intervals.heartbeat) clearInterval(intervals.heartbeat);
      if (intervals.keepalive) clearInterval(intervals.keepalive);
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

// ========================================
// AVI PERSISTENT SESSION API (Phase 4 & 5)
// Note: Using /api/avi/dm/* paths to avoid conflicts with existing /api/avi/* orchestrator routes
// ========================================

/**
 * POST /api/avi/dm/chat - Direct messaging with AVI
 * For AVI DM interface or manual testing
 */
app.post('/api/avi/dm/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`💬 AVI DM: "${message.substring(0, 50)}..."`);

    // Get or initialize AVI session
    const aviSession = getAviSession();

    // Process message
    const result = await aviSession.chat(message.trim(), {
      includeSystemPrompt: !aviSession.sessionActive,
      maxTokens: 2000
    });

    res.json({
      success: true,
      data: {
        response: result.response,
        tokensUsed: result.tokensUsed,
        sessionId: result.sessionId,
        sessionStatus: aviSession.getStatus()
      }
    });

  } catch (error) {
    console.error('❌ AVI DM error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AVI chat',
      details: error.message
    });
  }
});

/**
 * GET /api/avi/dm/status - Get AVI session status
 */
app.get('/api/avi/dm/status', (req, res) => {
  const aviSession = getAviSession();
  const status = aviSession.getStatus();

  res.json({
    success: true,
    data: status
  });
});

/**
 * DELETE /api/avi/dm/session - Force cleanup AVI session
 * Useful for testing or manual reset
 */
app.delete('/api/avi/dm/session', (req, res) => {
  const aviSession = getAviSession();
  const statusBefore = aviSession.getStatus();

  aviSession.cleanup();

  res.json({
    success: true,
    message: 'AVI session cleaned up',
    previousSession: statusBefore
  });
});

/**
 * GET /api/avi/dm/metrics - Get AVI usage metrics (Phase 5)
 */
app.get('/api/avi/dm/metrics', (req, res) => {
  const aviSession = getAviSession();
  const status = aviSession.getStatus();

  const metrics = {
    session: {
      active: status.active,
      sessionId: status.sessionId,
      uptime: status.lastActivity ? Date.now() - (status.lastActivity - status.idleTime) : 0
    },
    usage: {
      totalInteractions: status.interactionCount,
      totalTokens: status.totalTokensUsed,
      averageTokensPerInteraction: status.averageTokensPerInteraction
    },
    cost: {
      estimatedCost: (status.totalTokensUsed / 1000000) * 3, // $3/M tokens input
      averageCostPerInteraction: (status.averageTokensPerInteraction / 1000000) * 3
    },
    efficiency: {
      savingsVsSpawnPerQuestion: status.interactionCount > 0
        ? Math.round((1 - (status.totalTokensUsed / (status.interactionCount * 30000))) * 100)
        : 0
    }
  };

  res.json({
    success: true,
    data: metrics
  });
});

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

// Phase 5: Monitoring service instances (module-level for shutdown)
let monitoringService = null;
let alertingService = null;

// CRITICAL FIX: Create HTTP server and initialize Socket.IO BEFORE listening
// This prevents 400 Bad Request errors on /socket.io endpoint
const httpServer = createServer(app);

// Initialize WebSocket service BEFORE server starts listening
try {
  console.log('📡 Initializing WebSocket service (Socket.IO)...');
  websocketService.initialize(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  console.log('✅ WebSocket service initialized BEFORE server listen');
  console.log('   🔌 WebSocket endpoint will be: ws://localhost:' + PORT + '/socket.io/');
  console.log('   📢 Events: ticket:status:update, worker:lifecycle');
} catch (error) {
  console.error('❌ Failed to initialize WebSocket service:', error.message);
  console.warn('   Real-time updates will not be available');
}

// Start server
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 API Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agents API: http://localhost:${PORT}/api/agents`);
  console.log(`📝 Templates API: http://localhost:${PORT}/api/templates`);
  console.log(`📊 Streaming Ticker SSE: http://localhost:${PORT}/api/streaming-ticker/stream`);
  console.log(`📄 Dynamic Pages API: http://localhost:${PORT}/api/agent-pages/agents/:agentId/pages`);
  console.log(`📈 All analytics APIs available`);
  console.log(`🔌 Socket.IO ready at: ws://localhost:${PORT}/socket.io/`);

  // Log initial memory usage
  logMemoryUsage();

  // Initialize Phase 5 Monitoring System
  monitoringService = new MonitoringService();
  alertingService = new AlertingService(null); // Will be set after init

  if (process.env.AVI_MONITORING_ENABLED !== 'false') {
    try {
      console.log('\n📊 Initializing Phase 5 Monitoring System...');
      await monitoringService.initialize();

      // Wire up alerting service
      alertingService.alertManager = monitoringService.alertManager;

      // Initialize monitoring routes with services
      monitoringRouter.initialize(monitoringService, alertingService);

      console.log('✅ Phase 5 Monitoring System active');
      console.log('   📈 Metrics API: http://localhost:' + PORT + '/api/monitoring/metrics');
      console.log('   🏥 Health API: http://localhost:' + PORT + '/api/monitoring/health');
      console.log('   🚨 Alerts API: http://localhost:' + PORT + '/api/monitoring/alerts');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error.message);
      console.warn('   Monitoring endpoints will return mock data');
    }
  } else {
    console.log('\n⚠️  Phase 5 Monitoring disabled (set AVI_MONITORING_ENABLED=true to enable)');
  }

  // Start AVI Orchestrator (Direct start)
  if (process.env.AVI_ORCHESTRATOR_ENABLED !== 'false') {
    try {
      console.log('\n🤖 Starting AVI Orchestrator...');
      // Use workQueueSelector.repository for post/comment tickets (respects USE_POSTGRES)
      // This ensures orchestrator uses the same database mode as the rest of the app
      await startOrchestrator({
        maxWorkers: parseInt(process.env.AVI_MAX_WORKERS) || 5,
        maxContextSize: parseInt(process.env.AVI_MAX_CONTEXT) || 50000,
        pollInterval: parseInt(process.env.AVI_POLL_INTERVAL) || 5000,
        healthCheckInterval: parseInt(process.env.AVI_HEALTH_CHECK_INTERVAL) || 30000
      }, workQueueSelector.repository, websocketService);
      console.log(`✅ AVI Orchestrator started - using ${workQueueSelector.usePostgres ? 'PostgreSQL' : 'SQLite'} work queue`);
      console.log('   📡 WebSocket events enabled for real-time ticket updates');
    } catch (error) {
      console.error('❌ Failed to start AVI Orchestrator:', error);
      console.error('   Server will continue running, but agents will not automatically respond');
      console.error('   Error details:', error.message);
      // Don't crash the server if orchestrator fails - graceful degradation
    }
  } else {
    console.log('\n⚠️  AVI Orchestrator disabled (set AVI_ORCHESTRATOR_ENABLED=true to enable)');
  }
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
  httpServer.close(() => {
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

  // Stop Phase 5 Monitoring System
  if (monitoringService) {
    try {
      console.log('📊 Stopping Phase 5 Monitoring System...');
      await monitoringService.shutdown();
      console.log('✅ Phase 5 Monitoring System stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping monitoring system:', error.message);
    }
  }

  // Stop AVI Orchestrator
  try {
    console.log('🤖 Stopping AVI Orchestrator...');
    await stopOrchestrator();
    console.log('✅ AVI Orchestrator stopped');
  } catch (error) {
    console.warn('⚠️ Error stopping AVI Orchestrator:', error.message);
    // Continue with shutdown even if orchestrator stop fails
  }

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

// Export orchestrator helper functions for routes (Phase 2 disabled for production)
// export {
//   getOrchestratorStatus,
//   isOrchestratorHealthy
// };

export default app;