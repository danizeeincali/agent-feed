/**
 * Draft Manager Hook
 * Phase 3 - Production-ready hook for draft management with real persistence
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Draft, 
  DraftStatus 
} from '@/types/drafts';
import { DraftService, defaultDraftServiceConfig } from '@/services/DraftService';

interface UseDraftManagerOptions {
  autoSave?: boolean;
  autoSaveInterval?: number;
  draftService?: DraftService;
}

export function useDraftManager(options: UseDraftManagerOptions = {}) {
  const {
    autoSave = true,
    autoSaveInterval = defaultDraftServiceConfig.autoSaveInterval,
  } = options;

  // CRITICAL FIX: Memoize the DraftService to prevent infinite loops
  const draftService = useMemo(() => {
    return options.draftService || new DraftService();
  }, [options.draftService]);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // Auto-save timer ref
  const autoSaveTimer = useRef<NodeJS.Timeout>();

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && currentDraft && currentDraft.id) {
      // Clear existing timer
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      
      // Set new timer
      autoSaveTimer.current = setTimeout(() => {
        handleAutoSave();
      }, autoSaveInterval);
    }
    
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [currentDraft?.content, currentDraft?.title, autoSave, autoSaveInterval]);

  const loadDrafts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedDrafts = await draftService.getDrafts();
      setDrafts(loadedDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts');
      console.error('Failed to load drafts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [draftService]);

  const createDraft = useCallback(async (title: string, content: string, tags: string[] = []) => {
    try {
      setError(null);
      const newDraft = await draftService.createDraft({
        title,
        content,
        tags
      });
      
      setDrafts(prev => [newDraft, ...prev]);
      setCurrentDraft(newDraft);
      return newDraft;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft');
      console.error('Failed to create draft:', err);
      throw err;
    }
  }, [draftService]);

  const updateDraft = useCallback(async (id: string, updates: Partial<Draft>) => {
    try {
      setError(null);
      const updatedDraft = await draftService.updateDraft({
        id,
        ...updates
      });
      
      setDrafts(prev => 
        prev.map(draft => draft.id === id ? updatedDraft : draft)
      );
      
      if (currentDraft?.id === id) {
        setCurrentDraft(updatedDraft);
      }
      
      return updatedDraft;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update draft');
      console.error('Failed to update draft:', err);
      throw err;
    }
  }, [draftService, currentDraft]);

  const deleteDraft = useCallback(async (id: string) => {
    try {
      setError(null);
      await draftService.deleteDraft(id);
      
      setDrafts(prev => prev.filter(draft => draft.id !== id));
      
      if (currentDraft?.id === id) {
        setCurrentDraft(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft');
      console.error('Failed to delete draft:', err);
      throw err;
    }
  }, [draftService, currentDraft]);

  const publishDraft = useCallback(async (id: string) => {
    try {
      setError(null);
      await draftService.publishDraft(id);
      
      // Update status to published
      await updateDraft(id, { status: DraftStatus.PUBLISHED });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish draft');
      console.error('Failed to publish draft:', err);
      throw err;
    }
  }, [draftService, updateDraft]);

  const handleAutoSave = useCallback(async () => {
    if (!currentDraft || !currentDraft.id) return;
    
    try {
      setIsAutoSaving(true);
      await draftService.autoSave(
        currentDraft.id, 
        currentDraft.content, 
        currentDraft.title
      );
      
      // Update auto-save timestamp in local state
      setCurrentDraft(prev => prev ? {
        ...prev,
        autoSavedAt: new Date()
      } : null);
    } catch (err) {
      console.error('Auto-save failed:', err);
      // Don't set error state for auto-save failures to avoid interrupting user
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentDraft, draftService]);

  const selectDraft = useCallback((draft: Draft) => {
    setCurrentDraft(draft);
  }, []);

  const clearCurrentDraft = useCallback(() => {
    setCurrentDraft(null);
  }, []);

  const searchDrafts = useCallback(async (searchText: string, filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const searchResults = await draftService.getDrafts({
        searchText,
        ...filters
      });
      
      return searchResults;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search drafts');
      console.error('Failed to search drafts:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [draftService]);

  // Get draft statistics
  const getDraftStatistics = useCallback(() => {
    const stats = {
      total: drafts.length,
      draft: drafts.filter(d => d.status === 'draft').length,
      published: drafts.filter(d => d.status === 'published').length,
      archived: drafts.filter(d => d.status === 'archived').length,
      shared: drafts.filter(d => d.status === 'shared').length,
      template: drafts.filter(d => d.status === 'template').length,
      totalWords: drafts.reduce((sum, d) => sum + (d.wordCount || 0), 0),
      averageWords: drafts.length > 0 ? Math.round(drafts.reduce((sum, d) => sum + (d.wordCount || 0), 0) / drafts.length) : 0,
      recentActivity: drafts.filter(d => {
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return new Date(d.updatedAt) > dayAgo;
      }).length
    };
    return stats;
  }, [drafts]);

  // Add missing functions for DraftManager compatibility
  const getAllDrafts = loadDrafts;
  const getDraftsByStatus = useCallback((status: DraftStatus) => {
    return drafts.filter(draft => draft.status === status);
  }, [drafts]);

  const bulkDeleteDrafts = useCallback(async (draftIds: string[]) => {
    try {
      setError(null);
      for (const id of draftIds) {
        await draftService.deleteDraft(id);
      }
      setDrafts(prev => prev.filter(draft => !draftIds.includes(draft.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk delete drafts');
      throw err;
    }
  }, [draftService]);

  const saveDraft = createDraft;
  const loadDraft = selectDraft;
  const autoSaveEnabled = autoSave;
  const toggleAutoSave = () => {}; // Placeholder

  return {
    // State
    drafts,
    currentDraft,
    isLoading,
    error,
    isAutoSaving,
    
    // Actions
    loadDrafts,
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    selectDraft,
    clearCurrentDraft,
    searchDrafts,
    
    // DraftManager compatibility
    getAllDrafts,
    getDraftsByStatus,
    bulkDeleteDrafts,
    getDraftStatistics,
    saveDraft,
    loadDraft,
    autoSaveEnabled,
    toggleAutoSave,
    
    // Utilities
    draftService
  };
}