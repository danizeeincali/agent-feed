/**
 * OAuth Endpoints Integration Tests
 *
 * Tests the OAuth-style authorization flow for Claude authentication
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock dependencies
const mockDb = {
  run: jest.fn((sql, params, callback) => callback?.(null)),
  get: jest.fn((sql, params, callback) => callback?.(null, null)),
  all: jest.fn((sql, params, callback) => callback?.(null, []))
};

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Set database in app locals
  app.locals.db = mockDb;

  // Import and mount routes
  return import('../../../routes/auth/claude-auth.js')
    .then(module => {
      app.use('/api/claude-code', module.default);
      return app;
    });
};

describe('OAuth Endpoints', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_URL = 'http://localhost:3000';
  });

  describe('GET /api/claude-code/oauth/authorize', () => {
    it('should redirect to OAuth consent page', async () => {
      const response = await request(app)
        .get('/api/claude-code/oauth/authorize')
        .query({ userId: 'test-user-123' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/oauth-consent');
      expect(response.headers.location).toContain('client_id=agent-feed-platform');
      expect(response.headers.location).toContain('response_type=code');
      expect(response.headers.location).toContain('scope=inference');
      expect(response.headers.location).toContain('state=test-user-123');
    });

    it('should use default userId if not provided', async () => {
      const response = await request(app)
        .get('/api/claude-code/oauth/authorize');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('state=demo-user-123');
    });

    it('should include redirect_uri parameter', async () => {
      const response = await request(app)
        .get('/api/claude-code/oauth/authorize');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('redirect_uri');
      expect(response.headers.location).toContain('/oauth/callback');
    });
  });

  describe('GET /api/claude-code/oauth/callback', () => {
    it('should handle error parameter', async () => {
      const response = await request(app)
        .get('/api/claude-code/oauth/callback')
        .query({ error: 'access_denied', state: 'test-user' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings');
      expect(response.headers.location).toContain('error=access_denied');
    });

    it('should reject callback without user state', async () => {
      const response = await request(app)
        .get('/api/claude-code/oauth/callback')
        .query({ code: 'auth-code-123' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=Missing+user+state');
    });

    it('should handle OAuth code (future implementation)', async () => {
      const response = await request(app)
        .get('/api/claude-code/oauth/callback')
        .query({ code: 'auth-code-123', state: 'test-user' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('oauth=pending');
      expect(response.headers.location).toContain('not+yet+supported');
    });

    it('should accept valid API key', async () => {
      // Mock successful database update
      mockDb.run.mockImplementationOnce((sql, params, callback) => {
        callback?.(null);
      });

      const validApiKey = 'sk-ant-api03-' + 'A'.repeat(95) + 'AA';
      const response = await request(app)
        .get('/api/claude-code/oauth/callback')
        .query({ api_key: validApiKey, state: 'test-user-123' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings');
      expect(response.headers.location).toContain('oauth=success');
    });

    it('should reject invalid API key format', async () => {
      const response = await request(app)
        .get('/api/claude-code/oauth/callback')
        .query({ api_key: 'invalid-key', state: 'test-user' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=Invalid+API+key+format');
    });

    it('should redirect with error if no authorization data', async () => {
      const response = await request(app)
        .get('/api/claude-code/oauth/callback')
        .query({ state: 'test-user' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=Missing+authorization+data');
    });
  });

  describe('POST /api/claude-code/oauth/token', () => {
    it('should reject unsupported grant types', async () => {
      const response = await request(app)
        .post('/api/claude-code/oauth/token')
        .send({ grant_type: 'password' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('unsupported_grant_type');
    });

    it('should return 501 for authorization_code grant', async () => {
      const response = await request(app)
        .post('/api/claude-code/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'auth-code-123'
        });

      expect(response.status).toBe(501);
      expect(response.body.error).toBe('not_implemented');
      expect(response.body.error_description).toContain('not yet supported');
    });

    it('should accept valid API key with api_key grant', async () => {
      mockDb.run.mockImplementationOnce((sql, params, callback) => {
        callback?.(null);
      });

      const validApiKey = 'sk-ant-api03-' + 'A'.repeat(95) + 'AA';
      const response = await request(app)
        .post('/api/claude-code/oauth/token')
        .send({
          grant_type: 'api_key',
          api_key: validApiKey,
          user_id: 'test-user-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBe(validApiKey);
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.scope).toBe('inference');
      expect(response.body.note).toContain('future compatibility');
    });

    it('should reject invalid API key format', async () => {
      const response = await request(app)
        .post('/api/claude-code/oauth/token')
        .send({
          grant_type: 'api_key',
          api_key: 'invalid-key'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_request');
      expect(response.body.error_description).toContain('Invalid API key');
    });

    it('should use default userId if not provided', async () => {
      mockDb.run.mockImplementationOnce((sql, params, callback) => {
        expect(params[0]).toBe('demo-user-123'); // First param is userId
        callback?.(null);
      });

      const validApiKey = 'sk-ant-api03-' + 'A'.repeat(95) + 'AA';
      await request(app)
        .post('/api/claude-code/oauth/token')
        .send({
          grant_type: 'api_key',
          api_key: validApiKey
        });
    });
  });

  describe('DELETE /api/claude-code/oauth/revoke', () => {
    it('should revoke OAuth tokens and reset to platform_payg', async () => {
      mockDb.run.mockImplementationOnce((sql, params, callback) => {
        callback?.(null);
      });

      const response = await request(app)
        .delete('/api/claude-code/oauth/revoke')
        .send({ userId: 'test-user-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('revoked');
    });

    it('should accept userId from query params', async () => {
      mockDb.run.mockImplementationOnce((sql, params, callback) => {
        callback?.(null);
      });

      const response = await request(app)
        .delete('/api/claude-code/oauth/revoke')
        .query({ userId: 'query-user-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.run.mockImplementationOnce((sql, params, callback) => {
        callback?.(new Error('Database error'));
      });

      const response = await request(app)
        .delete('/api/claude-code/oauth/revoke')
        .send({ userId: 'test-user' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/claude-code/test', () => {
    it('should return test status with OAuth endpoints listed', async () => {
      const response = await request(app)
        .get('/api/claude-code/test');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.oauth_authorize).toBe('/api/claude-code/oauth/authorize');
      expect(response.body.endpoints.oauth_callback).toBe('/api/claude-code/oauth/callback');
      expect(response.body.endpoints.oauth_token).toBe('/api/claude-code/oauth/token');
      expect(response.body.endpoints.oauth_revoke).toBe('/api/claude-code/oauth/revoke');
    });
  });
});
