/**
 * Dual Instance Dashboard
 * Web interface for monitoring and controlling both Claude instances
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const DualInstanceManager = require('./DualInstanceManager');

class DualInstanceDashboard {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 3002;
    this.dualManager = new DualInstanceManager();
    this.connectedClients = new Set();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupDualManagerEvents();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'dashboard-ui')));
    this.app.use('/shared', express.static('/workspaces/agent-feed/agent_workspace/shared'));
  }

  setupRoutes() {
    // API Routes
    this.app.get('/api/status', async (req, res) => {
      try {
        const status = await this.getSystemStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/messages', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 50;
        const messages = this.dualManager.getMessageHistory(limit);
        res.json(messages);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/pending-confirmations', (req, res) => {
      try {
        const pending = this.dualManager.getPendingConfirmations();
        res.json(pending);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/confirm/:messageId', async (req, res) => {
      try {
        const { messageId } = req.params;
        const { approved, comment } = req.body;
        
        const result = await this.dualManager.handleUserConfirmation(
          messageId, 
          approved, 
          comment
        );
        
        res.json(result);
        
        // Broadcast to all connected clients
        this.io.emit('confirmation_processed', result);
        
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/handoff', async (req, res) => {
      try {
        const { task, context } = req.body;
        
        const messageId = await this.dualManager.sendDevToProduction(task, context);
        res.json({ messageId, status: 'queued' });
        
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/api/agents', async (req, res) => {
      try {
        const agents = await this.getAgentDefinitions();
        res.json(agents);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/shared-files', async (req, res) => {
      try {
        const files = await this.getSharedFiles();
        res.json(files);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Serve shared markdown files
    this.app.get('/view/markdown/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = `/workspaces/agent-feed/agent_workspace/shared/reports/${filename}`;
        
        const content = await fs.readFile(filePath, 'utf8');
        
        // Simple markdown to HTML conversion (in production, use a proper markdown parser)
        const html = this.markdownToHtml(content);
        
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${filename}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
              code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
              blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; }
            </style>
          </head>
          <body>
            <div class="markdown-content">${html}</div>
            <hr>
            <p><a href="/dashboard">← Back to Dashboard</a></p>
          </body>
          </html>
        `);
        
      } catch (error) {
        res.status(404).json({ error: 'File not found' });
      }
    });

    // Dashboard UI
    this.app.get('/dashboard', (req, res) => {
      res.send(this.getDashboardHTML());
    });

    this.app.get('/', (req, res) => {
      res.redirect('/dashboard');
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Dashboard client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial status
      this.getSystemStatus().then(status => {
        socket.emit('status_update', status);
      });

      // Send pending confirmations
      const pending = this.dualManager.getPendingConfirmations();
      socket.emit('pending_confirmations', pending);

      socket.on('disconnect', () => {
        console.log(`🔌 Dashboard client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      socket.on('request_status', async () => {
        const status = await this.getSystemStatus();
        socket.emit('status_update', status);
      });
    });
  }

  setupDualManagerEvents() {
    this.dualManager.on('message_sent', (message) => {
      this.io.emit('message_sent', message);
    });

    this.dualManager.on('message_processed', (message) => {
      this.io.emit('message_processed', message);
    });

    this.dualManager.on('confirmation_required', (message) => {
      this.io.emit('confirmation_required', message);
    });

    this.dualManager.on('confirmation_expired', (message) => {
      this.io.emit('confirmation_expired', message);
    });

    this.dualManager.on('status_update', (status) => {
      this.io.emit('instance_status', status);
    });
  }

  async getSystemStatus() {
    const dualStatus = this.dualManager.getStatus();
    
    // Check instance health
    const [devHealth, prodHealth] = await Promise.allSettled([
      this.checkInstanceHealth('http://localhost:3001/health'),
      this.checkInstanceHealth('http://localhost:3000/health')
    ]);

    return {
      timestamp: new Date().toISOString(),
      dual_manager: dualStatus,
      instances: {
        development: {
          status: devHealth.status === 'fulfilled' ? 'healthy' : 'down',
          health: devHealth.value || null,
          error: devHealth.reason || null
        },
        production: {
          status: prodHealth.status === 'fulfilled' ? 'healthy' : 'down',
          health: prodHealth.value || null,
          error: prodHealth.reason || null
        }
      },
      connected_clients: this.connectedClients.size,
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }

  async checkInstanceHealth(url) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      throw error;
    }
  }

  async getAgentDefinitions() {
    const agentsPath = '/workspaces/agent-feed/@agents';
    const agents = [];
    
    try {
      const categories = await fs.readdir(agentsPath);
      
      for (const category of categories) {
        const categoryPath = path.join(agentsPath, category);
        const stat = await fs.stat(categoryPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(categoryPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(categoryPath, file);
              const content = await fs.readFile(filePath, 'utf8');
              const agent = JSON.parse(content);
              agents.push({ ...agent, category });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading agent definitions:', error);
    }
    
    return agents;
  }

  async getSharedFiles() {
    const sharedPath = '/workspaces/agent-feed/agent_workspace/shared';
    const files = [];
    
    try {
      const categories = await fs.readdir(sharedPath);
      
      for (const category of categories) {
        const categoryPath = path.join(sharedPath, category);
        const stat = await fs.stat(categoryPath);
        
        if (stat.isDirectory()) {
          const categoryFiles = await fs.readdir(categoryPath);
          
          for (const file of categoryFiles) {
            const filePath = path.join(categoryPath, file);
            const fileStat = await fs.stat(filePath);
            
            if (fileStat.isFile()) {
              files.push({
                name: file,
                category: category,
                path: filePath,
                size: fileStat.size,
                modified: fileStat.mtime,
                type: this.getFileType(file)
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading shared files:', error);
    }
    
    return files;
  }

  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.md') return 'markdown';
    if (ext === '.html') return 'html';
    if (ext === '.json') return 'json';
    if (ext === '.txt') return 'text';
    return 'unknown';
  }

  markdownToHtml(markdown) {
    // Simple markdown to HTML conversion
    // In production, use a proper markdown parser like marked
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\`(.*)\`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\n/gim, '<br>');
  }

  getDashboardHTML() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dual Claude Instance Dashboard</title>
      <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status.healthy { background: #d4edda; color: #155724; }
        .status.down { background: #f8d7da; color: #721c24; }
        .message { padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #007bff; background: #f8f9fa; }
        .confirmation { padding: 15px; margin: 10px 0; border-radius: 4px; background: #fff3cd; border: 1px solid #ffeaa7; }
        .btn { padding: 8px 16px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-approve { background: #28a745; color: white; }
        .btn-deny { background: #dc3545; color: white; }
        .btn-primary { background: #007bff; color: white; }
        .logs { max-height: 300px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .metric { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
        .file-list { max-height: 200px; overflow-y: auto; }
        .file-item { padding: 5px 0; border-bottom: 1px solid #eee; }
        .file-item:hover { background: #f8f9fa; }
        .timestamp { font-size: 11px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔄 Dual Claude Instance Dashboard</h1>
        <p>Monitoring and controlling development and production Claude instances</p>
        <div id="connection-status">🔌 Connecting...</div>
      </div>

      <div class="grid">
        <!-- Instance Status -->
        <div class="card">
          <h3>📊 Instance Status</h3>
          <div id="instance-status">
            <div class="metric">
              <span>Development:</span>
              <span id="dev-status">🔄 Checking...</span>
            </div>
            <div class="metric">
              <span>Production:</span>
              <span id="prod-status">🔄 Checking...</span>
            </div>
            <div class="metric">
              <span>Connected Clients:</span>
              <span id="client-count">0</span>
            </div>
          </div>
        </div>

        <!-- Pending Confirmations -->
        <div class="card">
          <h3>🔒 Pending Confirmations</h3>
          <div id="pending-confirmations">
            <p>No pending confirmations</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <h3>⚡ Quick Actions</h3>
          <button class="btn btn-primary" onclick="sendHandoff()">Send Dev → Prod Handoff</button>
          <button class="btn btn-primary" onclick="refreshStatus()">Refresh Status</button>
          <button class="btn btn-primary" onclick="viewSharedFiles()">View Shared Files</button>
        </div>

        <!-- Message History -->
        <div class="card">
          <h3>📨 Recent Messages</h3>
          <div id="message-history" class="logs">
            Loading message history...
          </div>
        </div>

        <!-- System Metrics -->
        <div class="card">
          <h3>💻 System Metrics</h3>
          <div id="system-metrics">
            <div class="metric">
              <span>Uptime:</span>
              <span id="uptime">Loading...</span>
            </div>
            <div class="metric">
              <span>Memory Usage:</span>
              <span id="memory">Loading...</span>
            </div>
          </div>
        </div>

        <!-- Shared Files -->
        <div class="card">
          <h3>📁 Recent Shared Files</h3>
          <div id="shared-files" class="file-list">
            Loading shared files...
          </div>
        </div>
      </div>

      <script>
        const socket = io();
        let systemStatus = null;

        socket.on('connect', () => {
          document.getElementById('connection-status').innerHTML = '🟢 Connected to Dashboard';
          loadInitialData();
        });

        socket.on('disconnect', () => {
          document.getElementById('connection-status').innerHTML = '🔴 Disconnected from Dashboard';
        });

        socket.on('status_update', (status) => {
          systemStatus = status;
          updateStatusDisplay(status);
        });

        socket.on('confirmation_required', (message) => {
          addPendingConfirmation(message);
        });

        socket.on('message_sent', (message) => {
          addMessageToHistory(message, 'sent');
        });

        socket.on('message_processed', (message) => {
          addMessageToHistory(message, 'processed');
        });

        function loadInitialData() {
          socket.emit('request_status');
          loadMessageHistory();
          loadSharedFiles();
        }

        function updateStatusDisplay(status) {
          // Instance status
          const devStatus = status.instances.development.status;
          const prodStatus = status.instances.production.status;
          
          document.getElementById('dev-status').innerHTML = 
            \`<span class="status \${devStatus}">\${devStatus.toUpperCase()}</span>\`;
          document.getElementById('prod-status').innerHTML = 
            \`<span class="status \${prodStatus}">\${prodStatus.toUpperCase()}</span>\`;
          
          document.getElementById('client-count').textContent = status.connected_clients;
          
          // System metrics
          const uptimeHours = Math.floor(status.system.uptime / 3600);
          const uptimeMinutes = Math.floor((status.system.uptime % 3600) / 60);
          document.getElementById('uptime').textContent = \`\${uptimeHours}h \${uptimeMinutes}m\`;
          
          const memoryMB = Math.round(status.system.memory.heapUsed / 1024 / 1024);
          document.getElementById('memory').textContent = \`\${memoryMB} MB\`;
        }

        function loadMessageHistory() {
          fetch('/api/messages?limit=10')
            .then(response => response.json())
            .then(messages => {
              const historyDiv = document.getElementById('message-history');
              historyDiv.innerHTML = messages.map(msg => 
                \`<div class="message">
                  <strong>\${msg.source} → \${msg.target}</strong>: \${msg.payload.action || msg.type}
                  <div class="timestamp">\${new Date(msg.timestamp).toLocaleString()}</div>
                </div>\`
              ).join('');
            });
        }

        function loadSharedFiles() {
          fetch('/api/shared-files')
            .then(response => response.json())
            .then(files => {
              const filesDiv = document.getElementById('shared-files');
              filesDiv.innerHTML = files.slice(0, 10).map(file => 
                \`<div class="file-item">
                  <strong>\${file.name}</strong> (\${file.category})
                  <div class="timestamp">\${new Date(file.modified).toLocaleString()}</div>
                </div>\`
              ).join('') || '<p>No shared files found</p>';
            });
        }

        function addPendingConfirmation(message) {
          const pendingDiv = document.getElementById('pending-confirmations');
          const confirmationHTML = \`
            <div class="confirmation" id="confirmation-\${message.id}">
              <h4>🔒 Confirmation Required</h4>
              <p><strong>Action:</strong> \${message.payload.action}</p>
              <p><strong>Reason:</strong> \${message.payload.reason}</p>
              <button class="btn btn-approve" onclick="confirmMessage('\${message.id}', true)">✅ Approve</button>
              <button class="btn btn-deny" onclick="confirmMessage('\${message.id}', false)">❌ Deny</button>
            </div>
          \`;
          pendingDiv.innerHTML = confirmationHTML;
        }

        function confirmMessage(messageId, approved) {
          const comment = approved ? 'Approved via dashboard' : 'Denied via dashboard';
          
          fetch(\`/api/confirm/\${messageId}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approved, comment })
          })
          .then(response => response.json())
          .then(result => {
            document.getElementById(\`confirmation-\${messageId}\`).remove();
            if (document.getElementById('pending-confirmations').children.length === 0) {
              document.getElementById('pending-confirmations').innerHTML = '<p>No pending confirmations</p>';
            }
          });
        }

        function addMessageToHistory(message, type) {
          const historyDiv = document.getElementById('message-history');
          const messageHTML = \`
            <div class="message">
              <strong>\${message.source} → \${message.target}</strong>: \${message.payload.action || message.type} (\${type})
              <div class="timestamp">\${new Date(message.timestamp).toLocaleString()}</div>
            </div>
          \`;
          historyDiv.insertAdjacentHTML('afterbegin', messageHTML);
          
          // Keep only last 20 messages
          const messages = historyDiv.children;
          while (messages.length > 20) {
            historyDiv.removeChild(messages[messages.length - 1]);
          }
        }

        function sendHandoff() {
          const task = prompt('Enter task description for handoff:');
          if (task) {
            fetch('/api/handoff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task, context: { source: 'dashboard' } })
            })
            .then(response => response.json())
            .then(result => {
              alert('Handoff queued successfully');
            });
          }
        }

        function refreshStatus() {
          socket.emit('request_status');
          loadMessageHistory();
          loadSharedFiles();
        }

        function viewSharedFiles() {
          window.open('/api/shared-files', '_blank');
        }
      </script>
    </body>
    </html>
    `;
  }

  async start() {
    try {
      // Initialize dual manager first
      await this.dualManager.initialize();
      
      // Start the web server
      this.server.listen(this.port, () => {
        console.log(`🚀 Dual Instance Dashboard running on http://localhost:${this.port}`);
        console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
        console.log(`🔗 API: http://localhost:${this.port}/api/status`);
      });
      
    } catch (error) {
      console.error('❌ Failed to start Dual Instance Dashboard:', error);
      process.exit(1);
    }
  }

  async stop() {
    await this.dualManager.shutdown();
    this.server.close();
    console.log('🔄 Dual Instance Dashboard stopped');
  }
}

// Start the dashboard if run directly
if (require.main === module) {
  const dashboard = new DualInstanceDashboard();
  dashboard.start();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down dashboard...');
    await dashboard.stop();
    process.exit(0);
  });
}

module.exports = DualInstanceDashboard;