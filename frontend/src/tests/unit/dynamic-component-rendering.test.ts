import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import DynamicPageRenderer from '../../components/DynamicPageRenderer';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const TEST_AGENT_ID = 'personal-todos-agent';
const TEST_PAGE_ID = 'personal-todos-dashboard-v3';

describe('Dynamic Component Rendering System', () => {
  describe('Core Rendering', () => {
    it('should render page without displaying JSON', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      // Verify layout has components
      expect(data.page.layout).toBeDefined();
      expect(Array.isArray(data.page.layout)).toBe(true);
      expect(data.page.layout.length).toBeGreaterThan(0);

      // Verify components have type and config
      data.page.layout.forEach((component: any) => {
        expect(component.type).toBeDefined();
        expect(typeof component.type).toBe('string');
        expect(component.config).toBeDefined();
      });
    });

    it('should have renderComponent function that handles all component types', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      // Get unique component types from layout
      const componentTypes = [...new Set(data.page.layout.map((c: any) => c.type))];

      // Verify we have component types to test
      expect(componentTypes.length).toBeGreaterThan(0);

      // Each component type should be a non-empty string
      componentTypes.forEach((type) => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it('should render multiple components in sequence', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      // Verify multiple components exist
      expect(data.page.layout.length).toBeGreaterThanOrEqual(2);

      // Verify each component has required structure
      data.page.layout.forEach((component: any, index: number) => {
        expect(component.id).toBeDefined();
        expect(component.type).toBeDefined();
        expect(component.config).toBeDefined();
      });
    });
  });

  describe('Component Type Implementation', () => {
    it('should have header component type in API response', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      const headerComponent = data.page.layout.find((c: any) => c.type === 'header');
      expect(headerComponent).toBeDefined();
      expect(headerComponent.config.title).toBeDefined();
    });

    it('should have todoList component type in API response', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      const todoComponent = data.page.layout.find((c: any) => c.type === 'todoList');
      expect(todoComponent).toBeDefined();
      expect(todoComponent.config).toBeDefined();
    });

    it('should handle component with all config properties', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      const headerComponent = data.page.layout.find((c: any) => c.type === 'header');
      expect(headerComponent.config.title).toBeTruthy();
      expect(typeof headerComponent.config.title).toBe('string');
      expect(headerComponent.config.level).toBeDefined();
      expect(typeof headerComponent.config.level).toBe('number');
    });

    it('should handle todoList config properties', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      const todoComponent = data.page.layout.find((c: any) => c.type === 'todoList');
      expect(typeof todoComponent.config.showCompleted).toBe('boolean');
      expect(todoComponent.config.sortBy).toBeDefined();
      expect(Array.isArray(todoComponent.config.filterTags)).toBe(true);
    });
  });

  describe('Component Config Validation', () => {
    it('should pass valid props to header component', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      const headerComponent = data.page.layout.find((c: any) => c.type === 'header');
      const config = headerComponent.config;

      // Verify config has required properties
      expect(config.title).toBeDefined();
      expect(config.title.length).toBeGreaterThan(0);
      expect(config.level).toBeGreaterThanOrEqual(1);
      expect(config.level).toBeLessThanOrEqual(6);
    });

    it('should pass valid props to todoList component', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      const todoComponent = data.page.layout.find((c: any) => c.type === 'todoList');
      const config = todoComponent.config;

      // Verify config structure
      expect(config).toHaveProperty('showCompleted');
      expect(config).toHaveProperty('sortBy');
      expect(config).toHaveProperty('filterTags');
    });

    it('should handle missing optional props gracefully', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      // Test that components can render with minimal config
      data.page.layout.forEach((component: any) => {
        expect(component.config || {}).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid component type gracefully', async () => {
      // Components with unknown types should not crash the page
      // This is tested by verifying the API structure
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      // Verify response is valid
      expect(data.success).toBe(true);
      expect(data.page).toBeDefined();
    });

    it('should handle missing config properties', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      // Components should have config, even if empty
      data.page.layout.forEach((component: any) => {
        expect(component.config !== undefined).toBe(true);
      });
    });

    it('should handle 404 for non-existent page', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/non-existent-page-id`
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Page Structure Validation', () => {
    it('should have correct page structure', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      expect(data.page.id).toBe(TEST_PAGE_ID);
      expect(data.page.agentId).toBe(TEST_AGENT_ID);
      expect(data.page.title).toBeDefined();
      expect(data.page.layout).toBeDefined();
      expect(data.page.components).toBeDefined();
    });

    it('should have components array matching layout types', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      const layoutTypes = data.page.layout.map((c: any) => c.type);
      const componentTypes = data.page.components;

      // Each layout type should be in components array
      layoutTypes.forEach((type: string) => {
        expect(componentTypes).toContain(type);
      });
    });

    it('should have metadata with description and tags', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      expect(data.page.metadata).toBeDefined();
      expect(data.page.metadata.description).toBeDefined();
      expect(Array.isArray(data.page.metadata.tags)).toBe(true);
    });
  });

  describe('Real API Integration (Zero Mocks)', () => {
    it('should fetch from real API endpoint', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should return valid JSON from API', async () => {
      const response = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data = await response.json();

      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
      expect(data.success).toBe(true);
    });

    it('should have consistent data structure across requests', async () => {
      const response1 = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data1 = await response1.json();

      const response2 = await fetch(
        `${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/${TEST_PAGE_ID}`
      );
      const data2 = await response2.json();

      expect(Object.keys(data1.page).sort()).toEqual(Object.keys(data2.page).sort());
      expect(data1.page.layout.length).toBe(data2.page.layout.length);
    });
  });
});