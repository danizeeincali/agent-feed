/**
 * Comprehensive Mock Services for Agent Workspace API
 * Implements realistic behaviors for testing all scenarios
 */

import { jest } from '@jest/globals';
import { 
  WorkspaceInfo, 
  AgentPage, 
  CreatePageData, 
  UpdatePageData,
  PageListResponse,
  PageListFilters
} from '../../src/services/api/workspaceApi';
import { TestDataFactory } from '../utils/test-factories';

export class MockWorkspaceApi {
  private static instance: MockWorkspaceApi;
  private mockData: Map<string, any> = new Map();
  private networkDelay: number = 100;
  private shouldFailRequests: boolean = false;
  private failureRate: number = 0;

  static getInstance(): MockWorkspaceApi {
    if (!MockWorkspaceApi.instance) {
      MockWorkspaceApi.instance = new MockWorkspaceApi();
    }
    return MockWorkspaceApi.instance;
  }

  /**
   * Configuration methods for test scenarios
   */
  reset(): void {
    this.mockData.clear();
    this.networkDelay = 100;
    this.shouldFailRequests = false;
    this.failureRate = 0;
  }

  setNetworkDelay(delay: number): void {
    this.networkDelay = delay;
  }

  enableNetworkFailures(failureRate: number = 0.1): void {
    this.failureRate = failureRate;
  }

  forceFailure(shouldFail: boolean = true): void {
    this.shouldFailRequests = shouldFail;
  }

  /**
   * Setup methods for different test scenarios
   */
  setupEmptyWorkspace(agentId: string): void {
    this.mockData.set(`workspace:${agentId}`, {
      ...TestDataFactory.createMockWorkspaceInfo({ agent_id: agentId }),
      pages: []
    });
  }

  setupWorkspaceWithPages(agentId: string, pageCount: number = 5): void {
    const pages = TestDataFactory.createMockPageList(pageCount).map(page => ({
      ...page,
      agent_id: agentId
    }));
    
    this.mockData.set(`workspace:${agentId}`, {
      ...TestDataFactory.createMockWorkspaceInfo({ agent_id: agentId }),
      pages
    });
  }

  setupWorkspaceNotFound(agentId: string): void {
    this.mockData.set(`workspace:${agentId}`, null);
  }

  addPage(agentId: string, page: AgentPage): void {
    const workspace = this.mockData.get(`workspace:${agentId}`);
    if (workspace) {
      workspace.pages = workspace.pages || [];
      workspace.pages.push(page);
      workspace.statistics.total_pages = workspace.pages.length;
    }
  }

  /**
   * Mock API method implementations
   */
  private async simulateNetworkCall<T>(operation: () => T): Promise<T> {
    // Simulate network delay
    if (this.networkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.networkDelay));
    }

    // Simulate random failures
    if (this.shouldFailRequests || (this.failureRate > 0 && Math.random() < this.failureRate)) {
      throw TestDataFactory.createMockError('Network request failed', 500);
    }

    return operation();
  }

  async initializeWorkspace(agentId: string): Promise<WorkspaceInfo> {
    return this.simulateNetworkCall(() => {
      if (!this.mockData.has(`workspace:${agentId}`)) {
        const newWorkspace = TestDataFactory.createMockWorkspaceInfo({
          agent_id: agentId,
          pages: []
        });
        this.mockData.set(`workspace:${agentId}`, newWorkspace);
        return newWorkspace;
      }
      
      const workspace = this.mockData.get(`workspace:${agentId}`);
      if (!workspace) {
        throw TestDataFactory.createMockError('Failed to initialize workspace', 500);
      }
      
      return workspace;
    });
  }

  async getWorkspaceInfo(agentId: string): Promise<WorkspaceInfo> {
    return this.simulateNetworkCall(() => {
      const workspace = this.mockData.get(`workspace:${agentId}`);
      if (!workspace) {
        throw TestDataFactory.createMockError('Workspace not found', 404);
      }
      return workspace;
    });
  }

  async listPages(agentId: string, filters?: PageListFilters): Promise<PageListResponse> {
    return this.simulateNetworkCall(() => {
      const workspace = this.mockData.get(`workspace:${agentId}`);
      if (!workspace) {
        throw TestDataFactory.createMockError('Workspace not found', 404);
      }

      let pages = workspace.pages || [];
      
      // Apply filters
      if (filters) {
        if (filters.page_type) {
          pages = pages.filter((p: AgentPage) => p.page_type === filters.page_type);
        }
        if (filters.status) {
          pages = pages.filter((p: AgentPage) => p.status === filters.status);
        }
        if (filters.content_type) {
          pages = pages.filter((p: AgentPage) => p.content_type === filters.content_type);
        }
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          pages = pages.filter((p: AgentPage) => 
            p.title.toLowerCase().includes(searchTerm) ||
            p.content_value.toLowerCase().includes(searchTerm)
          );
        }
      }

      const total = pages.length;
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;
      
      pages = pages.slice(offset, offset + limit);

      return {
        success: true,
        agent_id: agentId,
        pages,
        total,
        limit,
        offset,
        has_more: (offset + limit) < total
      };
    });
  }

  async createPage(agentId: string, pageData: CreatePageData): Promise<AgentPage> {
    return this.simulateNetworkCall(() => {
      const workspace = this.mockData.get(`workspace:${agentId}`);
      if (!workspace) {
        throw TestDataFactory.createMockError('Workspace not found', 404);
      }

      // Validate required fields
      if (!pageData.title || !pageData.content_value) {
        throw TestDataFactory.createMockError('Missing required fields', 400);
      }

      const newPage: AgentPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        agent_id: agentId,
        title: pageData.title,
        content_type: pageData.content_type,
        content_value: pageData.content_value,
        page_type: pageData.page_type || 'dynamic',
        status: pageData.status || 'draft',
        metadata: pageData.metadata || {},
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      workspace.pages = workspace.pages || [];
      workspace.pages.push(newPage);
      workspace.statistics.total_pages = workspace.pages.length;

      return newPage;
    });
  }

  async getPage(agentId: string, pageId: string): Promise<AgentPage> {
    return this.simulateNetworkCall(() => {
      const workspace = this.mockData.get(`workspace:${agentId}`);
      if (!workspace) {
        throw TestDataFactory.createMockError('Workspace not found', 404);
      }

      const page = workspace.pages?.find((p: AgentPage) => p.id === pageId);
      if (!page) {
        throw TestDataFactory.createMockError('Page not found', 404);
      }

      return page;
    });
  }

  async updatePage(agentId: string, pageId: string, updateData: UpdatePageData): Promise<AgentPage> {
    return this.simulateNetworkCall(() => {
      const workspace = this.mockData.get(`workspace:${agentId}`);
      if (!workspace) {
        throw TestDataFactory.createMockError('Workspace not found', 404);
      }

      const pageIndex = workspace.pages?.findIndex((p: AgentPage) => p.id === pageId);
      if (pageIndex === -1 || pageIndex === undefined) {
        throw TestDataFactory.createMockError('Page not found', 404);
      }

      const existingPage = workspace.pages[pageIndex];
      const updatedPage: AgentPage = {
        ...existingPage,
        ...updateData,
        version: existingPage.version + 1,
        updated_at: new Date().toISOString()
      };

      workspace.pages[pageIndex] = updatedPage;
      return updatedPage;
    });
  }

  async deletePage(agentId: string, pageId: string): Promise<void> {
    return this.simulateNetworkCall(() => {
      const workspace = this.mockData.get(`workspace:${agentId}`);
      if (!workspace) {
        throw TestDataFactory.createMockError('Workspace not found', 404);
      }

      const pageIndex = workspace.pages?.findIndex((p: AgentPage) => p.id === pageId);
      if (pageIndex === -1 || pageIndex === undefined) {
        throw TestDataFactory.createMockError('Page not found', 404);
      }

      workspace.pages.splice(pageIndex, 1);
      workspace.statistics.total_pages = workspace.pages.length;
    });
  }

  async checkHealth(): Promise<any> {
    return this.simulateNetworkCall(() => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: Math.floor(Math.random() * 86400) // Random uptime in seconds
      };
    });
  }

  /**
   * Jest mock setup helpers
   */
  static createJestMock(): any {
    const mockApi = MockWorkspaceApi.getInstance();
    
    return {
      initializeWorkspace: jest.fn().mockImplementation(mockApi.initializeWorkspace.bind(mockApi)),
      getWorkspaceInfo: jest.fn().mockImplementation(mockApi.getWorkspaceInfo.bind(mockApi)),
      listPages: jest.fn().mockImplementation(mockApi.listPages.bind(mockApi)),
      createPage: jest.fn().mockImplementation(mockApi.createPage.bind(mockApi)),
      getPage: jest.fn().mockImplementation(mockApi.getPage.bind(mockApi)),
      updatePage: jest.fn().mockImplementation(mockApi.updatePage.bind(mockApi)),
      deletePage: jest.fn().mockImplementation(mockApi.deletePage.bind(mockApi)),
      checkHealth: jest.fn().mockImplementation(mockApi.checkHealth.bind(mockApi))
    };
  }
}

/**
 * Mock service for testing real-time updates and websocket connections
 */
export class MockRealtimeService {
  private subscribers: Map<string, Function[]> = new Map();

  subscribe(event: string, callback: Function): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit(event: string, data: any): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  simulatePageUpdate(agentId: string, page: AgentPage): void {
    this.emit(`page:updated:${agentId}`, page);
  }

  simulatePageCreated(agentId: string, page: AgentPage): void {
    this.emit(`page:created:${agentId}`, page);
  }

  simulatePageDeleted(agentId: string, pageId: string): void {
    this.emit(`page:deleted:${agentId}`, { pageId });
  }

  simulateWorkspaceError(agentId: string, error: Error): void {
    this.emit(`workspace:error:${agentId}`, error);
  }
}

// Export singleton instances for tests
export const mockWorkspaceApi = MockWorkspaceApi.getInstance();
export const mockRealtimeService = new MockRealtimeService();