/**
 * Avi DM Web Dashboard Server
 *
 * Provides a web interface to monitor and interact with Avi DM
 */

import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { AviOrchestrator } from './avi/orchestrator';
import { StateManager } from './avi/state-manager';
import { WorkTicketQueue } from './queue/work-ticket';
import { WorkerSpawner } from './workers/worker-spawner';
import { WorkerPool } from './workers/worker-pool';
import { DatabaseManager } from './types/database-manager';
import { Priority } from './types/work-ticket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Database setup
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'avidm_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
});

const database: DatabaseManager = {
  query: async (text, params) => pool.query(text, params),
  connect: async () => pool.connect(),
  end: async () => pool.end(),
} as unknown as DatabaseManager;

// Initialize Avi DM components
const stateManager = new StateManager(database);
const workQueue = new WorkTicketQueue();

// API Routes

// Get orchestrator status
app.get('/api/status', async (req, res) => {
  try {
    const state = await stateManager.loadState();
    const metrics = await workQueue.getMetrics();

    res.json({
      status: state?.status || 'not_started',
      state: state || {},
      queue: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get system templates
app.get('/api/templates', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name, version, model,
             posting_rules, api_schema, safety_constraints,
             default_personality
      FROM system_agent_templates
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get agent memories
app.get('/api/memories', async (req, res) => {
  try {
    const { userId, agentName, limit = 10 } = req.query;

    let query = `
      SELECT id, user_id, agent_name, post_id, content, metadata, created_at
      FROM agent_memories
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      query += ` AND user_id = $${params.length}`;
    }

    if (agentName) {
      params.push(agentName);
      query += ` AND agent_name = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create a test work ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const { agentName, userId, payload, priority = 'MEDIUM' } = req.body;

    if (!agentName || !userId) {
      return res.status(400).json({ error: 'agentName and userId are required' });
    }

    const ticket = await workQueue.createTicket({
      type: 'test_task',
      priority: Priority[priority as keyof typeof Priority] || Priority.MEDIUM,
      agentName,
      userId,
      payload: payload || {},
    });

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get avi state
app.get('/api/avi-state', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM avi_state WHERE id = 1');
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: String(error)
    });
  }
});

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avi DM Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    h1 {
      color: #667eea;
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 1.1em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }
    .card h2 {
      color: #667eea;
      font-size: 1.3em;
      margin-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    }
    .status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 0.9em;
    }
    .status.running { background: #4ade80; color: white; }
    .status.stopped { background: #f87171; color: white; }
    .status.initializing { background: #fbbf24; color: white; }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #666; }
    .metric-value {
      font-weight: bold;
      color: #667eea;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1em;
      cursor: pointer;
      transition: all 0.3s;
      margin: 5px;
    }
    button:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
    .templates-list, .memories-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .template-item, .memory-item {
      background: #f8f9fa;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .template-name, .memory-content {
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .template-meta, .memory-meta {
      font-size: 0.85em;
      color: #666;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #667eea;
      font-size: 1.2em;
    }
    .error {
      background: #fee;
      color: #c33;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85em;
    }
    .actions {
      margin-top: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 Avi DM Dashboard</h1>
      <p class="subtitle">Always-On Orchestrator with Ephemeral Agent Workers</p>
    </div>

    <div id="error" class="error" style="display: none;"></div>

    <div class="grid">
      <div class="card">
        <h2>📊 Orchestrator Status</h2>
        <div id="status-content" class="loading">Loading...</div>
      </div>

      <div class="card">
        <h2>📋 Work Queue</h2>
        <div id="queue-content" class="loading">Loading...</div>
      </div>

      <div class="card">
        <h2>💾 Avi State</h2>
        <div id="state-content" class="loading">Loading...</div>
      </div>
    </div>

    <div class="card">
      <h2>🎭 System Templates</h2>
      <div id="templates-content" class="loading">Loading...</div>
    </div>

    <div class="card">
      <h2>🧠 Recent Memories</h2>
      <div id="memories-content" class="loading">Loading...</div>
    </div>

    <div class="card">
      <h2>🎮 Actions</h2>
      <div class="actions">
        <button onclick="createTestTicket()">Create Test Ticket</button>
        <button onclick="refreshData()">Refresh Data</button>
        <button onclick="viewRawState()">View Raw State</button>
      </div>
    </div>
  </div>

  <script>
    let autoRefresh = true;

    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();

        document.getElementById('status-content').innerHTML = \`
          <div class="metric">
            <span class="metric-label">Status:</span>
            <span class="status \${data.status}">\${data.status}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Context Size:</span>
            <span class="metric-value">\${data.state.contextSize || 0} tokens</span>
          </div>
          <div class="metric">
            <span class="metric-label">Tickets Processed:</span>
            <span class="metric-value">\${data.state.ticketsProcessed || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Workers Spawned:</span>
            <span class="metric-value">\${data.state.workersSpawned || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Active Workers:</span>
            <span class="metric-value">\${data.state.activeWorkers || 0}</span>
          </div>
        \`;

        document.getElementById('queue-content').innerHTML = \`
          <div class="metric">
            <span class="metric-label">Total Tickets:</span>
            <span class="metric-value">\${data.queue.total}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Pending:</span>
            <span class="metric-value">\${data.queue.pending}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Processing:</span>
            <span class="metric-value">\${data.queue.processing}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Completed:</span>
            <span class="metric-value">\${data.queue.completed}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Failed:</span>
            <span class="metric-value">\${data.queue.failed}</span>
          </div>
        \`;

      } catch (error) {
        showError('Failed to fetch status: ' + error.message);
      }
    }

    async function fetchAviState() {
      try {
        const res = await fetch('/api/avi-state');
        const state = await res.json();

        if (state) {
          document.getElementById('state-content').innerHTML = \`
            <div class="metric">
              <span class="metric-label">Status:</span>
              <span class="metric-value">\${state.status || 'N/A'}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Start Time:</span>
              <span class="metric-value">\${state.start_time ? new Date(state.start_time).toLocaleString() : 'N/A'}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Last Health Check:</span>
              <span class="metric-value">\${state.last_health_check ? new Date(state.last_health_check).toLocaleString() : 'N/A'}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Uptime:</span>
              <span class="metric-value">\${state.uptime_seconds || 0}s</span>
            </div>
          \`;
        } else {
          document.getElementById('state-content').innerHTML = '<p>No state data available</p>';
        }
      } catch (error) {
        showError('Failed to fetch Avi state: ' + error.message);
      }
    }

    async function fetchTemplates() {
      try {
        const res = await fetch('/api/templates');
        const templates = await res.json();

        if (templates.length === 0) {
          document.getElementById('templates-content').innerHTML = '<p>No templates found</p>';
          return;
        }

        const html = '<div class="templates-list">' + templates.map(t => \`
          <div class="template-item">
            <div class="template-name">\${t.name} (v\${t.version})</div>
            <div class="template-meta">
              Model: \${t.model || 'default'}<br>
              Max Length: \${t.posting_rules?.max_length || 'N/A'}<br>
              Rate Limit: \${t.safety_constraints?.max_rate || 'N/A'} per hour
            </div>
          </div>
        \`).join('') + '</div>';

        document.getElementById('templates-content').innerHTML = html;
      } catch (error) {
        showError('Failed to fetch templates: ' + error.message);
      }
    }

    async function fetchMemories() {
      try {
        const res = await fetch('/api/memories?limit=5');
        const memories = await res.json();

        if (memories.length === 0) {
          document.getElementById('memories-content').innerHTML = '<p>No memories found</p>';
          return;
        }

        const html = '<div class="memories-list">' + memories.map(m => \`
          <div class="memory-item">
            <div class="memory-content">\${m.content.substring(0, 100)}\${m.content.length > 100 ? '...' : ''}</div>
            <div class="memory-meta">
              User: \${m.user_id} | Agent: \${m.agent_name}<br>
              Created: \${new Date(m.created_at).toLocaleString()}
            </div>
          </div>
        \`).join('') + '</div>';

        document.getElementById('memories-content').innerHTML = html;
      } catch (error) {
        showError('Failed to fetch memories: ' + error.message);
      }
    }

    async function createTestTicket() {
      try {
        const res = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'tech-guru',
            userId: 'test-user-' + Date.now(),
            priority: 'HIGH',
            payload: { test: true, timestamp: new Date().toISOString() }
          })
        });

        const result = await res.json();
        alert('Test ticket created! ID: ' + result.ticket.id);
        refreshData();
      } catch (error) {
        showError('Failed to create ticket: ' + error.message);
      }
    }

    function viewRawState() {
      fetch('/api/avi-state')
        .then(res => res.json())
        .then(state => {
          const win = window.open('', 'Raw State', 'width=600,height=400');
          win.document.write('<pre>' + JSON.stringify(state, null, 2) + '</pre>');
        });
    }

    function refreshData() {
      fetchStatus();
      fetchAviState();
      fetchTemplates();
      fetchMemories();
    }

    function showError(msg) {
      const errorDiv = document.getElementById('error');
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
      setTimeout(() => errorDiv.style.display = 'none', 5000);
    }

    // Auto-refresh every 3 seconds
    setInterval(() => {
      if (autoRefresh) refreshData();
    }, 3000);

    // Initial load
    refreshData();
  </script>
</body>
</html>
  `);
});

// Start server
async function startServer() {
  try {
    console.log('📊 Connecting to PostgreSQL...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection established\n');

    app.listen(PORT, () => {
      console.log(`\n🌐 Avi DM Dashboard running at http://localhost:${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`\n🎯 Open your browser to view the dashboard!\n`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await pool.end();
  process.exit(0);
});

startServer();
