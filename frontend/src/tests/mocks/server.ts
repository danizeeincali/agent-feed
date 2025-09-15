/**
 * MSW Server Setup for API Mocking - London School TDD
 * Provides realistic API responses for integration testing
 */

import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { AgentPost, Comment, Agent } from '../../types';

// Mock data generators
const generateMockAgent = (id: string = 'test-agent'): Agent => ({
  id,
  name: `Agent ${id}`,
  display_name: `Test Agent ${id}`,
  description: `Test agent for ${id}`,
  system_prompt: 'Test system prompt',
  avatar_color: '#3B82F6',
  capabilities: ['chat', 'analysis'],
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  usage_count: 0,
  performance: {
    cpu_usage: 25,
    memory_usage: 50,
    response_time: 100,
    success_rate: 95,
    tasks_completed: 10,
    tokens_used: 1000,
    uptime: 3600,
    last_activity: new Date().toISOString()
  }
});

const generateMockPost = (id: string = 'test-post'): AgentPost => ({
  id,
  title: `Test Post ${id}`,
  content: `Test content for post ${id}`,
  authorAgent: 'test-agent',
  publishedAt: new Date().toISOString(),
  metadata: {
    businessImpact: 5,
    tags: ['test', 'automation'],
    isAgentResponse: false
  },
  likes: 0,
  comments: 0
});

const generateMockComment = (id: string = 'test-comment', postId: string = 'test-post'): Comment => ({
  id,
  postId,
  content: `Test comment ${id}`,
  author: 'test-user',
  authorAgent: 'test-agent',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  likes: 0,
  replies: []
});

// Request handlers
const handlers = [
  // Claude Code API endpoints
  rest.get('/api/health', (req, res, ctx) => {
    return res(
      ctx.json({
        status: 'healthy',
        version: '1.0.0',
        uptime: 123456,
        timestamp: new Date().toISOString()
      })
    );
  }),

  rest.get('/api/status', (req, res, ctx) => {
    return res(
      ctx.json({
        status: 'operational',
        activeConnections: 1,
        memoryUsage: 50,
        cpuUsage: 25,
        timestamp: new Date().toISOString()
      })
    );
  }),

  rest.post('/api/chat/message', (req, res, ctx) => {
    return res(
      ctx.json({
        id: `response-${Date.now()}`,
        requestId: `req-${Date.now()}`,
        content: 'Mock Claude response',
        metadata: {
          model: 'claude-3-sonnet',
          tokensUsed: 100,
          processingTime: 500
        },
        status: 'success'
      })
    );
  }),

  rest.post('/api/sessions', (req, res, ctx) => {
    return res(
      ctx.json({
        sessionId: `session-${Date.now()}`
      })
    );
  }),

  rest.delete('/api/sessions/:sessionId', (req, res, ctx) => {
    return res(
      ctx.json({ success: true })
    );
  }),

  rest.post('/api/context/update', (req, res, ctx) => {
    return res(
      ctx.json({ success: true })
    );
  }),

  rest.post('/api/context/files', (req, res, ctx) => {
    return res(
      ctx.json({ success: true })
    );
  }),

  // Agent Feed API endpoints
  rest.get('/api/agents', (req, res, ctx) => {
    const agents = [
      generateMockAgent('tech-reviewer'),
      generateMockAgent('system-validator'),
      generateMockAgent('code-auditor'),
      generateMockAgent('quality-assurance'),
      generateMockAgent('performance-analyst')
    ];
    return res(ctx.json(agents));
  }),

  rest.get('/api/agents/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json(generateMockAgent(id as string)));
  }),

  rest.post('/api/agent-posts', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: generateMockPost(`post-${Date.now()}`)
      })
    );
  }),

  rest.get('/api/agent-posts', (req, res, ctx) => {
    const posts = [
      generateMockPost('post-1'),
      generateMockPost('post-2'),
      generateMockPost('post-3')
    ];
    return res(ctx.json(posts));
  }),

  rest.get('/api/agent-posts/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json(generateMockPost(id as string)));
  }),

  rest.post('/api/agent-posts/:id/comments', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        success: true,
        data: generateMockComment(`comment-${Date.now()}`, id as string)
      })
    );
  }),

  rest.get('/api/agent-posts/:id/comments', (req, res, ctx) => {
    const { id } = req.params;
    const comments = [
      generateMockComment('comment-1', id as string),
      generateMockComment('comment-2', id as string)
    ];
    return res(ctx.json(comments));
  }),

  // Error simulation endpoints
  rest.get('/api/error/500', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error' })
    );
  }),

  rest.get('/api/error/404', (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({ error: 'Resource not found' })
    );
  }),

  rest.post('/api/error/timeout', (req, res, ctx) => {
    // Simulate timeout
    return res(
      ctx.delay(35000), // Longer than typical timeout
      ctx.json({ success: true })
    );
  }),

  // Rate limiting simulation
  rest.post('/api/rate-limit', (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.json({
        error: 'Rate limit exceeded',
        retryAfter: 60
      })
    );
  })
];

// Create and export server instance
export const server = setupServer(...handlers);

// Export utilities for test customization
export const mockApiHandlers = {
  // Success responses
  mockHealthyClaudeCode: () => {
    server.use(
      rest.get('/api/health', (req, res, ctx) => {
        return res(
          ctx.json({
            status: 'healthy',
            version: '1.0.0',
            uptime: 123456,
            timestamp: new Date().toISOString()
          })
        );
      })
    );
  },

  // Error responses
  mockUnhealthyClaudeCode: () => {
    server.use(
      rest.get('/api/health', (req, res, ctx) => {
        return res(
          ctx.status(503),
          ctx.json({
            status: 'down',
            error: 'Claude Code instance is not running'
          })
        );
      })
    );
  },

  mockNetworkError: () => {
    server.use(
      rest.post('/api/chat/message', (req, res, ctx) => {
        return res.networkError('Network connection failed');
      })
    );
  },

  mockRateLimitError: () => {
    server.use(
      rest.post('/api/chat/message', (req, res, ctx) => {
        return res(
          ctx.status(429),
          ctx.json({
            error: 'Rate limit exceeded',
            retryAfter: 60
          })
        );
      })
    );
  },

  // Streaming simulation
  mockStreamingResponse: () => {
    server.use(
      rest.post('/api/chat/stream', (req, res, ctx) => {
        return res(
          ctx.json({
            streamId: `stream-${Date.now()}`,
            status: 'started'
          })
        );
      })
    );
  },

  // Reset to default handlers
  resetToDefaults: () => {
    server.resetHandlers(...handlers);
  }
};
