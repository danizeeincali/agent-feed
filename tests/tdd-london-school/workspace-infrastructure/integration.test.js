/**
 * Integration Tests for Agent Workspace Infrastructure
 * Tests the complete workspace system end-to-end
 */

import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { AgentWorkspaceService } from '../../../src/services/workspace/AgentWorkspaceService.js';
import { databaseService } from '../../../src/database/DatabaseService.js';
import agentWorkspaceRouter from '../../../src/routes/agent-workspace.js';

// Test app setup
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Make database service available to routes
  app.locals.databaseService = databaseService;
  
  // Mount workspace routes
  app.use('/api/agents', agentWorkspaceRouter);
  
  return app;
};

describe('Agent Workspace Infrastructure - Integration Tests', () => {
  let app;
  let testAgentId = 'test-agent-integration';
  
  beforeAll(async () => {
    // Initialize test environment
    app = createTestApp();
    
    // Initialize database service
    await databaseService.initialize();
    
    // Create test agent if needed
    try {
      const agents = await databaseService.getAgents();
      const existingAgent = agents.find(a => a.id === testAgentId || a.name === testAgentId);
      
      if (!existingAgent) {
        await databaseService.createAgent({
          id: testAgentId,
          name: testAgentId,
          display_name: 'Test Agent Integration',
          description: 'Agent for integration testing',
          system_prompt: 'You are a test agent for integration testing.',
          avatar_color: '#FF0000'
        });
      }
    } catch (error) {
      console.warn('Could not create test agent:', error.message);
    }
  });
  
  afterAll(async () => {
    // Cleanup test data
    try {
      // Remove test workspace if it exists
      const workspace = await databaseService.getAgentWorkspace(testAgentId);
      if (workspace) {
        // Remove pages first
        const pages = await databaseService.getAgentPages(testAgentId);
        for (const page of pages) {
          await databaseService.deleteAgentPage(testAgentId, page.id);
        }
        
        // Note: We don't have a deleteAgentWorkspace method yet
        // In a real scenario, we'd clean up the workspace record too
      }
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }
  });
  
  beforeEach(() => {
    // Reset any test state
    jest.clearAllMocks();
  });

  describe('Workspace Initialization API', () => {
    it('should initialize workspace via API endpoint', async () => {
      const response = await request(app)
        .post(`/api/agents/${testAgentId}/workspace/init`)
        .expect(201);
      
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Workspace initialized'),
        workspace: expect.objectContaining({
          agent_id: testAgentId,
          workspace_path: expect.stringContaining(testAgentId)
        })
      });
      
      // Verify workspace was created in database
      const workspace = await databaseService.getAgentWorkspace(testAgentId);
      expect(workspace).toBeTruthy();
      expect(workspace.agent_id).toBe(testAgentId);
    });

    it('should handle duplicate workspace initialization gracefully', async () => {
      // First initialization
      await request(app)
        .post(`/api/agents/${testAgentId}/workspace/init`)
        .expect(201);
      
      // Second initialization should not fail
      const response = await request(app)
        .post(`/api/agents/${testAgentId}/workspace/init`)
        .expect(201);
      
      expect(response.body.success).toBe(true);
    });

    it('should reject initialization for non-existent agent', async () => {
      const response = await request(app)
        .post('/api/agents/nonexistent-agent/workspace/init')
        .expect(404);
      
      expect(response.body).toMatchObject({
        error: 'Agent not found',
        code: 'AGENT_NOT_FOUND'
      });
    });
  });

  describe('Workspace Information API', () => {
    beforeEach(async () => {
      // Ensure workspace exists
      await request(app)
        .post(`/api/agents/${testAgentId}/workspace/init`);
    });

    it('should retrieve workspace information', async () => {
      const response = await request(app)
        .get(`/api/agents/${testAgentId}/workspace`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        agent_id: testAgentId,
        workspace: expect.objectContaining({
          agent_id: testAgentId,
          workspace_path: expect.any(String)
        }),
        pages: expect.any(Array),
        statistics: expect.objectContaining({
          total_pages: expect.any(Number),
          pages_by_type: expect.any(Object),
          pages_by_status: expect.any(Object)
        })
      });
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app)
        .get('/api/agents/nonexistent-agent/workspace')
        .expect(404);
      
      expect(response.body).toMatchObject({
        error: 'Workspace not found',
        code: 'WORKSPACE_NOT_FOUND'
      });
    });
  });

  describe('Agent Pages API', () => {
    beforeEach(async () => {
      // Ensure workspace exists
      await request(app)
        .post(`/api/agents/${testAgentId}/workspace/init`);
    });

    it('should create a new agent page', async () => {
      const pageData = {
        title: 'Test Page',
        content_type: 'markdown',
        content_value: '# Test Content\n\nThis is a test page.',
        page_type: 'dynamic',
        status: 'draft',
        tags: ['test', 'integration']
      };
      
      const response = await request(app)
        .post(`/api/agents/${testAgentId}/pages`)
        .send(pageData)
        .expect(201);
      
      expect(response.body).toMatchObject({
        success: true,
        message: 'Page created successfully',
        agent_id: testAgentId,
        page: expect.objectContaining({
          id: expect.any(String),
          agent_id: testAgentId,
          title: pageData.title,
          content_type: pageData.content_type,
          content_value: pageData.content_value,
          page_type: pageData.page_type,
          status: pageData.status
        })
      });
    });

    it('should list agent pages with filters', async () => {
      // Create test pages
      const pages = [
        {
          title: 'Draft Page',
          content_type: 'markdown',
          content_value: '# Draft',
          status: 'draft'
        },
        {
          title: 'Published Page',
          content_type: 'text',
          content_value: 'Published content',
          status: 'published'
        }
      ];
      
      for (const pageData of pages) {
        await request(app)
          .post(`/api/agents/${testAgentId}/pages`)
          .send(pageData);
      }
      
      // Test listing all pages
      const allPagesResponse = await request(app)
        .get(`/api/agents/${testAgentId}/pages`)
        .expect(200);
      
      expect(allPagesResponse.body).toMatchObject({
        success: true,
        agent_id: testAgentId,
        pages: expect.any(Array),
        total: expect.any(Number)
      });
      
      expect(allPagesResponse.body.pages.length).toBeGreaterThanOrEqual(2);
      
      // Test filtering by status
      const draftPagesResponse = await request(app)
        .get(`/api/agents/${testAgentId}/pages?status=draft`)
        .expect(200);
      
      expect(draftPagesResponse.body.pages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'draft' })
        ])
      );
    });

    it('should validate required fields for page creation', async () => {
      const invalidPageData = {
        title: 'Test Page'
        // Missing content_type and content_value
      };
      
      const response = await request(app)
        .post(`/api/agents/${testAgentId}/pages`)
        .send(invalidPageData)
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: expect.stringContaining('Missing required field'),
        code: 'MISSING_REQUIRED_FIELD'
      });
    });

    it('should validate content types', async () => {
      const invalidPageData = {
        title: 'Test Page',
        content_type: 'invalid-type',
        content_value: 'Some content'
      };
      
      const response = await request(app)
        .post(`/api/agents/${testAgentId}/pages`)
        .send(invalidPageData)
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: 'Validation error',
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('Health Check API', () => {
    it('should return workspace service health status', async () => {
      const response = await request(app)
        .get('/api/workspace/health')
        .expect(200);
      
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        services: expect.objectContaining({
          database_service: true
        })
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing agent ID gracefully', async () => {
      const response = await request(app)
        .post('/api/agents//workspace/init')
        .expect(404); // Express router will return 404 for empty param
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post(`/api/agents/${testAgentId}/pages`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('CRUD Operations Integration', () => {
    let createdPageId;

    it('should support complete CRUD workflow for agent pages', async () => {
      // CREATE
      const createResponse = await request(app)
        .post(`/api/agents/${testAgentId}/pages`)
        .send({
          title: 'CRUD Test Page',
          content_type: 'markdown',
          content_value: '# Initial Content',
          status: 'draft'
        })
        .expect(201);
      
      createdPageId = createResponse.body.page.id;
      expect(createdPageId).toBeTruthy();
      
      // READ
      const readResponse = await request(app)
        .get(`/api/agents/${testAgentId}/pages/${createdPageId}`)
        .expect(200);
      
      expect(readResponse.body.page).toMatchObject({
        id: createdPageId,
        title: 'CRUD Test Page',
        content_value: '# Initial Content'
      });
      
      // UPDATE
      const updateResponse = await request(app)
        .put(`/api/agents/${testAgentId}/pages/${createdPageId}`)
        .send({
          title: 'Updated CRUD Test Page',
          content_value: '# Updated Content',
          status: 'published'
        })
        .expect(200);
      
      expect(updateResponse.body.page).toMatchObject({
        id: createdPageId,
        title: 'Updated CRUD Test Page',
        content_value: '# Updated Content',
        status: 'published'
      });
      
      // DELETE
      await request(app)
        .delete(`/api/agents/${testAgentId}/pages/${createdPageId}`)
        .expect(200);
      
      // Verify deletion
      await request(app)
        .get(`/api/agents/${testAgentId}/pages/${createdPageId}`)
        .expect(404);
    });
  });
});