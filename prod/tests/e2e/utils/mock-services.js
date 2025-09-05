/**
 * Mock Services for Testing
 * Provides mock external services for isolated testing
 */

import http from 'http';
import { EventEmitter } from 'events';

export class MockServices extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.ports = {};
    this.isRunning = false;
  }

  /**
   * Start all mock services
   */
  async start() {
    if (this.isRunning) {
      console.log('Mock services already running');
      return;
    }

    console.log('Starting mock services...');

    try {
      // Start different mock services
      await this.startApiMockService();
      await this.startWebhookMockService();
      await this.startAnalyticsMockService();
      await this.startSocialMediaMockServices();

      this.isRunning = true;
      console.log('All mock services started successfully');
      this.emit('started');
    } catch (error) {
      console.error('Error starting mock services:', error);
      throw error;
    }
  }

  /**
   * Stop all mock services
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping mock services...');

    for (const [name, service] of this.services) {
      try {
        if (service.close) {
          await new Promise((resolve) => {
            service.close(resolve);
          });
        }
        console.log(`Stopped ${name} mock service`);
      } catch (error) {
        console.error(`Error stopping ${name} service:`, error);
      }
    }

    this.services.clear();
    this.ports = {};
    this.isRunning = false;
    
    console.log('All mock services stopped');
    this.emit('stopped');
  }

  /**
   * Start main API mock service
   */
  async startApiMockService() {
    const port = await this.findAvailablePort(3001);
    
    const server = http.createServer((req, res) => {
      this.handleApiRequest(req, res);
    });

    await this.startServer(server, port, 'api');
    this.ports.api = port;
  }

  /**
   * Start webhook mock service
   */
  async startWebhookMockService() {
    const port = await this.findAvailablePort(3002);
    
    const server = http.createServer((req, res) => {
      this.handleWebhookRequest(req, res);
    });

    await this.startServer(server, port, 'webhook');
    this.ports.webhook = port;
  }

  /**
   * Start analytics mock service
   */
  async startAnalyticsMockService() {
    const port = await this.findAvailablePort(3003);
    
    const server = http.createServer((req, res) => {
      this.handleAnalyticsRequest(req, res);
    });

    await this.startServer(server, port, 'analytics');
    this.ports.analytics = port;
  }

  /**
   * Start social media platform mock services
   */
  async startSocialMediaMockServices() {
    const platforms = ['twitter', 'facebook', 'instagram', 'linkedin'];
    let basePort = 3010;

    for (const platform of platforms) {
      const port = await this.findAvailablePort(basePort++);
      
      const server = http.createServer((req, res) => {
        this.handleSocialMediaRequest(req, res, platform);
      });

      await this.startServer(server, port, platform);
      this.ports[platform] = port;
    }
  }

  /**
   * Handle API mock requests
   */
  handleApiRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.ports.api}`);
    const method = req.method.toLowerCase();
    const path = url.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'options') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route handling
    if (path.startsWith('/api/agents')) {
      this.handleAgentsAPI(req, res, method, path);
    } else if (path.startsWith('/api/posts')) {
      this.handlePostsAPI(req, res, method, path);
    } else if (path.startsWith('/api/templates')) {
      this.handleTemplatesAPI(req, res, method, path);
    } else if (path.startsWith('/api/analytics')) {
      this.handleAnalyticsAPI(req, res, method, path);
    } else if (path.startsWith('/api/auth')) {
      this.handleAuthAPI(req, res, method, path);
    } else {
      this.sendResponse(res, 404, { error: 'Not found' });
    }
  }

  /**
   * Handle agents API endpoints
   */
  handleAgentsAPI(req, res, method, path) {
    const agentId = this.extractIdFromPath(path);

    switch (method) {
      case 'get':
        if (agentId) {
          this.sendResponse(res, 200, this.getMockAgent(agentId));
        } else {
          this.sendResponse(res, 200, this.getMockAgents());
        }
        break;
      
      case 'post':
        this.collectBody(req, (body) => {
          const agent = this.createMockAgent(body);
          this.sendResponse(res, 201, agent);
        });
        break;
      
      case 'put':
        if (agentId) {
          this.collectBody(req, (body) => {
            const agent = this.updateMockAgent(agentId, body);
            this.sendResponse(res, 200, agent);
          });
        } else {
          this.sendResponse(res, 400, { error: 'Agent ID required' });
        }
        break;
      
      case 'delete':
        if (agentId) {
          this.sendResponse(res, 204);
        } else {
          this.sendResponse(res, 400, { error: 'Agent ID required' });
        }
        break;
      
      default:
        this.sendResponse(res, 405, { error: 'Method not allowed' });
    }
  }

  /**
   * Handle posts API endpoints
   */
  handlePostsAPI(req, res, method, path) {
    const postId = this.extractIdFromPath(path);

    switch (method) {
      case 'get':
        if (postId) {
          this.sendResponse(res, 200, this.getMockPost(postId));
        } else {
          this.sendResponse(res, 200, this.getMockPosts());
        }
        break;
      
      case 'post':
        this.collectBody(req, (body) => {
          const post = this.createMockPost(body);
          this.sendResponse(res, 201, post);
        });
        break;
      
      default:
        this.sendResponse(res, 405, { error: 'Method not allowed' });
    }
  }

  /**
   * Handle webhook requests
   */
  handleWebhookRequest(req, res) {
    console.log(`Webhook received: ${req.method} ${req.url}`);
    
    this.collectBody(req, (body) => {
      console.log('Webhook payload:', body);
      
      // Simulate webhook processing
      this.emit('webhook', {
        method: req.method,
        url: req.url,
        body: body,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });

      this.sendResponse(res, 200, { received: true });
    });
  }

  /**
   * Handle analytics requests
   */
  handleAnalyticsRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.ports.analytics}`);
    const path = url.pathname;

    if (path === '/metrics') {
      this.sendResponse(res, 200, this.generateMockMetrics());
    } else if (path === '/reports') {
      this.sendResponse(res, 200, this.generateMockReport());
    } else {
      this.sendResponse(res, 404, { error: 'Endpoint not found' });
    }
  }

  /**
   * Handle social media platform requests
   */
  handleSocialMediaRequest(req, res, platform) {
    const url = new URL(req.url, `http://localhost:${this.ports[platform]}`);
    const path = url.pathname;

    // Simulate platform-specific responses
    if (path === '/oauth/token') {
      this.sendResponse(res, 200, {
        access_token: `mock_token_${platform}_${Date.now()}`,
        token_type: 'Bearer',
        expires_in: 3600
      });
    } else if (path.startsWith('/api/posts')) {
      this.handleSocialMediaPosts(req, res, platform);
    } else if (path.startsWith('/api/user')) {
      this.sendResponse(res, 200, {
        id: `mock_user_${platform}`,
        username: `test_user_${platform}`,
        followers: Math.floor(Math.random() * 10000),
        following: Math.floor(Math.random() * 1000)
      });
    } else {
      this.sendResponse(res, 404, { error: 'Platform endpoint not found' });
    }
  }

  /**
   * Handle social media posts
   */
  handleSocialMediaPosts(req, res, platform) {
    if (req.method === 'POST') {
      this.collectBody(req, (body) => {
        // Simulate post creation with random success/failure
        const success = Math.random() > 0.1; // 90% success rate

        if (success) {
          this.sendResponse(res, 201, {
            id: `post_${platform}_${Date.now()}`,
            url: `https://${platform}.com/post/${Date.now()}`,
            status: 'published',
            created_at: new Date().toISOString()
          });
        } else {
          this.sendResponse(res, 400, {
            error: 'Simulated platform error',
            message: 'Content violates community guidelines'
          });
        }
      });
    } else {
      this.sendResponse(res, 405, { error: 'Method not allowed' });
    }
  }

  /**
   * Generate mock metrics
   */
  generateMockMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: {
        total_posts: Math.floor(Math.random() * 1000),
        total_engagement: Math.floor(Math.random() * 10000),
        total_reach: Math.floor(Math.random() * 100000),
        active_agents: Math.floor(Math.random() * 20),
        success_rate: (Math.random() * 20 + 80).toFixed(2) // 80-100%
      }
    };
  }

  /**
   * Generate mock report
   */
  generateMockReport() {
    return {
      report_id: `report_${Date.now()}`,
      generated_at: new Date().toISOString(),
      period: '30d',
      summary: {
        total_posts: 150,
        engagement_rate: 8.5,
        top_platform: 'twitter',
        growth_rate: 12.3
      },
      recommendations: [
        'Increase posting frequency during peak hours',
        'Use more trending hashtags',
        'Engage more with audience comments'
      ]
    };
  }

  /**
   * Get mock agents
   */
  getMockAgents() {
    return {
      agents: [
        {
          id: 'agent-1',
          name: 'Content Creator Bot',
          type: 'content-creator',
          status: 'active',
          platforms: ['twitter', 'facebook'],
          metrics: {
            posts: 45,
            engagement: 8.2,
            reach: 15000
          }
        },
        {
          id: 'agent-2',
          name: 'Analytics Agent',
          type: 'analyst',
          status: 'active',
          platforms: ['instagram'],
          metrics: {
            posts: 23,
            engagement: 12.1,
            reach: 8500
          }
        }
      ]
    };
  }

  /**
   * Get mock agent by ID
   */
  getMockAgent(id) {
    return {
      id: id,
      name: `Mock Agent ${id}`,
      type: 'content-creator',
      status: 'active',
      platforms: ['twitter'],
      configuration: {
        posting_frequency: 4,
        content_style: 'professional'
      },
      metrics: {
        posts: Math.floor(Math.random() * 100),
        engagement: (Math.random() * 15).toFixed(1),
        reach: Math.floor(Math.random() * 50000)
      }
    };
  }

  /**
   * Create mock agent
   */
  createMockAgent(data) {
    return {
      id: `agent_${Date.now()}`,
      ...data,
      status: 'active',
      created_at: new Date().toISOString(),
      metrics: {
        posts: 0,
        engagement: 0,
        reach: 0
      }
    };
  }

  /**
   * Update mock agent
   */
  updateMockAgent(id, data) {
    return {
      id: id,
      ...data,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Get mock posts
   */
  getMockPosts() {
    return {
      posts: [
        {
          id: 'post-1',
          title: 'Test Post 1',
          content: 'This is a test post for E2E testing',
          platform: 'twitter',
          status: 'published',
          metrics: { likes: 25, shares: 5 }
        }
      ],
      pagination: {
        page: 1,
        total: 1,
        per_page: 10
      }
    };
  }

  /**
   * Get mock post by ID
   */
  getMockPost(id) {
    return {
      id: id,
      title: `Mock Post ${id}`,
      content: 'Mock post content for testing',
      platform: 'twitter',
      status: 'published',
      created_at: new Date().toISOString(),
      metrics: {
        views: Math.floor(Math.random() * 1000),
        likes: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 20)
      }
    };
  }

  /**
   * Create mock post
   */
  createMockPost(data) {
    return {
      id: `post_${Date.now()}`,
      ...data,
      status: 'published',
      created_at: new Date().toISOString(),
      metrics: {
        views: 0,
        likes: 0,
        shares: 0
      }
    };
  }

  /**
   * Utility methods
   */
  
  async startServer(server, port, name) {
    return new Promise((resolve, reject) => {
      server.listen(port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`${name} mock service started on port ${port}`);
          this.services.set(name, server);
          resolve();
        }
      });
    });
  }

  async findAvailablePort(startPort) {
    // In real implementation, check for port availability
    return startPort;
  }

  extractIdFromPath(path) {
    const match = path.match(/\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  collectBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        callback(parsed);
      } catch {
        callback({});
      }
    });
  }

  sendResponse(res, statusCode, data = null) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    
    if (data) {
      res.end(JSON.stringify(data));
    } else {
      res.end();
    }
  }

  /**
   * Get ports for all running services
   */
  getPorts() {
    return { ...this.ports };
  }

  /**
   * Check if services are running
   */
  isServicesRunning() {
    return this.isRunning;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.isRunning,
      services: Array.from(this.services.keys()),
      ports: this.ports
    };
  }
}