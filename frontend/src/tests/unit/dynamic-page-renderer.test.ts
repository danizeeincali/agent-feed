import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const TEST_AGENT_ID = 'personal-todos-agent';
const TEST_PAGE_ID = 'personal-todos-dashboard-v3';

describe('DynamicPageRenderer - New API Structure', () => {
  describe('API Response Structure', () => {
    it('should return page with layout array', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.page).toBeDefined();
      expect(Array.isArray(data.page.layout)).toBe(true);
    });

    it('should have camelCase properties', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.page.agentId).toBeDefined();
      expect(data.page.createdAt).toBeDefined();
      expect(data.page.updatedAt).toBeDefined();

      // Should NOT have snake_case
      expect(data.page.agent_id).toBeUndefined();
      expect(data.page.created_at).toBeUndefined();
      expect(data.page.updated_at).toBeUndefined();
    });

    it('should have metadata with tags nested', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.page.metadata).toBeDefined();
      expect(data.page.metadata.tags).toBeDefined();
      expect(Array.isArray(data.page.metadata.tags)).toBe(true);

      // Should NOT have tags at top level
      expect(data.page.tags).toBeUndefined();
    });

    it('should have components array', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.page.components).toBeDefined();
      expect(Array.isArray(data.page.components)).toBe(true);
    });

    it('should NOT have old content_type/content_value fields', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.page.content_type).toBeUndefined();
      expect(data.page.content_value).toBeUndefined();
      expect(data.page.page_type).toBeUndefined();
    });
  });

  describe('Data Validation', () => {
    it('should have valid ISO date strings', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      const createdAt = new Date(data.page.createdAt);
      const updatedAt = new Date(data.page.updatedAt);

      expect(createdAt.toString()).not.toBe('Invalid Date');
      expect(updatedAt.toString()).not.toBe('Invalid Date');
    });

    it('should have valid layout structure', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.page.layout.length).toBeGreaterThan(0);

      const firstComponent = data.page.layout[0];
      expect(firstComponent.id).toBeDefined();
      expect(firstComponent.type).toBeDefined();
    });

    it('should have valid component structure in layout', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      data.page.layout.forEach((component: any) => {
        expect(component).toHaveProperty('id');
        expect(component).toHaveProperty('type');
        expect(typeof component.id).toBe('string');
        expect(typeof component.type).toBe('string');
      });
    });
  });

  describe('Metadata Tags Access', () => {
    it('should access tags via metadata.tags path', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.page.metadata?.tags).toBeDefined();
      expect(Array.isArray(data.page.metadata.tags)).toBe(true);
    });

    it('should handle null metadata gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      // Test null safety pattern
      const tags = data.page.metadata?.tags || [];
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should have valid tag structure', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      if (data.page.metadata?.tags && data.page.metadata.tags.length > 0) {
        data.page.metadata.tags.forEach((tag: string) => {
          expect(typeof tag).toBe('string');
          expect(tag.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Date Formatting', () => {
    it('should format createdAt date correctly', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      const createdAt = new Date(data.page.createdAt);
      const formatted = createdAt.toLocaleDateString();

      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should format updatedAt date correctly', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      const updatedAt = new Date(data.page.updatedAt);
      const formatted = updatedAt.toLocaleDateString();

      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should have updatedAt >= createdAt', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      const createdAt = new Date(data.page.createdAt);
      const updatedAt = new Date(data.page.updatedAt);

      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    });

    it('should parse ISO 8601 format dates', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      // ISO 8601 format check
      expect(data.page.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.page.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Components Array Display', () => {
    it('should have non-empty components array', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.page.components).toBeDefined();
      expect(Array.isArray(data.page.components)).toBe(true);
      expect(data.page.components.length).toBeGreaterThan(0);
    });

    it('should have valid component definitions', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      // Components array contains strings (component type names like "header", "todoList")
      data.page.components.forEach((component: any) => {
        expect(typeof component).toBe('string');
        expect(component.length).toBeGreaterThan(0);
      });
    });

    it('should have matching component IDs between layout and components', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      const layoutTypes = data.page.layout.map((item: any) => item.type);
      const componentTypes = data.page.components; // Already strings like ["header", "todoList"]

      layoutTypes.forEach((type: string) => {
        expect(componentTypes).toContain(type);
      });
    });

    it('should have component props when defined', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      data.page.components.forEach((component: any) => {
        if (component.props) {
          expect(typeof component.props).toBe('object');
        }
      });
    });
  });

  describe('Missing Data Graceful Handling', () => {
    it('should handle missing metadata gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      // Test accessing potentially missing nested properties
      const metadata = data.page.metadata || {};
      const tags = metadata.tags || [];

      expect(Array.isArray(tags)).toBe(true);
    });

    it('should handle empty layout array', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      const layout = data.page.layout || [];
      expect(Array.isArray(layout)).toBe(true);
    });

    it('should handle empty components array', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      const components = data.page.components || [];
      expect(Array.isArray(components)).toBe(true);
    });

    it('should handle missing component props', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      data.page.components.forEach((component: any) => {
        const props = component.props || {};
        expect(typeof props).toBe('object');
      });
    });

    it('should provide default values for missing fields', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      // Test default value pattern
      const title = data.page.title || 'Untitled Page';
      const description = data.page.description || '';

      expect(typeof title).toBe('string');
      expect(typeof description).toBe('string');
    });
  });

  describe('Error States', () => {
    it('should handle 404 for non-existent page', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/non-existent-page`);

      expect(response.status).toBe(404);
    });

    it('should handle 404 for non-existent agent', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/non-existent-agent/pages/${TEST_PAGE_ID}`);

      expect(response.status).toBe(404);
    });

    it('should return error response with success:false', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/non-existent-agent/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed agent ID', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/invalid@agent/pages/${TEST_PAGE_ID}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should handle network timeout gracefully', async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100);

      try {
        await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`, {
          signal: controller.signal
        });
      } catch (error: any) {
        expect(error.name).toBe('AbortError');
      } finally {
        clearTimeout(timeoutId);
      }
    }, 10000);

    it('should validate response structure on success', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      if (data.success) {
        expect(data.page).toBeDefined();
        expect(data.page.id).toBeDefined();
        expect(data.page.agentId).toBeDefined();
        expect(data.page.layout).toBeDefined();
        expect(data.page.components).toBeDefined();
      }
    });
  });

  describe('Complete Page Structure Validation', () => {
    it('should have all required top-level fields', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      const requiredFields = ['id', 'agentId', 'title', 'layout', 'components', 'createdAt', 'updatedAt'];

      requiredFields.forEach(field => {
        expect(data.page).toHaveProperty(field);
      });
    });

    it('should have correct data types for all fields', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(typeof data.page.id).toBe('string');
      expect(typeof data.page.agentId).toBe('string');
      expect(typeof data.page.title).toBe('string');
      expect(Array.isArray(data.page.layout)).toBe(true);
      expect(Array.isArray(data.page.components)).toBe(true);
      expect(typeof data.page.createdAt).toBe('string');
      expect(typeof data.page.updatedAt).toBe('string');
    });

    it('should match expected page ID and agent ID', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data = await response.json();

      expect(data.page.id).toBe(TEST_PAGE_ID);
      expect(data.page.agentId).toBe(TEST_AGENT_ID);
    });

    it('should have consistent structure across multiple requests', async () => {
      const response1 = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data1 = await response1.json();

      const response2 = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`);
      const data2 = await response2.json();

      expect(Object.keys(data1.page).sort()).toEqual(Object.keys(data2.page).sort());
    });
  });
});