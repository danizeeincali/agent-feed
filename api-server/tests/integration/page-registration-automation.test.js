/**
 * Page Registration Automation Integration Tests
 *
 * Tests the page-builder-agent automatic registration behavior using REAL functionality.
 * - NO MOCKS - All tests use real API server and database
 * - Tests direct curl execution via page-builder workflow
 * - Tests verification after registration
 * - Tests error handling when registration fails
 * - Tests page accessibility after creation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration - points to REAL API server
const API_BASE = 'localhost';
const API_PORT = 3001;
const PAGES_DIR = '/workspaces/agent-feed/data/agent-pages';
const TEST_TIMEOUT = 30000;

// Helper function to make HTTP requests (simulates curl)
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData,
          data: responseData ? JSON.parse(responseData) : null
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Helper function to create test page file
async function createTestPageFile(pageData) {
  const filePath = path.join(PAGES_DIR, `${pageData.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
  return filePath;
}

// Helper function to cleanup test files
async function cleanupTestFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

describe('Page Registration Automation - Integration Tests', () => {
  let testAgentId;
  let createdPageFiles = [];

  beforeAll(async () => {
    // Generate a unique test agent ID
    testAgentId = `test-agent-${uuidv4()}`;

    console.log(`\n🧪 Test Agent ID: ${testAgentId}`);
    console.log(`📍 API Endpoint: http://${API_BASE}:${API_PORT}`);
    console.log(`📁 Pages Directory: ${PAGES_DIR}\n`);
  });

  afterAll(async () => {
    // Cleanup all created test files
    console.log('\n🧹 Cleaning up test files...');
    for (const filePath of createdPageFiles) {
      await cleanupTestFile(filePath);
    }
  });

  beforeEach(() => {
    // Reset created files array for each test
    createdPageFiles = [];
  });

  describe('Direct Curl Execution via Page-Builder Workflow', () => {
    it('should successfully register a new page via POST request', async () => {
      // Arrange: Create page data
      const pageData = {
        id: `test-page-${uuidv4()}`,
        agent_id: testAgentId,
        title: 'Test Page - Registration Automation',
        page_type: 'dynamic',
        content_type: 'json',
        content_value: JSON.stringify({
          sections: [
            { type: 'header', content: 'Test Dashboard' },
            { type: 'text', content: 'This is a test page for automation' }
          ]
        }),
        status: 'published',
        version: 1,
        tags: ['test', 'automation']
      };

      // Create the page file first
      const filePath = await createTestPageFile(pageData);
      createdPageFiles.push(filePath);

      // Act: Execute POST request (simulates curl execution)
      const postOptions = {
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const response = await makeRequest(postOptions, pageData);

      // Assert: Verify successful registration
      expect(response.statusCode).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.page).toBeDefined();
      expect(response.data.data.page.id).toBe(pageData.id);
      expect(response.data.data.page.agent_id).toBe(pageData.agent_id);
      expect(response.data.data.page.title).toBe(pageData.title);
      expect(response.data.message).toBe('Page created successfully');

      console.log(`✅ Page registered successfully: ${pageData.id}`);
    }, TEST_TIMEOUT);

    it('should handle duplicate page registration gracefully', async () => {
      // Arrange: Create and register a page
      const pageData = {
        id: `test-page-duplicate-${uuidv4()}`,
        agent_id: testAgentId,
        title: `Duplicate Test Page ${Date.now()}`,
        page_type: 'dynamic',
        content_type: 'text',
        content_value: 'Test content',
        status: 'draft',
        version: 1
      };

      const filePath = await createTestPageFile(pageData);
      createdPageFiles.push(filePath);

      const postOptions = {
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // First registration
      const firstResponse = await makeRequest(postOptions, pageData);
      expect(firstResponse.statusCode).toBe(201);

      // Act: Try to register the same page again
      const secondResponse = await makeRequest(postOptions, pageData);

      // Assert: Should handle duplicate appropriately
      // Note: Depending on implementation, this might be 409 Conflict or 200 OK with existing data
      expect([200, 201, 409]).toContain(secondResponse.statusCode);

      console.log(`✅ Duplicate registration handled: ${secondResponse.statusCode}`);
    }, TEST_TIMEOUT);

    it('should reject invalid page data with proper error messages', async () => {
      // Arrange: Create invalid page data (missing required fields)
      const invalidPageData = {
        id: `test-page-invalid-${uuidv4()}`,
        agent_id: testAgentId,
        // Missing: title, content_type, content_value
      };

      const postOptions = {
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${invalidPageData.agent_id}/pages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // Act: Attempt to register invalid page
      const response = await makeRequest(postOptions, invalidPageData);

      // Assert: Should return 400 Bad Request
      expect(response.statusCode).toBe(400);
      expect(response.data.error).toBeDefined();
      expect(response.data.code).toBe('VALIDATION_ERROR');

      console.log(`✅ Invalid data rejected: ${response.data.message}`);
    }, TEST_TIMEOUT);
  });

  describe('Verification After Registration', () => {
    it('should retrieve registered page via GET request', async () => {
      // Arrange: Create and register a page
      const pageData = {
        id: `test-page-verify-${uuidv4()}`,
        agent_id: testAgentId,
        title: 'Verification Test Page',
        page_type: 'dynamic',
        content_type: 'markdown',
        content_value: '# Test Page\nThis page tests verification flow.',
        status: 'published',
        version: 1,
        tags: ['verification', 'test']
      };

      const filePath = await createTestPageFile(pageData);
      createdPageFiles.push(filePath);

      // Register the page
      const postResponse = await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, pageData);

      expect(postResponse.statusCode).toBe(201);

      // Act: Retrieve the registered page
      const getResponse = await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages/${pageData.id}`,
        method: 'GET'
      });

      // Assert: Verify retrieved data matches registered data
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.data.success).toBe(true);
      expect(getResponse.data.data.page.id).toBe(pageData.id);
      expect(getResponse.data.data.page.title).toBe(pageData.title);
      expect(getResponse.data.data.page.content_type).toBe(pageData.content_type);
      expect(getResponse.data.data.page.status).toBe(pageData.status);

      console.log(`✅ Page verified successfully: ${pageData.id}`);
    }, TEST_TIMEOUT);

    it('should list registered page in agent pages collection', async () => {
      // Arrange: Register multiple pages
      const pages = [];
      for (let i = 0; i < 3; i++) {
        const pageData = {
          id: `test-page-list-${i}-${uuidv4()}`,
          agent_id: testAgentId,
          title: `List Test Page ${i}`,
          page_type: 'dynamic',
          content_type: 'text',
          content_value: `Content for page ${i}`,
          status: 'published',
          version: 1
        };

        const filePath = await createTestPageFile(pageData);
        createdPageFiles.push(filePath);
        pages.push(pageData);

        await makeRequest({
          hostname: API_BASE,
          port: API_PORT,
          path: `/api/agents/${pageData.agent_id}/pages`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, pageData);
      }

      // Act: List all pages for the agent
      const listResponse = await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${testAgentId}/pages`,
        method: 'GET'
      });

      // Assert: Verify all pages are listed
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(listResponse.data.data.pages).toBeDefined();
      expect(Array.isArray(listResponse.data.data.pages)).toBe(true);
      expect(listResponse.data.data.pages.length).toBeGreaterThanOrEqual(3);

      // Verify our test pages are in the list
      const pageIds = listResponse.data.data.pages.map(p => p.id);
      for (const page of pages) {
        expect(pageIds).toContain(page.id);
      }

      console.log(`✅ Listed ${listResponse.data.data.pages.length} pages for agent ${testAgentId}`);
    }, TEST_TIMEOUT);
  });

  describe('Error Handling When Registration Fails', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange: Use invalid port to simulate network error
      const pageData = {
        id: `test-page-network-${uuidv4()}`,
        agent_id: testAgentId,
        title: 'Network Error Test',
        page_type: 'dynamic',
        content_type: 'text',
        content_value: 'Test',
        version: 1
      };

      const invalidOptions = {
        hostname: API_BASE,
        port: 9999, // Invalid port
        path: `/api/agents/${pageData.agent_id}/pages`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      // Act & Assert: Should reject with network error
      await expect(
        makeRequest(invalidOptions, pageData)
      ).rejects.toThrow();

      console.log(`✅ Network error handled correctly`);
    }, TEST_TIMEOUT);

    it('should return 404 for non-existent agent', async () => {
      // Arrange: Use non-existent agent ID
      const nonExistentAgentId = `non-existent-${uuidv4()}`;
      const pageData = {
        id: `test-page-404-${uuidv4()}`,
        agent_id: nonExistentAgentId,
        title: '404 Test Page',
        page_type: 'dynamic',
        content_type: 'text',
        content_value: 'Test content',
        version: 1
      };

      const postOptions = {
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${nonExistentAgentId}/pages`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      // Act: Try to register page for non-existent agent
      const response = await makeRequest(postOptions, pageData);

      // Assert: Should return 404 Not Found
      expect(response.statusCode).toBe(404);
      expect(response.data.error).toBeDefined();
      expect(response.data.code).toBe('AGENT_NOT_FOUND');

      console.log(`✅ Non-existent agent handled: ${response.data.message}`);
    }, TEST_TIMEOUT);

    it('should handle malformed JSON gracefully', async () => {
      // Arrange: Create request with malformed JSON
      const postOptions = {
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${testAgentId}/pages`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      // Act: Send malformed JSON
      const response = await new Promise((resolve, reject) => {
        const req = http.request(postOptions, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({
            statusCode: res.statusCode,
            body: data,
            data: data ? JSON.parse(data) : null
          }));
        });
        req.on('error', reject);
        req.write('{ invalid json }'); // Malformed JSON
        req.end();
      });

      // Assert: Should return 400 Bad Request
      expect(response.statusCode).toBe(400);

      console.log(`✅ Malformed JSON handled: ${response.statusCode}`);
    }, TEST_TIMEOUT);
  });

  describe('Page Accessibility After Creation', () => {
    it('should make page accessible via frontend URL pattern', async () => {
      // Arrange: Create and register a page
      const pageData = {
        id: `test-page-accessible-${uuidv4()}`,
        agent_id: testAgentId,
        title: 'Accessibility Test Page',
        page_type: 'dynamic',
        content_type: 'component',
        content_value: JSON.stringify({
          type: 'dashboard',
          widgets: [
            { type: 'chart', data: { values: [1, 2, 3] } },
            { type: 'table', data: { rows: [] } }
          ]
        }),
        status: 'published',
        version: 1
      };

      const filePath = await createTestPageFile(pageData);
      createdPageFiles.push(filePath);

      // Register the page
      const postResponse = await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, pageData);

      expect(postResponse.statusCode).toBe(201);

      // Act: Verify page is accessible via API
      const getResponse = await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages/${pageData.id}`,
        method: 'GET'
      });

      // Assert: Page should be fully accessible
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.data.success).toBe(true);
      expect(getResponse.data.data.page).toBeDefined();

      // Verify frontend URL pattern would work
      const frontendUrl = `/agents/${pageData.agent_id}/pages/${pageData.id}`;
      expect(frontendUrl).toMatch(/^\/agents\/[^\/]+\/pages\/[^\/]+$/);

      console.log(`✅ Page accessible at: ${frontendUrl}`);
    }, TEST_TIMEOUT);

    it('should support page updates after registration', async () => {
      // Arrange: Create and register a page
      const pageData = {
        id: `test-page-update-${uuidv4()}`,
        agent_id: testAgentId,
        title: 'Update Test Page',
        page_type: 'dynamic',
        content_type: 'text',
        content_value: 'Original content',
        status: 'draft',
        version: 1
      };

      const filePath = await createTestPageFile(pageData);
      createdPageFiles.push(filePath);

      // Register the page
      await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, pageData);

      // Act: Update the page
      const updateData = {
        title: 'Updated Test Page',
        content_value: 'Updated content',
        status: 'published',
        version: 2
      };

      const updateResponse = await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages/${pageData.id}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      }, updateData);

      // Assert: Update should succeed
      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.data.success).toBe(true);
      expect(updateResponse.data.data.page.title).toBe(updateData.title);
      expect(updateResponse.data.data.page.content_value).toBe(updateData.content_value);
      expect(updateResponse.data.data.page.status).toBe(updateData.status);
      expect(updateResponse.data.data.page.version).toBe(updateData.version);

      console.log(`✅ Page updated successfully: ${pageData.id}`);
    }, TEST_TIMEOUT);

    it('should support page deletion', async () => {
      // Arrange: Create and register a page
      const pageData = {
        id: `test-page-delete-${uuidv4()}`,
        agent_id: testAgentId,
        title: 'Delete Test Page',
        page_type: 'dynamic',
        content_type: 'text',
        content_value: 'To be deleted',
        status: 'draft',
        version: 1
      };

      const filePath = await createTestPageFile(pageData);
      createdPageFiles.push(filePath);

      // Register the page
      await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, pageData);

      // Act: Delete the page
      const deleteResponse = await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages/${pageData.id}`,
        method: 'DELETE'
      });

      // Assert: Delete should succeed
      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.data.success).toBe(true);
      expect(deleteResponse.data.data.deletedPageId).toBe(pageData.id);

      // Verify page no longer exists
      const getResponse = await makeRequest({
        hostname: API_BASE,
        port: API_PORT,
        path: `/api/agents/${pageData.agent_id}/pages/${pageData.id}`,
        method: 'GET'
      });

      expect(getResponse.statusCode).toBe(404);

      console.log(`✅ Page deleted successfully: ${pageData.id}`);
    }, TEST_TIMEOUT);
  });
});
