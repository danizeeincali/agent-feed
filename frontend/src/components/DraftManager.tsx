import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  Search,
  Filter,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Calendar,
  Clock,
  FileText,
  Tag,
  Users,
  Plus,
  Archive,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Eye,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useDraftManager } from '../hooks/useDraftManager';
import { Draft, DraftStatus } from '../types/drafts';
import { PostCreatorModal } from './PostCreatorModal';

interface DraftManagerProps {
  className?: string;
  onEditDraft?: (draft: Draft) => void;
  onCreatePost?: (draft: Draft) => void;
}

type ViewMode = 'grid' | 'list';
type SortField = 'title' | 'updatedAt' | 'createdAt' | 'wordCount';
type SortOrder = 'asc' | 'desc';

export const DraftManager: React.FC<DraftManagerProps> = ({
  className,
  onEditDraft,
  onCreatePost
}) => {
  // Draft management hooks
  const {
    drafts,
    currentDraft,
    saveDraft,
    loadDraft,
    deleteDraft,
    getAllDrafts,
    getDraftsByStatus,
    searchDrafts,
    getDraftStatistics,
    bulkDeleteDrafts
  } = useDraftManager({ userId: 'current-user' });

  // Navigation hook
  const navigate = useNavigate();

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostCreatorModal, setShowPostCreatorModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);

  // Load drafts on mount
  useEffect(() => {
    const loadDrafts = async () => {
      setIsLoading(true);
      try {
        await getAllDrafts();
      } catch (error) {
        console.error('Failed to load drafts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDrafts();
  }, [getAllDrafts]);

  // Filter and sort drafts
  const filteredAndSortedDrafts = useMemo(() => {
    let filtered = drafts;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchDrafts(searchQuery);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(draft => draft.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'wordCount':
          aValue = a.wordCount || 0;
          bValue = b.wordCount || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [drafts, searchQuery, statusFilter, sortField, sortOrder, searchDrafts]);

  // Draft statistics
  const stats = getDraftStatistics();

  // Handle draft actions
  const handleEditDraft = async (draft: Draft) => {
    try {
      // Open PostCreator modal with draft data for editing
      setEditingDraft(draft);
      setShowPostCreatorModal(true);
    } catch (error) {
      console.error('Failed to open draft editor:', error);
    }
  };

  const handleCreateNewDraft = () => {
    setEditingDraft(null);
    setShowPostCreatorModal(true);
  };

  const handleCloseModal = () => {
    setShowPostCreatorModal(false);
    setEditingDraft(null);
  };

  const handlePostCreated = async (post: any) => {
    console.log('Post created from draft:', post);
    // Refresh drafts list to reflect any changes
    await getAllDrafts();
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      await deleteDraft(draftId);
      setSelectedDrafts(prev => {
        const newSet = new Set(prev);
        newSet.delete(draftId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

  const handleDuplicateDraft = async (draft: Draft) => {
    try {
      const duplicatedDraft: Partial<Draft> = {
        title: `${draft.title} (Copy)`,
        content: draft.content,
        hook: draft.hook,
        tags: [...draft.tags],
        agentMentions: [...draft.agentMentions],
        templateId: draft.templateId,
        status: 'draft' as DraftStatus,
        userId: draft.userId
      };
      await saveDraft(duplicatedDraft);
    } catch (error) {
      console.error('Failed to duplicate draft:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedDrafts.size} drafts?`)) return;
    
    try {
      await bulkDeleteDrafts(Array.from(selectedDrafts));
      setSelectedDrafts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to bulk delete drafts:', error);
    }
  };

  const toggleDraftSelection = (draftId: string) => {
    setSelectedDrafts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(draftId)) {
        newSet.delete(draftId);
      } else {
        newSet.add(draftId);
      }
      return newSet;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div className={cn('p-8', className)}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading drafts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-6', className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Draft Manager</h1>
            <p className="text-gray-600">Manage your post drafts</p>
          </div>
          <button
            onClick={handleCreateNewDraft}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Draft</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Total Drafts</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600">Draft</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.draft}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">Published</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.published}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Archive className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-600">Archived</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 mt-1">{stats.archived}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drafts..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DraftStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
            <option value="shared">Shared</option>
          </select>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 border rounded-lg',
                viewMode === 'grid'
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 border rounded-lg',
                viewMode === 'list'
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          {(['title', 'updatedAt', 'createdAt', 'wordCount'] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={cn(
                'px-3 py-1 text-sm border rounded-lg flex items-center space-x-1',
                sortField === field
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              )}
            >
              <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
              {sortField === field && (
                sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedDrafts.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedDrafts.size} draft{selectedDrafts.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedDrafts(new Set())}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drafts Display */}
      {filteredAndSortedDrafts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No drafts found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first draft to get started'}
          </p>
          <button
            onClick={handleCreateNewDraft}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create New Draft
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedDrafts.map((draft) => (
            <div
              key={draft.id}
              data-testid="draft-item"
              data-draft-id={draft.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Draft Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedDrafts.has(draft.id)}
                    onChange={() => toggleDraftSelection(draft.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 line-clamp-2 mb-1" data-testid="draft-title">
                      {draft.title || 'Untitled Draft'}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {draft.hook || draft.content || 'No content'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditDraft(draft)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    title="Edit draft"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicateDraft(draft)}
                    className="p-1 text-gray-400 hover:text-green-600 rounded"
                    title="Duplicate draft"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Draft Metadata */}
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    draft.status === 'draft' ? 'bg-blue-100 text-blue-700' :
                    draft.status === 'published' ? 'bg-green-100 text-green-700' :
                    draft.status === 'archived' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {draft.status}
                  </span>
                  <span>{draft.wordCount || 0} words</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(draft.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {draft.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Tag className="w-3 h-3" />
                    <span className="truncate">
                      {draft.tags.slice(0, 3).join(', ')}
                      {draft.tags.length > 3 && ' ...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Draft Actions */}
              <div className="mt-4 flex items-center space-x-2">
                <button
                  onClick={() => handleEditDraft(draft)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  Edit Draft
                </button>
                {draft.status === 'draft' && onCreatePost && (
                  <button
                    onClick={() => onCreatePost(draft)}
                    className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                  >
                    Publish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedDrafts.size === filteredAndSortedDrafts.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDrafts(new Set(filteredAndSortedDrafts.map(d => d.id)));
                      } else {
                        setSelectedDrafts(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Words
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedDrafts.map((draft) => (
                <tr key={draft.id} data-testid="draft-item" data-draft-id={draft.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedDrafts.has(draft.id)}
                      onChange={() => toggleDraftSelection(draft.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900" data-testid="draft-title">
                        {draft.title || 'Untitled Draft'}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {draft.hook || draft.content || 'No content'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      draft.status === 'draft' ? 'bg-blue-100 text-blue-700' :
                      draft.status === 'published' ? 'bg-green-100 text-green-700' :
                      draft.status === 'archived' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {draft.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    <div>{new Date(draft.updatedAt).toLocaleDateString()}</div>
                    <div className="text-xs">
                      {new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {draft.wordCount || 0}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditDraft(draft)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="Edit draft"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateDraft(draft)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded"
                        title="Duplicate draft"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PostCreator Modal */}
      <PostCreatorModal
        isOpen={showPostCreatorModal}
        onClose={handleCloseModal}
        onPostCreated={handlePostCreated}
        editDraft={editingDraft}
        data-testid="post-creator-modal"
      />
    </div>
  );
};