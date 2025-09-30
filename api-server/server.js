import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { loadAgent, loadAllAgents } from './services/agent-loader.service.js';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../database.db');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  console.log('✅ Token analytics database connected:', DB_PATH);
} catch (error) {
  console.error('❌ Token analytics database error:', error);
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
    authorAgent: mockAgents[0]
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
    authorAgent: mockAgents[1]
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

  let filteredPosts = [...mockAgentPosts];

  if (search) {
    filteredPosts = filteredPosts.filter(post =>
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.content.toLowerCase().includes(search.toLowerCase())
    );
  }

  res.json({
    success: true,
    data: filteredPosts,
    total: filteredPosts.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

app.get('/api/v1/agent-posts', (req, res) => {
  res.json({
    success: true,
    version: "1.0",
    data: mockAgentPosts.slice(0, 2),
    meta: {
      total: 2,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/filter-data', (req, res) => {
  res.json({
    success: true,
    data: {
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

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeat);
      sseConnections.delete(res);
      return;
    }

    const heartbeatMessage = validateSSEMessage({
      type: 'heartbeat',
      message: 'Connection alive',
      priority: 'low',
      timestamp: Date.now()
    });
    res.write(`data: ${JSON.stringify(heartbeatMessage)}\n\n`);
  }, 30000);

  // Send recent messages with validation
  const recentMessages = streamingTickerMessages.slice(-10);
  recentMessages.forEach(message => {
    const validatedMessage = validateSSEMessage(message);
    res.write(`data: ${JSON.stringify(validatedMessage)}\n\n`);
  });

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseConnections.delete(res);
    console.log('📡 SSE client disconnected');
  });

  console.log('📡 SSE client connected to streaming ticker');
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

    // Add to messages array (keep last 100)
    streamingTickerMessages.push(tickerMessage);
    if (streamingTickerMessages.length > 100) {
      streamingTickerMessages.shift();
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
// DYNAMIC AGENT PAGES API ENDPOINTS (Option A)
// =============================================================================

// Mock dynamic pages storage (in-memory for now)
const mockDynamicPages = new Map();

// Initialize with sample data
const samplePages = [
  {
    id: 'personal-todos-dashboard-v3',
    agentId: 'personal-todos-agent',
    title: 'Personal Todos Dashboard',
    version: '3.0.0',
    layout: [
      {
        id: 'header-1',
        type: 'header',
        config: { title: 'My Personal Todos', level: 1 }
      },
      {
        id: 'list-1',
        type: 'todoList',
        config: {
          showCompleted: false,
          sortBy: 'priority',
          filterTags: []
        }
      }
    ],
    components: ['header', 'todoList'],
    metadata: {
      description: 'Manage your personal tasks',
      tags: ['productivity', 'todos'],
      icon: '✓'
    },
    createdAt: new Date('2025-09-28T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-09-30T10:00:00Z').toISOString()
  },
  {
    id: 'analytics-dashboard-v1',
    agentId: 'analytics-agent',
    title: 'Analytics Dashboard',
    version: '1.0.0',
    layout: [
      {
        id: 'header-1',
        type: 'header',
        config: { title: 'Analytics Overview', level: 1 }
      },
      {
        id: 'chart-1',
        type: 'chart',
        config: {
          chartType: 'line',
          dataSource: '/api/analytics/data',
          refreshInterval: 30000
        }
      }
    ],
    components: ['header', 'chart'],
    metadata: {
      description: 'View analytics and metrics',
      tags: ['analytics', 'metrics'],
      icon: '📊'
    },
    createdAt: new Date('2025-09-25T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-09-25T10:00:00Z').toISOString()
  }
];

// Initialize mock data
samplePages.forEach(page => {
  const agentPages = mockDynamicPages.get(page.agentId) || [];
  agentPages.push(page);
  mockDynamicPages.set(page.agentId, agentPages);
});

/**
 * GET /api/agent-pages/agents/:agentId/pages
 * List all pages for an agent with pagination
 */
app.get('/api/agent-pages/agents/:agentId/pages', (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    // Get pages for this agent
    const allPages = mockDynamicPages.get(agentId) || [];

    // Apply pagination
    const paginatedPages = allPages.slice(parsedOffset, parsedOffset + parsedLimit);

    console.log(`📄 Fetched ${paginatedPages.length} pages for agent ${agentId}`);

    res.json({
      success: true,
      pages: paginatedPages,
      total: allPages.length,
      limit: parsedLimit,
      offset: parsedOffset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/agent-pages/agents/:agentId/pages/:pageId
 * Get a single page by ID
 */
app.get('/api/agent-pages/agents/:agentId/pages/:pageId', (req, res) => {
  try {
    const { agentId, pageId } = req.params;

    const agentPages = mockDynamicPages.get(agentId) || [];
    const page = agentPages.find(p => p.id === pageId);

    if (!page) {
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`
      });
    }

    console.log(`📄 Fetched page ${pageId} for agent ${agentId}`);

    res.json({
      success: true,
      page: page,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/agent-pages/agents/:agentId/pages
 * Create a new page for an agent
 */
app.post('/api/agent-pages/agents/:agentId/pages', (req, res) => {
  try {
    const { agentId } = req.params;
    const { title, version, layout, components, metadata } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Title is required'
      });
    }

    if (!layout || !Array.isArray(layout)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Layout must be an array'
      });
    }

    // Create new page
    const newPage = {
      id: crypto.randomUUID(),
      agentId: agentId,
      title: title,
      version: version || '1.0.0',
      layout: layout,
      components: components || [],
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to storage
    const agentPages = mockDynamicPages.get(agentId) || [];
    agentPages.push(newPage);
    mockDynamicPages.set(agentId, agentPages);

    console.log(`✅ Created page ${newPage.id} for agent ${agentId}`);

    res.status(201).json({
      success: true,
      page: newPage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * PUT /api/agent-pages/agents/:agentId/pages/:pageId
 * Update an existing page (supports partial updates)
 */
app.put('/api/agent-pages/agents/:agentId/pages/:pageId', (req, res) => {
  try {
    const { agentId, pageId } = req.params;
    const updates = req.body;

    const agentPages = mockDynamicPages.get(agentId) || [];
    const pageIndex = agentPages.findIndex(p => p.id === pageId);

    if (pageIndex === -1) {
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`
      });
    }

    // Validate layout if provided
    if (updates.layout && !Array.isArray(updates.layout)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Layout must be an array'
      });
    }

    // Update page (partial update)
    const updatedPage = {
      ...agentPages[pageIndex],
      ...updates,
      id: pageId, // Ensure ID doesn't change
      agentId: agentId, // Ensure agentId doesn't change
      updatedAt: new Date().toISOString()
    };

    agentPages[pageIndex] = updatedPage;
    mockDynamicPages.set(agentId, agentPages);

    console.log(`✅ Updated page ${pageId} for agent ${agentId}`);

    res.json({
      success: true,
      page: updatedPage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/agent-pages/agents/:agentId/pages/:pageId
 * Delete a page
 */
app.delete('/api/agent-pages/agents/:agentId/pages/:pageId', (req, res) => {
  try {
    const { agentId, pageId } = req.params;

    const agentPages = mockDynamicPages.get(agentId) || [];
    const pageIndex = agentPages.findIndex(p => p.id === pageId);

    if (pageIndex === -1) {
      console.log(`❌ Page ${pageId} not found for agent ${agentId}`);
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page with ID ${pageId} not found for agent ${agentId}`
      });
    }

    // Remove page
    const deletedPage = agentPages.splice(pageIndex, 1)[0];
    mockDynamicPages.set(agentId, agentPages);

    console.log(`🗑️ Deleted page ${pageId} for agent ${agentId}`);

    res.json({
      success: true,
      message: 'Page deleted successfully',
      deletedPage: deletedPage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agents API: http://localhost:${PORT}/api/agents`);
  console.log(`📝 Templates API: http://localhost:${PORT}/api/templates`);
  console.log(`📊 Streaming Ticker SSE: http://localhost:${PORT}/api/streaming-ticker/stream`);
  console.log(`📄 Dynamic Pages API: http://localhost:${PORT}/api/agent-pages/agents/:agentId/pages`);
  console.log(`📈 All analytics APIs available`);
});

export default app;