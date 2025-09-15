import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Dynamic Pages
 *
 * Tests all dynamic pages API endpoints with real API calls:
 * - GET /api/agents/:agentId/pages (list pages)
 * - GET /api/agents/:agentId/pages/:pageId (get specific page)
 * - POST /api/agents/:agentId/pages (create page)
 * - PUT /api/agents/:agentId/pages/:pageId (update page)
 * - DELETE /api/agents/:agentId/pages/:pageId (delete page)
 *
 * Tests against running servers on localhost:3000 (backend) and localhost:5173 (frontend)
 */

interface DynamicPage {
  id: string;
  agent_id: string;
  title: string;
  page_type: string;
  content_type: string;
  content_value: string;
  content_metadata?: any;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
  version: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  timestamp: string;
}

interface AgentPagesListResponse {
  pages: DynamicPage[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  agent: {
    id: string;
    name: string;
    display_name: string;
  };
}

interface PageResponse {
  page: DynamicPage;
  agent: {
    id: string;
    name: string;
    display_name: string;
  };
}

test.describe('Dynamic Pages API Integration', () => {
  const BASE_URL = 'http://localhost:3000';
  const AGENT_ID = 'personal-todos-agent';

  let request: APIRequestContext;
  let createdPageIds: string[] = [];

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    // Clean up any remaining test pages
    for (const pageId of createdPageIds) {
      try {
        await request.delete(`/api/agents/${AGENT_ID}/pages/${pageId}`);
      } catch (error) {
        console.warn(`Failed to cleanup page ${pageId}:`, error);
      }
    }
    await request.dispose();
  });

  test.afterEach(async () => {
    // Clean up pages created in each test
    for (const pageId of createdPageIds) {
      try {
        await request.delete(`/api/agents/${AGENT_ID}/pages/${pageId}`);
      } catch (error) {
        console.warn(`Failed to cleanup page ${pageId}:`, error);
      }
    }
    createdPageIds = [];
  });

  test('GET /api/agents/:agentId/pages - List all pages for agent', async () => {
    // First, create a few test pages
    const testPages = [
      {
        title: 'Test Dashboard Page',
        content_type: 'component',
        content_value: JSON.stringify({ type: 'dashboard', widgets: ['tasks'] }),
        status: 'published',
        tags: ['dashboard', 'test']
      },
      {
        title: 'Test Documentation',
        content_type: 'markdown',
        content_value: '# Test Documentation\n\nThis is test content.',
        status: 'draft',
        tags: ['docs']
      }
    ];

    // Create test pages
    for (const pageData of testPages) {
      const createResponse = await request.post(`/api/agents/${AGENT_ID}/pages`, {
        data: pageData
      });
      expect(createResponse.ok()).toBeTruthy();
      const created = await createResponse.json() as ApiResponse<PageResponse>;
      expect(created.success).toBe(true);
      createdPageIds.push(created.data.page.id);
    }

    // Test listing pages
    const response = await request.get(`/api/agents/${AGENT_ID}/pages`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json() as ApiResponse<AgentPagesListResponse>;
    expect(data.success).toBe(true);
    expect(data.data.pages).toBeInstanceOf(Array);
    expect(data.data.pages.length).toBeGreaterThanOrEqual(2);

    // Verify response structure
    expect(data.data.pagination).toBeDefined();
    expect(data.data.pagination.total).toBeGreaterThanOrEqual(2);
    expect(data.data.agent).toBeDefined();
    expect(data.data.agent.id).toBe(AGENT_ID);

    // Verify page structure
    const page = data.data.pages[0];
    expect(page.id).toBeDefined();
    expect(page.agent_id).toBe(AGENT_ID);
    expect(page.title).toBeDefined();
    expect(page.content_type).toBeDefined();
    expect(page.content_value).toBeDefined();
    expect(['published', 'draft', 'archived']).toContain(page.status);
    expect(page.tags).toBeInstanceOf(Array);
    expect(page.created_at).toBeDefined();
    expect(page.updated_at).toBeDefined();
  });

  test('GET /api/agents/:agentId/pages - Test filtering and pagination', async () => {
    // Create pages with different statuses and content types
    const testPages = [
      { title: 'Published Component', content_type: 'component', content_value: '{}', status: 'published' },
      { title: 'Draft Markdown', content_type: 'markdown', content_value: '# Draft', status: 'draft' },
      { title: 'Archived Text', content_type: 'text', content_value: 'Archived content', status: 'archived' },
      { title: 'Published Text', content_type: 'text', content_value: 'Published text', status: 'published' },
      { title: 'Draft Component', content_type: 'component', content_value: '{}', status: 'draft' }
    ];

    for (const pageData of testPages) {
      const createResponse = await request.post(`/api/agents/${AGENT_ID}/pages`, {
        data: pageData
      });
      const created = await createResponse.json() as ApiResponse<PageResponse>;
      createdPageIds.push(created.data.page.id);
    }

    // Test status filtering
    const publishedResponse = await request.get(`/api/agents/${AGENT_ID}/pages?status=published`);
    const publishedData = await publishedResponse.json() as ApiResponse<AgentPagesListResponse>;
    expect(publishedData.data.pages.every(p => p.status === 'published')).toBe(true);
    expect(publishedData.data.pages.length).toBe(2);

    // Test content type filtering
    const componentResponse = await request.get(`/api/agents/${AGENT_ID}/pages?content_type=component`);
    const componentData = await componentResponse.json() as ApiResponse<AgentPagesListResponse>;
    expect(componentData.data.pages.every(p => p.content_type === 'component')).toBe(true);
    expect(componentData.data.pages.length).toBe(2);

    // Test pagination
    const paginatedResponse = await request.get(`/api/agents/${AGENT_ID}/pages?limit=2&offset=0`);
    const paginatedData = await paginatedResponse.json() as ApiResponse<AgentPagesListResponse>;
    expect(paginatedData.data.pages.length).toBeLessThanOrEqual(2);
    expect(paginatedData.data.pagination.limit).toBe(2);
    expect(paginatedData.data.pagination.offset).toBe(0);

    // Test search
    const searchResponse = await request.get(`/api/agents/${AGENT_ID}/pages?search=Draft`);
    const searchData = await searchResponse.json() as ApiResponse<AgentPagesListResponse>;
    expect(searchData.data.pages.every(p => p.title.includes('Draft'))).toBe(true);
  });

  test('GET /api/agents/:agentId/pages/:pageId - Get specific page', async () => {
    // Create a test page first
    const pageData = {
      title: 'Specific Test Page',
      content_type: 'json',
      content_value: JSON.stringify({ test: 'data', version: 1 }),
      status: 'published',
      tags: ['specific', 'test'],
      content_metadata: { author: 'test', category: 'demo' }
    };

    const createResponse = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: pageData
    });
    const created = await createResponse.json() as ApiResponse<PageResponse>;
    const pageId = created.data.page.id;
    createdPageIds.push(pageId);

    // Get the specific page
    const response = await request.get(`/api/agents/${AGENT_ID}/pages/${pageId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json() as ApiResponse<PageResponse>;
    expect(data.success).toBe(true);

    const page = data.data.page;
    expect(page.id).toBe(pageId);
    expect(page.agent_id).toBe(AGENT_ID);
    expect(page.title).toBe(pageData.title);
    expect(page.content_type).toBe(pageData.content_type);
    expect(page.content_value).toBe(pageData.content_value);
    expect(page.status).toBe(pageData.status);
    expect(page.tags).toEqual(pageData.tags);
    expect(page.content_metadata).toEqual(pageData.content_metadata);

    // Verify agent info
    expect(data.data.agent.id).toBe(AGENT_ID);
  });

  test('POST /api/agents/:agentId/pages - Create new page', async () => {
    const pageData = {
      title: 'New API Test Page',
      content_type: 'markdown',
      content_value: '# API Test Page\n\nThis page was created via API.',
      status: 'draft',
      tags: ['api', 'test', 'new'],
      content_metadata: { source: 'api-test', priority: 'high' },
      version: 1
    };

    const response = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: pageData
    });

    expect(response.status()).toBe(201);

    const data = await response.json() as ApiResponse<PageResponse>;
    expect(data.success).toBe(true);
    expect(data.message).toBe('Page created successfully');

    const page = data.data.page;
    expect(page.id).toBeDefined();
    expect(page.agent_id).toBe(AGENT_ID);
    expect(page.title).toBe(pageData.title);
    expect(page.content_type).toBe(pageData.content_type);
    expect(page.content_value).toBe(pageData.content_value);
    expect(page.status).toBe(pageData.status);
    expect(page.tags).toEqual(pageData.tags);
    expect(page.content_metadata).toEqual(pageData.content_metadata);
    expect(page.version).toBe(pageData.version);
    expect(page.created_at).toBeDefined();
    expect(page.updated_at).toBeDefined();

    createdPageIds.push(page.id);
  });

  test('POST /api/agents/:agentId/pages - Test validation errors', async () => {
    // Test missing title
    let response = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: {
        content_type: 'text',
        content_value: 'Content without title'
      }
    });
    expect(response.status()).toBe(400);
    let data = await response.json();
    expect(data.error).toBe('Bad Request');
    expect(data.field).toBe('title');

    // Test invalid content_type
    response = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: {
        title: 'Test Page',
        content_type: 'invalid_type',
        content_value: 'Some content'
      }
    });
    expect(response.status()).toBe(400);
    data = await response.json();
    expect(data.field).toBe('content_type');

    // Test missing content_value
    response = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: {
        title: 'Test Page',
        content_type: 'text'
      }
    });
    expect(response.status()).toBe(400);
    data = await response.json();
    expect(data.field).toBe('content_value');

    // Test invalid status
    response = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: {
        title: 'Test Page',
        content_type: 'text',
        content_value: 'Some content',
        status: 'invalid_status'
      }
    });
    expect(response.status()).toBe(400);
    data = await response.json();
    expect(data.field).toBe('status');
  });

  test('PUT /api/agents/:agentId/pages/:pageId - Update existing page', async () => {
    // Create a page first
    const initialData = {
      title: 'Original Title',
      content_type: 'text',
      content_value: 'Original content',
      status: 'draft',
      tags: ['original']
    };

    const createResponse = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: initialData
    });
    const created = await createResponse.json() as ApiResponse<PageResponse>;
    const pageId = created.data.page.id;
    createdPageIds.push(pageId);

    // Update the page
    const updateData = {
      title: 'Updated Title',
      content_value: 'Updated content with more information',
      status: 'published',
      tags: ['updated', 'published'],
      version: 2
    };

    const response = await request.put(`/api/agents/${AGENT_ID}/pages/${pageId}`, {
      data: updateData
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json() as ApiResponse<PageResponse>;
    expect(data.success).toBe(true);
    expect(data.message).toBe('Page updated successfully');

    const page = data.data.page;
    expect(page.id).toBe(pageId);
    expect(page.title).toBe(updateData.title);
    expect(page.content_value).toBe(updateData.content_value);
    expect(page.status).toBe(updateData.status);
    expect(page.tags).toEqual(updateData.tags);
    expect(page.version).toBe(updateData.version);
    expect(page.content_type).toBe(initialData.content_type); // Unchanged field
  });

  test('PUT /api/agents/:agentId/pages/:pageId - Test update validation', async () => {
    // Create a page first
    const createResponse = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: {
        title: 'Test Page',
        content_type: 'text',
        content_value: 'Test content'
      }
    });
    const created = await createResponse.json() as ApiResponse<PageResponse>;
    const pageId = created.data.page.id;
    createdPageIds.push(pageId);

    // Test invalid title update
    let response = await request.put(`/api/agents/${AGENT_ID}/pages/${pageId}`, {
      data: { title: '' }
    });
    expect(response.status()).toBe(400);
    let data = await response.json();
    expect(data.field).toBe('title');

    // Test invalid status update
    response = await request.put(`/api/agents/${AGENT_ID}/pages/${pageId}`, {
      data: { status: 'invalid_status' }
    });
    expect(response.status()).toBe(400);
    data = await response.json();
    expect(data.field).toBe('status');

    // Test invalid tags update
    response = await request.put(`/api/agents/${AGENT_ID}/pages/${pageId}`, {
      data: { tags: 'not_an_array' }
    });
    expect(response.status()).toBe(400);
    data = await response.json();
    expect(data.field).toBe('tags');

    // Test empty update
    response = await request.put(`/api/agents/${AGENT_ID}/pages/${pageId}`, {
      data: {}
    });
    expect(response.status()).toBe(400);
    data = await response.json();
    expect(data.message).toContain('No valid fields provided');
  });

  test('DELETE /api/agents/:agentId/pages/:pageId - Delete page', async () => {
    // Create a page first
    const createResponse = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: {
        title: 'Page to Delete',
        content_type: 'text',
        content_value: 'This page will be deleted'
      }
    });
    const created = await createResponse.json() as ApiResponse<PageResponse>;
    const pageId = created.data.page.id;

    // Delete the page
    const response = await request.delete(`/api/agents/${AGENT_ID}/pages/${pageId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Page deleted successfully');
    expect(data.data.deletedPageId).toBe(pageId);

    // Verify page is deleted by trying to get it
    const getResponse = await request.get(`/api/agents/${AGENT_ID}/pages/${pageId}`);
    expect(getResponse.status()).toBe(404);
    const getData = await getResponse.json();
    expect(getData.code).toBe('PAGE_NOT_FOUND');

    // Don't add to cleanup list since it's already deleted
  });

  test('Error handling for non-existent agent', async () => {
    const nonExistentAgentId = 'non-existent-agent-123';

    // Test GET pages for non-existent agent
    const getResponse = await request.get(`/api/agents/${nonExistentAgentId}/pages`);
    expect(getResponse.status()).toBe(404);
    const getData = await getResponse.json();
    expect(getData.code).toBe('AGENT_NOT_FOUND');
    expect(getData.agentId).toBe(nonExistentAgentId);

    // Test POST page for non-existent agent
    const postResponse = await request.post(`/api/agents/${nonExistentAgentId}/pages`, {
      data: {
        title: 'Test Page',
        content_type: 'text',
        content_value: 'Test content'
      }
    });
    expect(postResponse.status()).toBe(404);
    const postData = await postResponse.json();
    expect(postData.code).toBe('AGENT_NOT_FOUND');
  });

  test('Error handling for non-existent page', async () => {
    const nonExistentPageId = 'non-existent-page-123';

    // Test GET non-existent page
    const getResponse = await request.get(`/api/agents/${AGENT_ID}/pages/${nonExistentPageId}`);
    expect(getResponse.status()).toBe(404);
    const getData = await getResponse.json();
    expect(getData.code).toBe('PAGE_NOT_FOUND');
    expect(getData.pageId).toBe(nonExistentPageId);

    // Test PUT non-existent page
    const putResponse = await request.put(`/api/agents/${AGENT_ID}/pages/${nonExistentPageId}`, {
      data: { title: 'Updated Title' }
    });
    expect(putResponse.status()).toBe(404);
    const putData = await putResponse.json();
    expect(putData.code).toBe('PAGE_NOT_FOUND');

    // Test DELETE non-existent page
    const deleteResponse = await request.delete(`/api/agents/${AGENT_ID}/pages/${nonExistentPageId}`);
    expect(deleteResponse.status()).toBe(404);
    const deleteData = await deleteResponse.json();
    expect(deleteData.code).toBe('PAGE_NOT_FOUND');
  });

  test('Rate limiting and security', async () => {
    // Test rate limiting by making many requests quickly
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(request.get(`/api/agents/${AGENT_ID}/pages`));
    }

    const responses = await Promise.all(requests);

    // All requests should succeed within normal rate limits
    responses.forEach(response => {
      expect([200, 429]).toContain(response.status());
    });

    // If rate limited, should get proper error message
    const rateLimitedResponse = responses.find(r => r.status() === 429);
    if (rateLimitedResponse) {
      const data = await rateLimitedResponse.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.retryAfter).toBeDefined();
    }
  });

  test('Data integrity and consistency', async () => {
    // Create a page and verify all timestamps and IDs are consistent
    const createResponse = await request.post(`/api/agents/${AGENT_ID}/pages`, {
      data: {
        title: 'Data Integrity Test',
        content_type: 'text',
        content_value: 'Testing data integrity'
      }
    });
    const created = await createResponse.json() as ApiResponse<PageResponse>;
    const pageId = created.data.page.id;
    createdPageIds.push(pageId);

    // Get the page immediately
    const getResponse = await request.get(`/api/agents/${AGENT_ID}/pages/${pageId}`);
    const retrieved = await getResponse.json() as ApiResponse<PageResponse>;

    // Verify data consistency
    expect(retrieved.data.page.id).toBe(created.data.page.id);
    expect(retrieved.data.page.agent_id).toBe(created.data.page.agent_id);
    expect(retrieved.data.page.title).toBe(created.data.page.title);
    expect(retrieved.data.page.created_at).toBe(created.data.page.created_at);
    expect(retrieved.data.page.updated_at).toBe(created.data.page.updated_at);

    // Update and verify consistency
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure different timestamp
    const updateResponse = await request.put(`/api/agents/${AGENT_ID}/pages/${pageId}`, {
      data: { title: 'Updated Title' }
    });
    const updated = await updateResponse.json() as ApiResponse<PageResponse>;

    expect(updated.data.page.id).toBe(pageId);
    expect(updated.data.page.created_at).toBe(created.data.page.created_at);
    expect(updated.data.page.updated_at).not.toBe(created.data.page.updated_at);
    expect(new Date(updated.data.page.updated_at).getTime()).toBeGreaterThan(
      new Date(created.data.page.created_at).getTime()
    );
  });
});