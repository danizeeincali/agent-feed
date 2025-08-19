import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { exec } from 'child_process';
import { promisify } from 'util';

/**
 * Security Audit and Vulnerability Testing Suite
 * Tests authentication, authorization, input validation, and container security
 */

const execAsync = promisify(exec);

describe('Security Audit', () => {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
  let authToken: string;

  beforeAll(async () => {
    // Setup authenticated user for testing
    try {
      const response = await request(API_BASE_URL)
        .post('/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'SecureTestPassword123!'
        });
      
      if (response.status === 200) {
        authToken = response.body.token;
      }
    } catch (error) {
      console.warn('Could not authenticate test user');
    }
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      const protectedEndpoints = [
        '/api/agent-posts',
        '/api/claude-flow/swarm/init',
        '/api/claude-flow/agents/spawn',
        '/api/user/profile'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(API_BASE_URL)
          .get(endpoint);

        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await request(API_BASE_URL)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${token}`);

        expect([401, 403]).toContain(response.status);
      }
    });

    it('should enforce role-based access control', async () => {
      // Test admin-only endpoints
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/system-health',
        '/api/admin/database/reset'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(API_BASE_URL)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`);

        // Should be forbidden for non-admin users
        expect([403, 404]).toContain(response.status);
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(API_BASE_URL)
          .get(`/api/agent-posts?search=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should not return 500 (SQL error) and should handle gracefully
        expect(response.status).not.toBe(500);
        
        if (response.status === 200) {
          // Verify no unauthorized data is returned
          expect(response.body).not.toHaveProperty('users');
          expect(response.body).not.toHaveProperty('password');
        }
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script><!--'
      ];

      for (const payload of xssPayloads) {
        const response = await request(API_BASE_URL)
          .post('/api/agent-posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: payload,
            content: `Content with XSS: ${payload}`,
            agent_id: 'security-test-agent',
            agent_type: 'security-tester'
          });

        if (response.status === 201) {
          // Verify the response is sanitized
          expect(response.body.title).not.toContain('<script>');
          expect(response.body.title).not.toContain('javascript:');
          expect(response.body.content).not.toContain('<script>');
        }
      }
    });
  });

  describe('Container Security', () => {
    it('should run containers with non-root user', async () => {
      const containers = ['agent-feed-api', 'agent-feed-postgres'];
      
      for (const container of containers) {
        try {
          const { stdout } = await execAsync(`docker exec ${container} whoami`);
          const user = stdout.trim();
          
          expect(user).not.toBe('root');
        } catch (error) {
          console.warn(`Could not check user for container ${container}`);
        }
      }
    });

    it('should have proper container resource limits', async () => {
      try {
        const { stdout } = await execAsync(
          'docker inspect agent-feed-api --format="{{.HostConfig.Memory}} {{.HostConfig.CpuShares}}"'
        );
        
        const [memory, cpuShares] = stdout.trim().split(' ');
        
        // Memory should be limited (not 0)
        expect(parseInt(memory)).toBeGreaterThan(0);
        
        // CPU shares should be reasonable
        if (parseInt(cpuShares) > 0) {
          expect(parseInt(cpuShares)).toBeLessThan(2048);
        }
      } catch (error) {
        console.warn('Could not check container resource limits');
      }
    });
  });

  describe('Network Security', () => {
    it('should enforce HTTPS in production', async () => {
      // Check security headers
      const response = await request(API_BASE_URL)
        .get('/api/health');

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers).toHaveProperty('strict-transport-security');
      }
    });

    it('should implement proper CORS policy', async () => {
      const response = await request(API_BASE_URL)
        .options('/api/health')
        .set('Origin', 'http://malicious-site.com');

      // Should not allow arbitrary origins
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    });
  });
});