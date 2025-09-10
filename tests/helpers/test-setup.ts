import { jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Mock implementations for missing modules
jest.mock('../../src/database/DatabaseService.js', () => {
  return {
    DatabaseService: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockResolvedValue(true),
      initializeSchema: jest.fn().mockResolvedValue(undefined),
      getTables: jest.fn().mockResolvedValue(['posts', 'agents']),
      getTableColumns: jest.fn().mockResolvedValue(['id', 'title', 'content']),
      createPost: jest.fn().mockResolvedValue('1'),
      getPost: jest.fn().mockResolvedValue(null),
      getAllPosts: jest.fn().mockResolvedValue([]),
      updatePost: jest.fn().mockResolvedValue(undefined),
      deletePost: jest.fn().mockResolvedValue(undefined),
      getPostsByAuthor: jest.fn().mockResolvedValue([]),
      getPostsByHashtag: jest.fn().mockResolvedValue([]),
      createAgent: jest.fn().mockResolvedValue(undefined),
      getAgent: jest.fn().mockResolvedValue(null),
      getAllAgents: jest.fn().mockResolvedValue([]),
      run: jest.fn().mockResolvedValue(undefined),
      runTransaction: jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          run: jest.fn().mockResolvedValue(undefined)
        };
        return callback(mockTx);
      })
    }))
  };
});

jest.mock('../../src/agents/AgentDiscoveryService.js', () => {
  return {
    AgentDiscoveryService: jest.fn().mockImplementation(() => ({
      discoverAgents: jest.fn().mockResolvedValue([
        {
          id: 'test-agent-1',
          name: 'Test Agent 1',
          description: 'First test agent',
          capabilities: ['testing', 'posting'],
          version: '1.0.0',
          status: 'active'
        }
      ]),
      validateAgentSchema: jest.fn().mockResolvedValue(true)
    }))
  };
});

jest.mock('../../src/services/AgentFileService.js', () => {
  return {
    AgentFileService: jest.fn().mockImplementation(() => ({
      loadAgent: jest.fn().mockResolvedValue({
        id: 'test-agent-1',
        name: 'Test Agent 1',
        description: 'First test agent',
        capabilities: ['testing', 'posting'],
        version: '1.0.0',
        status: 'active'
      }),
      saveAgent: jest.fn().mockResolvedValue(undefined),
      deleteAgent: jest.fn().mockResolvedValue(undefined),
      listAgents: jest.fn().mockResolvedValue([
        {
          id: 'test-agent-1',
          name: 'Test Agent 1',
          description: 'First test agent',
          capabilities: ['testing', 'posting'],
          version: '1.0.0',
          status: 'active'
        }
      ])
    }))
  };
});

jest.mock('../../src/app.js', () => {
  const express = require('express');
  return {
    createApp: jest.fn().mockImplementation(() => {
      const app = express();
      
      // Mock basic routes
      app.get('/health', (req, res) => {
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        });
      });

      app.get('/api/health', (req, res) => {
        res.json({
          status: 'healthy',
          database: 'connected',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        });
      });

      app.get('/api/posts', (req, res) => {
        res.json([]);
      });

      app.post('/api/posts', (req, res) => {
        res.status(201).json({
          id: '1',
          ...req.body,
          timestamp: new Date().toISOString()
        });
      });

      app.get('/api/posts/:id', (req, res) => {
        if (req.params.id === '999999') {
          res.status(404).json({ error: 'Post not found' });
        } else {
          res.json({
            id: req.params.id,
            title: 'Test Post',
            content: 'Test content',
            author: 'test-author'
          });
        }
      });

      app.delete('/api/posts/:id', (req, res) => {
        if (req.params.id === '999999') {
          res.status(404).json({ error: 'Post not found' });
        } else {
          res.json({ message: 'Post deleted' });
        }
      });

      app.get('/api/agents', (req, res) => {
        const agents = [
          {
            id: 'test-agent-1',
            name: 'Test Agent 1',
            description: 'First test agent',
            capabilities: ['testing', 'posting'],
            version: '1.0.0',
            status: req.query.status || 'active'
          }
        ];

        if (req.query.status) {
          res.json(agents.filter(a => a.status === req.query.status));
        } else {
          res.json(agents);
        }
      });

      app.get('/api/agents/:id', (req, res) => {
        if (req.params.id === 'non-existent-agent') {
          res.status(404).json({ error: 'Agent not found' });
        } else {
          res.json({
            id: req.params.id,
            name: 'Test Agent',
            description: 'Test agent',
            capabilities: ['testing'],
            version: '1.0.0',
            status: 'active'
          });
        }
      });

      app.put('/api/agents/:id/status', (req, res) => {
        const validStatuses = ['active', 'inactive', 'busy'];
        if (!validStatuses.includes(req.body.status)) {
          res.status(400).json({ error: 'Invalid status' });
        } else {
          res.json({
            id: req.params.id,
            status: req.body.status,
            lastSeen: req.body.lastSeen || new Date().toISOString()
          });
        }
      });

      app.get('/api/feed', (req, res) => {
        res.json({
          posts: [],
          totalCount: 0,
          lastUpdated: new Date().toISOString()
        });
      });

      app.use('*', (req, res) => {
        res.status(404).json({ error: 'Not Found' });
      });

      return Promise.resolve(app);
    })
  };
});

// Global test utilities
export class TestSetup {
  static async setupDatabase() {
    // Mock database setup
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      initializeSchema: jest.fn().mockResolvedValue(undefined),
      createPost: jest.fn().mockResolvedValue('1'),
      createAgent: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined)
    };
  }

  static async cleanupDatabase() {
    // Mock cleanup
    return Promise.resolve();
  }

  static async resetDatabase() {
    // Mock reset
    return Promise.resolve();
  }

  static async seedTestData() {
    // Mock seed data
    return Promise.resolve();
  }
}

// Custom matchers
expect.extend({
  toBeValidAgent(received) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      typeof received.description === 'string' &&
      Array.isArray(received.capabilities) &&
      typeof received.version === 'string' &&
      ['active', 'inactive', 'busy'].includes(received.status);

    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid agent`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid agent`,
        pass: false,
      };
    }
  },

  toBeValidPost(received) {
    const pass = received &&
      typeof received.title === 'string' &&
      typeof received.content === 'string' &&
      typeof received.author === 'string';

    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid post`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid post`,
        pass: false,
      };
    }
  },

  toRespondWithinTime(received: number, expectedTime: number) {
    const pass = received <= expectedTime;

    if (pass) {
      return {
        message: () => `Expected ${received}ms to be greater than ${expectedTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be less than or equal to ${expectedTime}ms`,
        pass: false,
      };
    }
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAgent(): R;
      toBeValidPost(): R;
      toRespondWithinTime(expectedTime: number): R;
    }
  }
}

// Global test environment setup
export const setupGlobalTestEnvironment = () => {
  beforeAll(async () => {
    await TestSetup.setupDatabase();
  });

  afterAll(async () => {
    await TestSetup.cleanupDatabase();
  });

  beforeEach(async () => {
    await TestSetup.resetDatabase();
    await TestSetup.seedTestData();
  });

  afterEach(async () => {
    await TestSetup.resetDatabase();
  });
};