/**
 * Templates Hook
 * Phase 3 - Production-ready hook for template management with real persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Template, 
  TemplateCategory,
  TemplateSearchFilters 
} from '@/types/templates';
import { TemplateService } from '@/services/TemplateService';

interface UseTemplatesOptions {
  templateService?: TemplateService;
  autoLoad?: boolean;
}

export function useTemplates(options: UseTemplatesOptions = {}) {
  const {
    templateService = new TemplateService(),
    autoLoad = true
  } = options;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    if (autoLoad) {
      loadTemplates();
    }
  }, [autoLoad]);

  const loadTemplates = useCallback(async (filters?: TemplateSearchFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedTemplates = await templateService.getTemplates(filters);
      setTemplates(loadedTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [templateService]);

  const createTemplate = useCallback(async (templateData: {
    name: string;
    description: string;
    content: string;
    category: TemplateCategory;
    tags?: string[];
    isPublic?: boolean;
  }) => {
    try {
      setError(null);
      const newTemplate = await templateService.createTemplate(templateData);
      
      setTemplates(prev => [newTemplate, ...prev]);
      return newTemplate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
      console.error('Failed to create template:', err);
      throw err;
    }
  }, [templateService]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<Template>) => {
    try {
      setError(null);
      const updatedTemplate = await templateService.updateTemplate({
        id,
        ...updates
      });
      
      setTemplates(prev => 
        prev.map(template => template.id === id ? updatedTemplate : template)
      );
      
      if (currentTemplate?.id === id) {
        setCurrentTemplate(updatedTemplate);
      }
      
      return updatedTemplate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
      console.error('Failed to update template:', err);
      throw err;
    }
  }, [templateService, currentTemplate]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      setError(null);
      await templateService.deleteTemplate(id);
      
      setTemplates(prev => prev.filter(template => template.id !== id));
      
      if (currentTemplate?.id === id) {
        setCurrentTemplate(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      console.error('Failed to delete template:', err);
      throw err;
    }
  }, [templateService, currentTemplate]);

  const getTemplate = useCallback(async (id: string) => {
    try {
      setError(null);
      const template = await templateService.getTemplate(id);
      return template;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get template');
      console.error('Failed to get template:', err);
      return null;
    }
  }, [templateService]);

  const renderTemplate = useCallback(async (templateId: string, variables: Record<string, any>) => {
    try {
      setError(null);
      const rendered = await templateService.renderTemplate(templateId, variables);
      return rendered;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render template');
      console.error('Failed to render template:', err);
      return null;
    }
  }, [templateService]);

  const useTemplate = useCallback(async (templateId: string) => {
    try {
      setError(null);
      await templateService.incrementUsage(templateId);
      
      // Update usage count in local state
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId 
            ? { ...template, usageCount: template.usageCount + 1 }
            : template
        )
      );
    } catch (err) {
      console.error('Failed to increment template usage:', err);
      // Don't throw error for usage tracking failure
    }
  }, [templateService]);

  const selectTemplate = useCallback((template: Template) => {
    setCurrentTemplate(template);
  }, []);

  const clearCurrentTemplate = useCallback(() => {
    setCurrentTemplate(null);
  }, []);

  const searchTemplates = useCallback(async (searchText: string, filters: Partial<TemplateSearchFilters> = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const searchResults = await templateService.getTemplates({
        searchText,
        ...filters
      });
      
      return searchResults;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search templates');
      console.error('Failed to search templates:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [templateService]);

  const getTemplatesByCategory = useCallback(async (category: TemplateCategory) => {
    try {
      setError(null);
      const categoryTemplates = await templateService.getTemplatesByCategory(category);
      return categoryTemplates;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to get ${category} templates`);
      console.error(`Failed to get ${category} templates:`, err);
      return [];
    }
  }, [templateService]);

  const getPublicTemplates = useCallback(async () => {
    try {
      setError(null);
      const publicTemplates = await templateService.getPublicTemplates();
      return publicTemplates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get public templates');
      console.error('Failed to get public templates:', err);
      return [];
    }
  }, [templateService]);

  return {
    // State
    templates,
    currentTemplate,
    isLoading,
    error,
    
    // Actions
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    renderTemplate,
    useTemplate,
    selectTemplate,
    clearCurrentTemplate,
    searchTemplates,
    getTemplatesByCategory,
    getPublicTemplates,
    
    // Utilities
    templateService
  };
}