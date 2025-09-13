/**
 * AgentDataService - Handles persistent user data separate from UI specifications
 * Ensures user data is preserved when agents update their page structures
 */

export interface UserData {
  pageId: string;
  userId: string;
  data: Record<string, any>;
  version: number;
  created: Date;
  updated: Date;
}

export interface PageSpec {
  id: string;
  agentId: string;
  title: string;
  version: number;
  specification: any;
  created: Date;
  updated: Date;
}

export interface DataMigration {
  fromVersion: number;
  toVersion: number;
  migrationScript: (oldData: any) => any;
}

class AgentDataService {
  private baseUrl: string;

  constructor() {
    // Use existing API base URL pattern
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('.app.github.dev')) {
        const codespaceName = hostname.split('-5173.app.github.dev')[0];
        this.baseUrl = `https://${codespaceName}-3000.app.github.dev/api`;
      } else {
        this.baseUrl = 'http://localhost:3000/api';
      }
    } else {
      this.baseUrl = 'http://localhost:3000/api';
    }
  }

  /**
   * Get user data for a specific agent page
   */
  async getUserData(agentId: string, pageId: string, userId: string = 'default'): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages/${pageId}/data?userId=${userId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No data exists yet, return empty object
          return {};
        }
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const result = await response.json();
      return result.data || {};
    } catch (error) {
      console.error('Error fetching user data:', error);
      return {}; // Return empty data on error to prevent UI crashes
    }
  }

  /**
   * Save user data for a specific agent page
   */
  async saveUserData(
    agentId: string, 
    pageId: string, 
    data: Record<string, any>, 
    userId: string = 'default'
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages/${pageId}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          data
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save user data: ${response.status}`);
      }

      console.log('✅ User data saved successfully', { agentId, pageId, dataKeys: Object.keys(data) });
      return true;
    } catch (error) {
      console.error('❌ Error saving user data:', error);
      return false;
    }
  }

  /**
   * Update a specific data key for a user
   */
  async updateUserDataKey(
    agentId: string, 
    pageId: string, 
    key: string, 
    value: any, 
    userId: string = 'default'
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages/${pageId}/data/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          value
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update user data key: ${response.status}`);
      }

      console.log('✅ User data key updated successfully', { agentId, pageId, key });
      return true;
    } catch (error) {
      console.error('❌ Error updating user data key:', error);
      return false;
    }
  }

  /**
   * Get page specification
   */
  async getPageSpec(agentId: string, pageId: string): Promise<PageSpec | null> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages/${pageId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch page spec: ${response.status}`);
      }

      const result = await response.json();
      // Handle nested response structure from workspace API
      const pageData = result.page || result;
      const contentValue = typeof pageData.content_value === 'string' 
        ? JSON.parse(pageData.content_value) 
        : pageData.content_value;
      
      // Normalize the specification format for frontend compatibility
      const normalizedSpec = {
        id: contentValue.id || pageData.id,
        version: pageData.version || 1,
        title: contentValue.title || pageData.title,
        // Map layout values to supported types
        layout: contentValue.layout === 'custom' ? 'grid' : 
               contentValue.layout === 'profile' ? 'single' : 
               contentValue.layout === 'dashboard' ? 'grid' :
               (['single', 'grid', 'tabs', 'accordion'].includes(contentValue.layout) ? contentValue.layout : 'grid'),
        components: contentValue.components || []
      };
      
      return {
        id: pageData.id,
        agentId: pageData.agent_id,
        title: pageData.title,
        version: pageData.version || 1,
        specification: normalizedSpec,
        created: new Date(pageData.created_at),
        updated: new Date(pageData.updated_at)
      };
    } catch (error) {
      console.error('Error fetching page spec:', error);
      return null;
    }
  }

  /**
   * Save/update page specification
   */
  async savePageSpec(agentId: string, pageSpec: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: pageSpec.id,
          title: pageSpec.title,
          specification: typeof pageSpec.specification === 'object' 
            ? JSON.stringify(pageSpec.specification)
            : pageSpec.specification,
          version: pageSpec.version || 1
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save page spec: ${response.status}`);
      }

      console.log('✅ Page specification saved successfully', { agentId, pageId: pageSpec.id });
      return true;
    } catch (error) {
      console.error('❌ Error saving page spec:', error);
      return false;
    }
  }

  /**
   * Migrate user data when page specification changes
   */
  async migrateUserData(
    agentId: string, 
    pageId: string, 
    fromVersion: number, 
    toVersion: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages/${pageId}/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromVersion,
          toVersion
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to migrate user data: ${response.status}`);
      }

      console.log('✅ User data migrated successfully', { agentId, pageId, fromVersion, toVersion });
      return true;
    } catch (error) {
      console.error('❌ Error migrating user data:', error);
      return false;
    }
  }

  /**
   * Get all pages for an agent
   */
  async getAgentPages(agentId: string): Promise<PageSpec[]> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent pages: ${response.status}`);
      }

      const result = await response.json();
      const pages = result.pages || result.data || [];
      
      return pages.map((page: any) => ({
        id: page.id,
        agentId: page.agent_id,
        title: page.title,
        version: page.version,
        specification: typeof page.specification === 'string' 
          ? JSON.parse(page.specification)
          : page.specification,
        created: new Date(page.created_at),
        updated: new Date(page.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching agent pages:', error);
      return [];
    }
  }

  /**
   * Create a new agent page with initial specification
   */
  async createAgentPage(agentId: string, pageSpec: {
    title: string;
    specification: any;
    id?: string;
  }): Promise<string | null> {
    try {
      const pageId = pageSpec.id || this.generatePageId();
      
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: pageId,
          title: pageSpec.title,
          specification: typeof pageSpec.specification === 'object' 
            ? JSON.stringify(pageSpec.specification)
            : pageSpec.specification,
          version: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create page: ${response.status}`);
      }

      console.log('✅ Agent page created successfully', { agentId, pageId });
      return pageId;
    } catch (error) {
      console.error('❌ Error creating agent page:', error);
      return null;
    }
  }

  /**
   * Update an existing agent page specification
   */
  async updateAgentPage(agentId: string, pageId: string, updates: {
    title?: string;
    specification?: any;
    version?: number;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages/${pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          specification: typeof updates.specification === 'object' 
            ? JSON.stringify(updates.specification)
            : updates.specification,
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update page: ${response.status}`);
      }

      console.log('✅ Agent page updated successfully', { agentId, pageId });
      return true;
    } catch (error) {
      console.error('❌ Error updating agent page:', error);
      return false;
    }
  }

  /**
   * Delete an agent page and all associated user data
   */
  async deleteAgentPage(agentId: string, pageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/pages/${pageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete page: ${response.status}`);
      }

      console.log('✅ Agent page deleted successfully', { agentId, pageId });
      return true;
    } catch (error) {
      console.error('❌ Error deleting agent page:', error);
      return false;
    }
  }

  /**
   * Generate a unique page ID
   */
  private generatePageId(): string {
    return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const agentDataService = new AgentDataService();