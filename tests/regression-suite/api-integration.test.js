/**
 * API Integration Validation Test Suite
 * Tests API endpoints, database integration, and data structure validation
 */

const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');

describe('API Integration Validation', () => {
  let serverProcess;
  let app;
  const BASE_URL = 'http://localhost:8080';

  beforeAll(async () => {
    // Start the backend server
    serverProcess = spawn('node', ['simple-backend.js'], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create a simple request client
    app = request(BASE_URL);
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  describe('Agent Pages API Endpoints', () => {
    test('should get agent page data for agent-001', async () => {
      const response = await app
        .get('/api/agent-pages/agent-001/personal-todos')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('components');
      expect(Array.isArray(response.body.components)).toBe(true);
      
      // Validate component structure
      response.body.components.forEach(component => {
        expect(component).toHaveProperty('type');
        expect(component).toHaveProperty('props');
        expect(typeof component.type).toBe('string');
        expect(typeof component.props).toBe('object');
      });

      console.log(`✅ Agent-001 API endpoint working`);
    });

    test('should get agent page data for agent-002', async () => {
      const response = await app
        .get('/api/agent-pages/agent-002/task-manager')
        .expect(200);

      expect(response.body).toHaveProperty('id', 'agent-002');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('components');
      expect(Array.isArray(response.body.components)).toBe(true);
      expect(response.body.components.length).toBeGreaterThan(0);

      console.log(`✅ Agent-002 API endpoint working`);
    });

    test('should get agent page data for agent-003', async () => {
      const response = await app
        .get('/api/agent-pages/agent-003/productivity-dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('id', 'agent-003');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('components');
      expect(Array.isArray(response.body.components)).toBe(true);
      expect(response.body.components.length).toBeGreaterThan(0);

      console.log(`✅ Agent-003 API endpoint working`);
    });

    test('should return 404 for non-existent agent page', async () => {
      await app
        .get('/api/agent-pages/agent-999/non-existent')
        .expect(404);
    });
  });

  describe('Data Structure Validation', () => {
    test('should return valid page specification structure', async () => {
      const response = await app
        .get('/api/agent-pages/agent-001/personal-todos')
        .expect(200);

      const pageSpec = response.body;

      // Required fields
      expect(pageSpec).toHaveProperty('id');
      expect(pageSpec).toHaveProperty('version');
      expect(pageSpec).toHaveProperty('title'); 
      expect(pageSpec).toHaveProperty('layout');
      expect(pageSpec).toHaveProperty('components');

      // Data types
      expect(typeof pageSpec.id).toBe('string');
      expect(typeof pageSpec.version).toBe('number');
      expect(typeof pageSpec.title).toBe('string');
      expect(typeof pageSpec.layout).toBe('string');
      expect(Array.isArray(pageSpec.components)).toBe(true);

      // Layout validation
      expect(['single', 'grid', 'tabs', 'accordion']).toContain(pageSpec.layout);

      // Component validation
      pageSpec.components.forEach((component, index) => {
        expect(component).toHaveProperty('type');
        expect(component).toHaveProperty('props');
        expect(typeof component.type).toBe('string');
        expect(typeof component.props).toBe('object');
        
        // Optional fields
        if (component.id) {
          expect(typeof component.id).toBe('string');
        }
        if (component.children) {
          expect(Array.isArray(component.children)).toBe(true);
        }
        if (component.events) {
          expect(typeof component.events).toBe('object');
        }
      });
    });

    test('should have valid component types in registry', async () => {
      const validComponentTypes = [
        'Button', 'Input', 'Textarea', 'Select', 'Checkbox',
        'Card', 'Badge', 'Progress', 'Metric',
        'Container', 'Grid', 'Navbar', 'Breadcrumbs', 'Tabs', 'Pagination',
        'Flex', 'Stack', 'Divider', 'Spacer',
        'Avatar', 'Alert', 'DatePicker', 'Switch', 'RadioGroup',
        'Table', 'List', 'Timeline', 'Loading', 'Skeleton',
        'ProfileHeader', 'ActivityFeed', 'CapabilityList', 'PerformanceMetrics'
      ];

      const pages = [
        '/api/agent-pages/agent-001/personal-todos',
        '/api/agent-pages/agent-002/task-manager',
        '/api/agent-pages/agent-003/productivity-dashboard'
      ];

      for (const pagePath of pages) {
        const response = await app.get(pagePath).expect(200);
        const pageSpec = response.body;

        pageSpec.components.forEach(component => {
          expect(validComponentTypes).toContain(component.type);
        });
      }
    });
  });

  describe('Database Integration', () => {
    test('should connect to database successfully', async () => {
      const response = await app
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('status', 'connected');
    });

    test('should handle database queries without errors', async () => {
      // Test each agent page endpoint to ensure database queries work
      const endpoints = [
        '/api/agent-pages/agent-001/personal-todos',
        '/api/agent-pages/agent-002/task-manager',
        '/api/agent-pages/agent-003/productivity-dashboard'
      ];

      for (const endpoint of endpoints) {
        const start = Date.now();
        const response = await app.get(endpoint).expect(200);
        const duration = Date.now() - start;

        expect(response.body).toBeDefined();
        expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
      }
    });

    test('should validate data persistence', async () => {
      // Test that data is consistently returned
      const response1 = await app
        .get('/api/agent-pages/agent-001/personal-todos')
        .expect(200);

      const response2 = await app  
        .get('/api/agent-pages/agent-001/personal-todos')
        .expect(200);

      // Data should be consistent between calls
      expect(response1.body.id).toBe(response2.body.id);
      expect(response1.body.version).toBe(response2.body.version);
      expect(response1.body.title).toBe(response2.body.title);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed requests gracefully', async () => {
      await app
        .get('/api/agent-pages/agent-001/\\invalid-path')
        .expect(404);

      await app  
        .get('/api/agent-pages//')
        .expect(404);
    });

    test('should return proper error responses', async () => {
      const response = await app
        .get('/api/agent-pages/non-existent/page')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    test('should validate request parameters', async () => {
      // Test with invalid agent IDs
      await app
        .get('/api/agent-pages/agent-<script>/xss')
        .expect(404);

      await app
        .get('/api/agent-pages/agent-999999999999999/overflow')  
        .expect(404);
    });
  });
});