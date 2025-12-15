import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Settings,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { apiService } from '../services/api';
import { DynamicPage, DynamicPageFilters, PageManagerState, CreateDynamicPageRequest } from '../types/page.types';

interface PageManagerProps {
  agentId: string;
  onPageSelect?: (page: DynamicPage) => void;
  onPageCreate?: (page: DynamicPage) => void;
  onPageUpdate?: (page: DynamicPage) => void;
  onPageDelete?: (pageId: string) => void;
}

const PageManager: React.FC<PageManagerProps> = ({
  agentId,
  onPageSelect,
  onPageCreate,
  onPageUpdate,
  onPageDelete
}) => {
  const [state, setState] = useState<PageManagerState>({
    pages: [],
    isLoading: true,
    error: null,
    totalPages: 0,
    hasMore: false,
    filters: {
      limit: 20,
      offset: 0,
      sort_by: 'updated_at',
      sort_order: 'desc'
    }
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Load pages from API
  const loadPages = useCallback(async (filters?: DynamicPageFilters, append = false) => {
    try {
      if (!append) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      const response = await apiService.getDynamicPages(agentId, filters);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          pages: append ? [...prev.pages, ...response.pages] : response.pages,
          totalPages: response.total,
          hasMore: response.has_more,
          isLoading: false,
          error: null,
          filters: filters || prev.filters
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Failed to load pages'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, [agentId]);

  // Initial load
  useEffect(() => {
    loadPages(state.filters);
  }, [loadPages]);

  // Real-time updates
  useEffect(() => {
    const handlePagesUpdate = (data: any) => {
      if (data.agentId === agentId) {
        loadPages(state.filters); // Reload pages on update
      }
    };

    apiService.on('dynamic_pages_updated', handlePagesUpdate);
    
    return () => {
      apiService.off('dynamic_pages_updated', handlePagesUpdate);
    };
  }, [agentId, loadPages, state.filters]);

  // Search and filter handling
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const newFilters = {
      ...state.filters,
      search: query || undefined,
      offset: 0
    };
    loadPages(newFilters);
  }, [state.filters, loadPages]);

  const handleStatusFilter = useCallback((status: string) => {
    setSelectedStatus(status);
    const newFilters = {
      ...state.filters,
      status: status === 'all' ? undefined : status,
      offset: 0
    };
    loadPages(newFilters);
  }, [state.filters, loadPages]);

  const handleTypeFilter = useCallback((type: string) => {
    setSelectedType(type);
    const newFilters = {
      ...state.filters,
      page_type: type === 'all' ? undefined : type,
      offset: 0
    };
    loadPages(newFilters);
  }, [state.filters, loadPages]);

  // CRUD operations
  const handleCreatePage = async (pageData: CreateDynamicPageRequest) => {
    try {
      const response = await apiService.createDynamicPage(agentId, pageData);
      
      if (response.success) {
        onPageCreate?.(response.page);
        setShowCreateModal(false);
        loadPages(state.filters); // Refresh list
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to create page' }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create page' 
      }));
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const response = await apiService.deleteDynamicPage(agentId, pageId);
      
      if (response.success) {
        onPageDelete?.(pageId);
        loadPages(state.filters); // Refresh list
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to delete page' }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete page' 
      }));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPages(state.filters);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (state.hasMore && !state.isLoading) {
      const newFilters = {
        ...state.filters,
        offset: state.pages.length
      };
      loadPages(newFilters, true);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      published: 'bg-green-100 text-green-800 border-green-200',
      archived: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const getTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'markdown': return <FileText className="w-4 h-4" />;
      case 'component': return <Settings className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Dynamic Pages</h3>
          <p className="text-sm text-gray-600">
            {state.totalPages} page{state.totalPages !== 1 ? 's' : ''} total
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => handleTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="dynamic">Dynamic</option>
            <option value="persistent">Persistent</option>
            <option value="template">Template</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <p className="text-red-800">{state.error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {state.isLoading && state.pages.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading pages...</span>
        </div>
      )}

      {/* Pages List */}
      {!state.isLoading && state.pages.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pages found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || selectedStatus !== 'all' || selectedType !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by creating your first dynamic page.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Page
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {state.pages.map((page) => (
            <div
              key={page.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(page.content_type)}
                    <h4 className="font-medium text-gray-900">{page.title}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(page.status)}`}>
                      {page.status}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {page.page_type}
                    </span>
                  </div>
                  
                  {page.description && (
                    <p className="text-sm text-gray-600 mb-2">{page.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {new Date(page.updated_at).toLocaleDateString()}
                    </span>
                    {page.access_count && (
                      <span>{page.access_count} view{page.access_count !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageSelect?.(page)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    title="View page"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => onPageUpdate?.(page)}
                    className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                    title="Edit page"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeletePage(page.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Load More Button */}
          {state.hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={state.isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {state.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Load More Pages
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Page Modal */}
      {showCreateModal && (
        <CreatePageModal
          agentId={agentId}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePage}
        />
      )}
    </div>
  );
};

// Create Page Modal Component
interface CreatePageModalProps {
  agentId: string;
  onClose: () => void;
  onSubmit: (pageData: CreateDynamicPageRequest) => Promise<void>;
}

const CreatePageModal: React.FC<CreatePageModalProps> = ({ agentId, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateDynamicPageRequest>({
    title: '',
    description: '',
    content_type: 'markdown',
    content_value: '',
    page_type: 'dynamic',
    status: 'draft'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create New Page</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter page title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="markdown">Markdown</option>
                <option value="text">Text</option>
                <option value="json">JSON</option>
                <option value="component">Component</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Type
              </label>
              <select
                value={formData.page_type}
                onChange={(e) => setFormData({ ...formData, page_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="dynamic">Dynamic</option>
                <option value="persistent">Persistent</option>
                <option value="template">Template</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Content
            </label>
            <textarea
              value={formData.content_value}
              onChange={(e) => setFormData({ ...formData, content_value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter initial content"
              rows={4}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PageManager;