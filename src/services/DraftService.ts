import { 
  Draft, 
  DraftVersion, 
  DraftFolder, 
  DraftFilter, 
  DraftSort, 
  DraftBulkAction,
  DraftCollaboration,
  DraftActivity,
  DraftComment,
  DraftStats,
  DraftStatus,
  AutoSaveConfig
} from '@/types/drafts';

export interface DraftServiceConfig {
  baseUrl: string;
  autoSave: AutoSaveConfig;
  maxDrafts: number;
}

export class DraftService {
  private static instance: DraftService;
  private config: DraftServiceConfig;
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingSaves: Map<string, Draft> = new Map();
  private offlineQueue: Array<{ action: string; data: any }> = [];

  private constructor(config: DraftServiceConfig) {
    this.config = config;
    this.setupOfflineHandler();
  }

  static getInstance(config?: DraftServiceConfig): DraftService {
    if (!DraftService.instance) {
      if (!config) {
        throw new Error('DraftService configuration is required for initialization');
      }
      DraftService.instance = new DraftService(config);
    }
    return DraftService.instance;
  }

  private setupOfflineHandler() {
    window.addEventListener('online', () => {
      this.processOfflineQueue();
    });

    window.addEventListener('beforeunload', () => {
      // Save any pending drafts before page unload
      this.flushPendingSaves();
    });
  }

  // Draft CRUD Operations
  async createDraft(draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Draft> {
    try {
      // For development, use localStorage as fallback
      if (!this.config.baseUrl || this.config.baseUrl === window.location.origin) {
        return this.createDraftOffline(draft);
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft)
      });

      if (!response.ok) {
        throw new Error(`Failed to create draft: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      if (this.config.autoSave.offlineStorage) {
        return this.createDraftOffline(draft);
      }
      throw error;
    }
  }

  private createDraftOffline(draftData: Omit<Draft, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Draft {
    const draft: Draft = {
      ...draftData,
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    // Save to localStorage
    const existingDrafts = this.getLocalDrafts();
    existingDrafts.push(draft);
    localStorage.setItem('agent-feed-drafts', JSON.stringify(existingDrafts));

    return draft;
  }

  async getDraft(id: string): Promise<Draft | null> {
    try {
      // For development, check localStorage first
      if (!this.config.baseUrl || this.config.baseUrl === window.location.origin) {
        return this.getDraftOffline(id);
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${id}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to get draft: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to get draft:', error);
      return this.getDraftOffline(id);
    }
  }

  private getDraftOffline(id: string): Draft | null {
    const drafts = this.getLocalDrafts();
    return drafts.find(draft => draft.id === id) || null;
  }

  async updateDraft(id: string, updates: Partial<Draft>): Promise<Draft> {
    try {
      // For development, use localStorage
      if (!this.config.baseUrl || this.config.baseUrl === window.location.origin) {
        return this.updateDraftOffline(id, updates);
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update draft: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      if (this.config.autoSave.offlineStorage) {
        return this.updateDraftOffline(id, updates);
      }
      throw error;
    }
  }

  private updateDraftOffline(id: string, updates: Partial<Draft>): Draft {
    const drafts = this.getLocalDrafts();
    const draftIndex = drafts.findIndex(draft => draft.id === id);
    
    if (draftIndex === -1) {
      throw new Error('Draft not found');
    }

    const updatedDraft: Draft = {
      ...drafts[draftIndex],
      ...updates,
      updatedAt: new Date(),
      version: (drafts[draftIndex].version || 1) + 1
    };

    drafts[draftIndex] = updatedDraft;
    localStorage.setItem('agent-feed-drafts', JSON.stringify(drafts));

    return updatedDraft;
  }

  async deleteDraft(id: string): Promise<boolean> {
    try {
      // For development, use localStorage
      if (!this.config.baseUrl || this.config.baseUrl === window.location.origin) {
        return this.deleteDraftOffline(id);
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${id}`, {
        method: 'DELETE'
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete draft:', error);
      return this.deleteDraftOffline(id);
    }
  }

  private deleteDraftOffline(id: string): boolean {
    try {
      const drafts = this.getLocalDrafts();
      const filteredDrafts = drafts.filter(draft => draft.id !== id);
      localStorage.setItem('agent-feed-drafts', JSON.stringify(filteredDrafts));
      return true;
    } catch (error) {
      console.error('Failed to delete draft offline:', error);
      return false;
    }
  }

  async getUserDrafts(
    userId: string, 
    filter?: DraftFilter, 
    sort?: DraftSort, 
    limit?: number, 
    offset?: number
  ): Promise<{ drafts: Draft[]; total: number }> {
    try {
      // For development, use localStorage
      if (!this.config.baseUrl || this.config.baseUrl === window.location.origin) {
        return this.getUserDraftsOffline(userId, filter, sort, limit, offset);
      }

      const params = new URLSearchParams();
      params.append('userId', userId);
      
      if (filter) {
        if (filter.status) params.append('status', filter.status.join(','));
        if (filter.tags) params.append('tags', filter.tags.join(','));
        if (filter.search) params.append('search', filter.search);
        if (filter.folder) params.append('folder', filter.folder);
        if (filter.collaborator) params.append('collaborator', filter.collaborator);
        if (filter.dateRange) {
          params.append('startDate', filter.dateRange.start.toISOString());
          params.append('endDate', filter.dateRange.end.toISOString());
        }
      }
      
      if (sort) {
        params.append('sortBy', sort.field);
        params.append('sortDirection', sort.direction);
      }
      
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get drafts: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        drafts: result.data,
        total: result.pagination?.total || result.data.length
      };
    } catch (error) {
      console.error('Failed to get user drafts:', error);
      return this.getUserDraftsOffline(userId, filter, sort, limit, offset);
    }
  }

  private getUserDraftsOffline(
    userId: string, 
    filter?: DraftFilter, 
    sort?: DraftSort, 
    limit?: number, 
    offset?: number
  ): { drafts: Draft[]; total: number } {
    let drafts = this.getLocalDrafts().filter(draft => draft.userId === userId);

    // Apply filters
    if (filter?.status && filter.status.length > 0) {
      drafts = drafts.filter(draft => filter.status!.includes(draft.status));
    }
    
    if (filter?.tags && filter.tags.length > 0) {
      drafts = drafts.filter(draft => 
        filter.tags!.some(tag => draft.tags.includes(tag))
      );
    }
    
    if (filter?.search) {
      const query = filter.search.toLowerCase();
      drafts = drafts.filter(draft =>
        draft.title.toLowerCase().includes(query) ||
        draft.content.toLowerCase().includes(query) ||
        draft.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (sort) {
      drafts.sort((a, b) => {
        let aValue: any = a[sort.field];
        let bValue: any = b[sort.field];

        if (sort.field === 'updatedAt' || sort.field === 'createdAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (sort.direction === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    const total = drafts.length;
    
    // Apply pagination
    if (offset) {
      drafts = drafts.slice(offset);
    }
    if (limit) {
      drafts = drafts.slice(0, limit);
    }

    return { drafts, total };
  }

  private getLocalDrafts(): Draft[] {
    try {
      const stored = localStorage.getItem('agent-feed-drafts');
      if (!stored) return [];
      return JSON.parse(stored).map((draft: any) => ({
        ...draft,
        createdAt: new Date(draft.createdAt),
        updatedAt: new Date(draft.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to get local drafts:', error);
      return [];
    }
  }

  // Auto-save functionality
  scheduleAutoSave(draft: Draft): void {
    if (!this.config.autoSave.enabled) return;

    // Clear existing timer for this draft
    const existingTimer = this.autoSaveTimers.get(draft.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new auto-save
    const timer = setTimeout(() => {
      this.performAutoSave(draft);
    }, this.config.autoSave.interval);

    this.autoSaveTimers.set(draft.id, timer);
    this.pendingSaves.set(draft.id, draft);
  }

  private async performAutoSave(draft: Draft): Promise<void> {
    try {
      await this.updateDraft(draft.id, {
        ...draft,
        metadata: {
          ...draft.metadata,
          lastAutoSave: new Date()
        }
      });

      // Remove from pending saves if successful
      this.pendingSaves.delete(draft.id);
      this.autoSaveTimers.delete(draft.id);
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      
      // Retry logic
      let retryCount = 0;
      const maxRetries = this.config.autoSave.maxRetries;
      
      const retry = async () => {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            this.performAutoSave(draft).then(() => {
              // Success - no more retries needed
            }).catch(() => {
              retry();
            });
          }, 1000 * retryCount); // Exponential backoff
        }
      };
      
      retry();
    }
  }

  cancelAutoSave(draftId: string): void {
    const timer = this.autoSaveTimers.get(draftId);
    if (timer) {
      clearTimeout(timer);
      this.autoSaveTimers.delete(draftId);
    }
    this.pendingSaves.delete(draftId);
  }

  private flushPendingSaves(): void {
    // Attempt to save all pending drafts synchronously
    for (const [draftId, draft] of this.pendingSaves) {
      try {
        navigator.sendBeacon(
          `${this.config.baseUrl}/api/v1/drafts/${draftId}`,
          JSON.stringify(draft)
        );
      } catch (error) {
        console.error('Failed to flush pending save:', error);
      }
    }
  }

  // Version History
  async getDraftVersions(draftId: string): Promise<DraftVersion[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${draftId}/versions`);
      
      if (!response.ok) {
        throw new Error(`Failed to get draft versions: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to get draft versions:', error);
      return [];
    }
  }

  async createDraftVersion(draftId: string, comment?: string): Promise<DraftVersion> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${draftId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment })
    });

    if (!response.ok) {
      throw new Error(`Failed to create draft version: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async restoreDraftVersion(draftId: string, versionId: string): Promise<Draft> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${draftId}/versions/${versionId}/restore`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to restore draft version: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  // Collaboration
  async shareDraft(draftId: string, collaborators: string[], permission: 'view' | 'comment' | 'edit' = 'edit'): Promise<DraftCollaboration[]> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${draftId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ collaborators, permission })
    });

    if (!response.ok) {
      throw new Error(`Failed to share draft: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getDraftCollaborators(draftId: string): Promise<DraftCollaboration[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${draftId}/collaborators`);
      
      if (!response.ok) {
        throw new Error(`Failed to get collaborators: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to get draft collaborators:', error);
      return [];
    }
  }

  async updateCollaboratorPermission(draftId: string, userId: string, permission: 'view' | 'comment' | 'edit'): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/${draftId}/collaborators/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permission })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update collaborator permission:', error);
      return false;
    }
  }

  // Bulk Operations
  async performBulkAction(action: DraftBulkAction): Promise<{ success: string[]; failed: string[] }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action)
      });

      if (!response.ok) {
        throw new Error(`Bulk action failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Bulk action failed:', error);
      return { success: [], failed: action.draftIds };
    }
  }

  // Folder Management
  async createFolder(name: string, description?: string, parentId?: string): Promise<DraftFolder> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/draft-folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description, parentId })
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getFolders(userId: string): Promise<DraftFolder[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/draft-folders?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get folders: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to get folders:', error);
      return [];
    }
  }

  // Analytics and Stats
  async getDraftStats(userId: string): Promise<DraftStats> {
    try {
      // For development, calculate stats from localStorage
      if (!this.config.baseUrl || this.config.baseUrl === window.location.origin) {
        return this.getDraftStatsOffline(userId);
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/drafts/stats?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get draft stats: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to get draft stats:', error);
      return this.getDraftStatsOffline(userId);
    }
  }

  private getDraftStatsOffline(userId: string): DraftStats {
    const drafts = this.getLocalDrafts().filter(draft => draft.userId === userId);
    
    const totalDrafts = drafts.length;
    const publishedCount = drafts.filter(d => d.status === DraftStatus.PUBLISHED).length;
    const sharedCount = drafts.filter(d => d.status === DraftStatus.SHARED).length;
    const scheduledCount = drafts.filter(d => d.status === DraftStatus.SCHEDULED).length;
    
    const totalWords = drafts.reduce((sum, draft) => sum + (draft.metadata.wordCount || 0), 0);
    const averageWordCount = totalDrafts > 0 ? Math.round(totalWords / totalDrafts) : 0;
    
    // Calculate most used tags
    const tagCounts: Record<string, number> = {};
    drafts.forEach(draft => {
      draft.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const mostUsedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDrafts,
      publishedCount,
      sharedCount,
      scheduledCount,
      averageWordCount,
      mostUsedTags,
      collaborationStats: {
        invitationsSent: 0,
        invitationsReceived: 0,
        activeCollaborations: 0
      },
      recentActivity: []
    };
  }

  // Offline Support
  private saveOfflineDraft(action: string, data: any): any {
    if (!this.config.autoSave.offlineStorage) {
      throw new Error('Offline storage is disabled');
    }

    // Store in localStorage for offline access
    const offlineKey = `draft_offline_${Date.now()}_${Math.random()}`;
    localStorage.setItem(offlineKey, JSON.stringify({ action, data, timestamp: new Date() }));

    // Add to offline queue
    this.offlineQueue.push({ action, data });

    // Return mock draft for immediate UI feedback
    return {
      ...data,
      id: offlineKey,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      status: DraftStatus.DRAFT,
      isOffline: true
    };
  }

  private async processOfflineQueue(): Promise<void> {
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      if (!item) continue;

      try {
        switch (item.action) {
          case 'create':
            await this.createDraft(item.data);
            break;
          case 'update':
            await this.updateDraft(item.data.id, item.data);
            break;
          default:
            console.warn('Unknown offline action:', item.action);
        }
      } catch (error) {
        console.error('Failed to process offline item:', error);
        // Put it back in the queue for retry
        this.offlineQueue.push(item);
        break;
      }
    }
  }

  // Utility methods
  calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  validateDraft(draft: Partial<Draft>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!draft.title?.trim()) {
      errors.push('Title is required');
    }

    if (!draft.content?.trim()) {
      errors.push('Content is required');
    }

    if (draft.title && draft.title.length > 500) {
      errors.push('Title must be less than 500 characters');
    }

    if (draft.content && draft.content.length > 50000) {
      errors.push('Content must be less than 50,000 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Cleanup
  destroy(): void {
    // Clear all auto-save timers
    for (const timer of this.autoSaveTimers.values()) {
      clearTimeout(timer);
    }
    this.autoSaveTimers.clear();
    this.pendingSaves.clear();
  }
}

// Default configuration
export const defaultDraftServiceConfig: DraftServiceConfig = {
  baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  autoSave: {
    enabled: true,
    interval: 3000, // 3 seconds
    maxRetries: 3,
    offlineStorage: true
  },
  maxDrafts: 100
};