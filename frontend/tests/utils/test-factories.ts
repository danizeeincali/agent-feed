/**
 * Test Data Factories for Agent Dynamic Pages
 * Following TDD London School approach with comprehensive mock data
 */

import { AgentPage, CreatePageData, WorkspaceInfo } from '../../src/services/api/workspaceApi';
import { AgentWorkspace, WorkspaceUsage } from '../../src/types/workspace.types';
import { PageDefinition, ComponentDefinition } from '../../src/types/page.types';

export class TestDataFactory {
  static createMockAgent(overrides: Partial<any> = {}): any {
    return {
      id: 'test-agent-1',
      name: 'test-agent',
      display_name: 'Test Agent',
      description: 'Test agent for dynamic pages',
      ...overrides
    };
  }

  static createMockAgentPage(overrides: Partial<AgentPage> = {}): AgentPage {
    const baseId = Math.random().toString(36).substring(7);
    return {
      id: `page-${baseId}`,
      agent_id: 'test-agent-1',
      title: `Test Page ${baseId}`,
      content_type: 'markdown',
      content_value: '# Test Content\n\nThis is a test page.',
      page_type: 'dynamic',
      status: 'published',
      metadata: {
        author: 'test-user',
        tags: ['test', 'dynamic'],
        created_by: 'agent-system'
      },
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createMockPageList(count: number = 5): AgentPage[] {
    return Array.from({ length: count }, (_, i) => 
      this.createMockAgentPage({
        id: `page-${i + 1}`,
        title: `Test Page ${i + 1}`,
        page_type: i % 3 === 0 ? 'persistent' : i % 3 === 1 ? 'dynamic' : 'template',
        status: i % 2 === 0 ? 'published' : 'draft'
      })
    );
  }

  static createMockWorkspaceInfo(overrides: Partial<WorkspaceInfo> = {}): WorkspaceInfo {
    const pages = this.createMockPageList(3);
    return {
      id: 'workspace-1',
      agent_id: 'test-agent-1',
      workspace_path: '/prod/agent_workspace/test-agent-1',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updated_at: new Date().toISOString(),
      pages,
      statistics: {
        total_pages: pages.length,
        pages_by_type: {
          dynamic: pages.filter(p => p.page_type === 'dynamic').length,
          persistent: pages.filter(p => p.page_type === 'persistent').length,
          template: pages.filter(p => p.page_type === 'template').length
        },
        pages_by_status: {
          published: pages.filter(p => p.status === 'published').length,
          draft: pages.filter(p => p.status === 'draft').length,
          archived: pages.filter(p => p.status === 'archived').length
        },
        last_activity: new Date().toISOString()
      },
      ...overrides
    };
  }

  static createMockWorkspaceUsage(overrides: Partial<WorkspaceUsage> = {}): WorkspaceUsage {
    return {
      storage: 1024 * 1024 * 50, // 50MB
      pages: 15,
      components: 8,
      quotas: {
        storage: 1024 * 1024 * 100, // 100MB
        pages: 50,
        components: 25
      },
      ...overrides
    };
  }

  static createMockCreatePageData(overrides: Partial<CreatePageData> = {}): CreatePageData {
    return {
      title: 'New Test Page',
      content_type: 'markdown',
      content_value: '# New Page\n\nThis is a new test page.',
      page_type: 'dynamic',
      status: 'draft',
      metadata: {
        author: 'test-user',
        tags: ['new', 'test']
      },
      ...overrides
    };
  }

  static createMockPageDefinition(overrides: Partial<PageDefinition> = {}): PageDefinition {
    return {
      id: 'page-def-1',
      agentName: 'test-agent',
      title: 'Test Page Definition',
      description: 'A test page with dynamic components',
      slug: 'test-page',
      layout: {
        type: 'grid',
        columns: 12,
        rows: 6,
        gap: '1rem',
        padding: '2rem',
        maxWidth: '1200px'
      },
      components: [
        this.createMockComponentDefinition(),
        this.createMockComponentDefinition({ 
          id: 'comp-2', 
          type: 'text',
          props: { content: 'Test text component' }
        })
      ],
      styles: {
        theme: 'default',
        customCSS: '.test { color: blue; }',
        variables: { primaryColor: '#007acc' }
      },
      metadata: {
        tags: ['test', 'dynamic'],
        category: 'testing',
        isPublic: false,
        editHistory: [{
          timestamp: new Date(),
          agentName: 'test-agent',
          operation: 'create',
          summary: 'Initial creation',
          changes: { created: true }
        }]
      },
      version: 1,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
      ...overrides
    };
  }

  static createMockComponentDefinition(overrides: Partial<ComponentDefinition> = {}): ComponentDefinition {
    return {
      id: 'comp-1',
      type: 'button',
      source: 'library',
      props: {
        label: 'Test Button',
        variant: 'primary',
        onClick: 'handleClick'
      },
      position: {
        x: 0,
        y: 0,
        width: 200,
        height: 40,
        gridColumn: '1 / 4',
        gridRow: '1 / 2'
      },
      styles: {
        className: 'test-button',
        theme: 'default'
      },
      events: {
        onClick: 'function() { console.log("clicked"); }'
      },
      validation: {
        required: false
      },
      ...overrides
    };
  }

  static createMockError(message: string = 'Test error', status: number = 500): Error {
    const error = new Error(message) as any;
    error.status = status;
    error.response = {
      status,
      statusText: status === 404 ? 'Not Found' : status === 500 ? 'Internal Server Error' : 'Error',
      data: { error: message }
    };
    return error;
  }

  /**
   * Create mock data for different test scenarios
   */
  static scenarios = {
    emptyWorkspace: () => ({
      agent: this.createMockAgent(),
      workspace: this.createMockWorkspaceInfo({ pages: [] }),
      usage: this.createMockWorkspaceUsage({ pages: 0, storage: 0 })
    }),

    fullWorkspace: () => ({
      agent: this.createMockAgent(),
      workspace: this.createMockWorkspaceInfo({ pages: this.createMockPageList(20) }),
      usage: this.createMockWorkspaceUsage({
        storage: 1024 * 1024 * 95, // Near quota limit
        pages: 48,
        components: 23
      })
    }),

    quotaExceededWorkspace: () => ({
      agent: this.createMockAgent(),
      workspace: this.createMockWorkspaceInfo({ pages: this.createMockPageList(50) }),
      usage: this.createMockWorkspaceUsage({
        storage: 1024 * 1024 * 105, // Over quota
        pages: 55, // Over quota
        components: 30 // Over quota
      })
    }),

    newAgentWorkspace: () => ({
      agent: this.createMockAgent({ id: 'new-agent', name: 'new-agent' }),
      workspace: null,
      usage: null
    }),

    mixedStatusPages: () => {
      const pages = [
        this.createMockAgentPage({ status: 'published', title: 'Published Page 1' }),
        this.createMockAgentPage({ status: 'draft', title: 'Draft Page 1' }),
        this.createMockAgentPage({ status: 'archived', title: 'Archived Page 1' }),
        this.createMockAgentPage({ status: 'published', title: 'Published Page 2' }),
        this.createMockAgentPage({ status: 'draft', title: 'Draft Page 2' })
      ];
      
      return {
        agent: this.createMockAgent(),
        workspace: this.createMockWorkspaceInfo({ pages }),
        usage: this.createMockWorkspaceUsage({ pages: pages.length })
      };
    },

    complexPageTypes: () => {
      const pages = [
        this.createMockAgentPage({ 
          page_type: 'dynamic', 
          content_type: 'json',
          content_value: JSON.stringify({ 
            type: 'dashboard',
            widgets: ['chart', 'table', 'metrics']
          }),
          title: 'Dynamic Dashboard'
        }),
        this.createMockAgentPage({ 
          page_type: 'persistent',
          content_type: 'markdown',
          content_value: '# Persistent Documentation\n\nThis page persists across sessions.',
          title: 'API Documentation'
        }),
        this.createMockAgentPage({ 
          page_type: 'template',
          content_type: 'component',
          content_value: JSON.stringify({
            templateName: 'StandardReport',
            slots: ['header', 'content', 'footer']
          }),
          title: 'Report Template'
        })
      ];

      return {
        agent: this.createMockAgent(),
        workspace: this.createMockWorkspaceInfo({ pages }),
        usage: this.createMockWorkspaceUsage({ pages: pages.length })
      };
    }
  };
}

/**
 * Test utilities for common test operations
 */
export class TestUtils {
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static mockFetch(responses: Record<string, any>) {
    const originalFetch = global.fetch;
    
    global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
      const method = options?.method || 'GET';
      const key = `${method} ${url}`;
      
      if (responses[key]) {
        const response = responses[key];
        return Promise.resolve({
          ok: response.status < 400,
          status: response.status || 200,
          statusText: response.statusText || 'OK',
          json: () => Promise.resolve(response.data),
          text: () => Promise.resolve(JSON.stringify(response.data))
        });
      }
      
      return Promise.reject(new Error(`No mock response configured for ${key}`));
    });

    return () => {
      global.fetch = originalFetch;
    };
  }

  static createMockLocalStorage() {
    const store: Record<string, string> = {};
    
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      })
    };
  }

  static mockConsole() {
    const originalConsole = { ...console };
    
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
    console.info = jest.fn();

    return () => {
      Object.assign(console, originalConsole);
    };
  }

  /**
   * Generate realistic test timing for async operations
   */
  static generateRealisticDelay(): number {
    // Random delay between 100ms and 2s to simulate real network conditions
    return Math.floor(Math.random() * 1900) + 100;
  }
}