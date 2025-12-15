/**
 * Template Service
 * Phase 3 - Production-ready service for template management
 * Uses real API endpoints, not mock data
 */

import { 
  Template, 
  TemplateCreateRequest, 
  TemplateUpdateRequest, 
  TemplateSearchFilters,
  TemplateCategory,
  TemplateStats,
  RenderedTemplate
} from '@/types/templates';

export class TemplateService {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a new template
   */
  async createTemplate(request: TemplateCreateRequest): Promise<Template> {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        createdBy: 'current-user' // TODO: Get from auth context
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create template: ${response.statusText}`);
    }

    const template = await response.json();
    return {
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt)
    };
  }

  /**
   * Get all templates with optional filtering
   */
  async getTemplates(filters?: TemplateSearchFilters): Promise<Template[]> {
    const params = new URLSearchParams();
    
    if (filters?.category) {
      params.append('category', filters.category);
    }
    if (filters?.tags?.length) {
      params.append('tags', filters.tags.join(','));
    }
    if (filters?.isPublic !== undefined) {
      params.append('isPublic', filters.isPublic.toString());
    }
    if (filters?.searchText) {
      params.append('search', filters.searchText);
    }
    if (filters?.createdBy) {
      params.append('createdBy', filters.createdBy);
    }

    const response = await fetch(`/api/templates?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    const templates = await response.json();
    return templates.map((template: any) => ({
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt)
    }));
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<Template | null> {
    const response = await fetch(`/api/templates/${id}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    const template = await response.json();
    return {
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt)
    };
  }

  /**
   * Update an existing template
   */
  async updateTemplate(request: TemplateUpdateRequest): Promise<Template> {
    const response = await fetch(`/api/templates/${request.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        updatedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update template: ${response.statusText}`);
    }

    const template = await response.json();
    return {
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt)
    };
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    const response = await fetch(`/api/templates/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete template: ${response.statusText}`);
    }
  }

  /**
   * Render a template with provided variables
   */
  async renderTemplate(templateId: string, variables: Record<string, any>): Promise<RenderedTemplate> {
    const response = await fetch(`/api/templates/${templateId}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ variables })
    });

    if (!response.ok) {
      throw new Error(`Failed to render template: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(id: string): Promise<void> {
    const response = await fetch(`/api/templates/${id}/use`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to increment template usage: ${response.statusText}`);
    }
  }

  /**
   * Get template statistics
   */
  async getStats(): Promise<TemplateStats> {
    const response = await fetch('/api/templates/stats');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch template stats: ${response.statusText}`);
    }

    const stats = await response.json();
    return {
      ...stats,
      mostUsed: stats.mostUsed?.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt)
      })) || [],
      recentlyCreated: stats.recentlyCreated?.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt)
      })) || []
    };
  }

  /**
   * Get public templates only
   */
  async getPublicTemplates(): Promise<Template[]> {
    return this.getTemplates({ isPublic: true });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: TemplateCategory): Promise<Template[]> {
    return this.getTemplates({ category });
  }

  /**
   * Search templates by text
   */
  async searchTemplates(searchText: string): Promise<Template[]> {
    return this.getTemplates({ searchText });
  }
}

// Export singleton instance
export const templateService = new TemplateService();