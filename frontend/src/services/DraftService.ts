/**
 * Draft Service
 * Phase 3 - Production-ready service for draft management
 * Uses localStorage for client-side persistence
 */

import { 
  Draft, 
  DraftCreateRequest, 
  DraftUpdateRequest, 
  DraftSearchFilters, 
  DraftStatus,
  DraftStats,
  DraftVersion,
  DraftManagerConfig 
} from '@/types/drafts';

export const defaultDraftServiceConfig: DraftManagerConfig = {
  autoSaveInterval: 3000, // 3 seconds
  enableAutoSave: true,
  maxDrafts: 1000,
  enableVersioning: true
};

export class DraftService {
  private storageKey = 'agent-feed-drafts';
  private config: DraftManagerConfig;

  constructor(config = defaultDraftServiceConfig) {
    this.config = config;
  }

  private getStoredDrafts(): Draft[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const drafts = JSON.parse(stored);
      return drafts.map((draft: any) => ({
        ...draft,
        createdAt: new Date(draft.createdAt),
        updatedAt: new Date(draft.updatedAt),
        autoSavedAt: draft.autoSavedAt ? new Date(draft.autoSavedAt) : undefined,
        publishedAt: draft.publishedAt ? new Date(draft.publishedAt) : undefined
      }));
    } catch (error) {
      console.error('Error reading drafts from localStorage:', error);
      return [];
    }
  }

  private storeDrafts(drafts: Draft[]): void {
    try {
      const serializable = drafts.map(draft => ({
        ...draft,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
        autoSavedAt: draft.autoSavedAt?.toISOString(),
        publishedAt: draft.publishedAt?.toISOString()
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch (error) {
      console.error('Error storing drafts to localStorage:', error);
      throw new Error('Failed to save draft to storage');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Create a new draft
   */
  async createDraft(request: DraftCreateRequest): Promise<Draft> {
    const drafts = this.getStoredDrafts();
    
    if (drafts.length >= this.config.maxDrafts) {
      throw new Error(`Maximum number of drafts (${this.config.maxDrafts}) exceeded`);
    }

    const now = new Date();
    const newDraft: Draft = {
      id: this.generateId(),
      userId: 'current-user', // In a real app, this would come from auth
      title: request.title,
      content: request.content,
      status: DraftStatus.DRAFT,
      tags: request.tags || [],
      createdAt: now,
      updatedAt: now,
      wordCount: request.content.split(/\s+/).filter(word => word.length > 0).length
    };

    drafts.unshift(newDraft);
    this.storeDrafts(drafts);
    
    return newDraft;
  }

  /**
   * Get all drafts with optional filtering
   */
  async getDrafts(filters?: DraftSearchFilters): Promise<Draft[]> {
    let drafts = this.getStoredDrafts();

    if (!filters) return drafts;

    // Apply status filter
    if (filters.status) {
      drafts = drafts.filter(draft => draft.status === filters.status);
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      drafts = drafts.filter(draft => 
        filters.tags!.some(tag => draft.tags.includes(tag))
      );
    }

    // Apply search text filter
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      drafts = drafts.filter(draft => 
        draft.title.toLowerCase().includes(searchLower) ||
        draft.content.toLowerCase().includes(searchLower)
      );
    }

    // Apply date range filter
    if (filters.dateRange) {
      drafts = drafts.filter(draft => 
        draft.updatedAt >= filters.dateRange!.start &&
        draft.updatedAt <= filters.dateRange!.end
      );
    }

    return drafts;
  }

  /**
   * Get a single draft by ID
   */
  async getDraft(id: string): Promise<Draft | null> {
    const drafts = this.getStoredDrafts();
    return drafts.find(draft => draft.id === id) || null;
  }

  /**
   * Update an existing draft
   */
  async updateDraft(request: DraftUpdateRequest): Promise<Draft> {
    const drafts = this.getStoredDrafts();
    const draftIndex = drafts.findIndex(draft => draft.id === request.id);
    
    if (draftIndex === -1) {
      throw new Error(`Draft with id ${request.id} not found`);
    }

    const now = new Date();
    const updatedDraft: Draft = {
      ...drafts[draftIndex],
      ...request,
      updatedAt: now,
      wordCount: request.content ? 
        request.content.split(/\s+/).filter(word => word.length > 0).length :
        drafts[draftIndex].wordCount
    };

    drafts[draftIndex] = updatedDraft;
    this.storeDrafts(drafts);
    
    return updatedDraft;
  }

  /**
   * Auto-save draft content
   */
  async autoSave(id: string, content: string, title?: string): Promise<void> {
    const drafts = this.getStoredDrafts();
    const draftIndex = drafts.findIndex(draft => draft.id === id);
    
    if (draftIndex === -1) {
      throw new Error(`Draft with id ${id} not found`);
    }

    const now = new Date();
    drafts[draftIndex] = {
      ...drafts[draftIndex],
      content,
      title: title || drafts[draftIndex].title,
      autoSavedAt: now,
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length
    };

    this.storeDrafts(drafts);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(id: string): Promise<void> {
    const drafts = this.getStoredDrafts();
    const filteredDrafts = drafts.filter(draft => draft.id !== id);
    
    if (filteredDrafts.length === drafts.length) {
      throw new Error(`Draft with id ${id} not found`);
    }

    this.storeDrafts(filteredDrafts);
  }

  /**
   * Publish a draft as a post
   */
  async publishDraft(id: string): Promise<void> {
    const draft = await this.getDraft(id);
    if (!draft) {
      throw new Error(`Draft with id ${id} not found`);
    }

    // In a real application, this would publish to the actual posts API
    // For now, we'll just update the status to published
    await this.updateDraft({
      id,
      status: DraftStatus.PUBLISHED,
      publishedAt: new Date()
    });
  }

  /**
   * Get draft statistics
   */
  async getStats(): Promise<DraftStats> {
    const drafts = this.getStoredDrafts();
    
    return {
      total: drafts.length,
      byStatus: {
        draft: drafts.filter(d => d.status === DraftStatus.DRAFT).length,
        published: drafts.filter(d => d.status === DraftStatus.PUBLISHED).length,
        archived: drafts.filter(d => d.status === DraftStatus.ARCHIVED).length,
        shared: drafts.filter(d => d.status === DraftStatus.SHARED).length,
        template: drafts.filter(d => d.status === DraftStatus.TEMPLATE).length
      },
      totalWordCount: drafts.reduce((sum, d) => sum + (d.wordCount || 0), 0),
      averageWordCount: drafts.length > 0 ? 
        Math.round(drafts.reduce((sum, d) => sum + (d.wordCount || 0), 0) / drafts.length) : 0,
      recentlyModified: drafts.filter(d => {
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return d.updatedAt > dayAgo;
      }).length
    };
  }

  /**
   * Get draft versions (if versioning is enabled)
   */
  async getDraftVersions(draftId: string): Promise<DraftVersion[]> {
    // For now, return empty array since we're not implementing full versioning in localStorage
    // This would be implemented with a separate storage key for versions
    return [];
  }

  /**
   * Get configuration
   */
  getConfig(): DraftManagerConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DraftManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const draftService = new DraftService();