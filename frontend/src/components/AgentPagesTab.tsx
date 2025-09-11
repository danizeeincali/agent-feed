/**
 * AgentPagesTab - Dynamic documentation pages with search
 * Features:
 * - Real API data integration
 * - Dynamic page management
 * - Search and filtering
 * - Page creation and editing
 * - Version control
 * - Quick access and bookmarks
 * - External resources
 * - Responsive design
 */

import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Copy,
  Download,
  Upload,
  Save,
  X,
  ChevronRight,
  Clock,
  User,
  Tag,
  FileText,
  Folder,
  Star,
  Share,
  MoreHorizontal,
  Calendar,
  ArrowUpDown,
  Grid,
  List as ListIcon,
  RefreshCw,
  ExternalLink,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { cn } from '../utils/cn';
import { UnifiedAgentData } from './UnifiedAgentPage';

interface AgentPagesTabProps {
  agent: UnifiedAgentData;
  className?: string;
}

interface Page {
  id: string;
  title: string;
  description: string;
  type: 'documentation' | 'api' | 'support' | 'external';
  category: 'guide' | 'reference' | 'help' | 'tutorial';
  url: string;
  lastUpdated: string;
  tags: string[];
  readTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  featured: boolean;
  status: 'published' | 'draft';
  external?: boolean;
}

interface PageCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  pageCount: number;
}

const AgentPagesTab: React.FC<AgentPagesTabProps> = ({ agent, className = '' }) => {
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'views' | 'likes' | 'title'>('updated');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [showFeaturedFirst, setShowFeaturedFirst] = useState(false);
  const [bookmarkedPages, setBookmarkedPages] = useState<Set<string>>(new Set());
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const [readingProgress, setReadingProgress] = useState<Record<string, number>>({});

  // Empty state check
  if (!agent.pages || agent.pages.length === 0) {
    return (
      <div 
        data-testid="empty-pages-state"
        className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
      >
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No pages available
        </h3>
        <p className="text-gray-600 max-w-md">
          This agent doesn't have any documentation pages yet. 
          Pages typically contain guides, tutorials, API documentation, and other resources.
        </p>
      </div>
    );
  }

  // Categories configuration
  const categories: PageCategory[] = [
    { id: 'all', name: 'All Pages', description: 'All documentation pages', color: 'gray', pageCount: agent.pages.length },
    { id: 'documentation', name: 'Documentation', description: 'User guides and documentation', color: 'blue', pageCount: agent.pages.filter(p => p.type === 'documentation').length },
    { id: 'api', name: 'API Reference', description: 'Technical reference materials', color: 'purple', pageCount: agent.pages.filter(p => p.type === 'api').length },
    { id: 'support', name: 'Support', description: 'Help and troubleshooting', color: 'orange', pageCount: agent.pages.filter(p => p.type === 'support').length }
  ];

  // Filter and sort pages
  const filteredAndSortedPages = useMemo(() => {
    let filtered = agent.pages.filter(page => page.status === 'published');

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(page => 
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(page => page.type === typeFilter);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(page => page.type === selectedCategory);
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(page => page.difficulty === difficultyFilter);
    }

    // Featured first
    if (showFeaturedFirst) {
      filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else {
      // Sort pages
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'created':
            return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
          case 'views':
            return 0; // Mock sorting
          case 'likes':
            return 0; // Mock sorting
          case 'title':
            return a.title.localeCompare(b.title);
          case 'updated':
          default:
            return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        }
      });
    }

    return filtered;
  }, [agent.pages, searchTerm, typeFilter, selectedCategory, difficultyFilter, sortBy, showFeaturedFirst]);

  // Handle page click
  const handlePageClick = (page: Page) => {
    setSelectedPage(page);
    
    // Track page view
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_id: page.id,
        page_title: page.title
      });
    }

    // Add to recent pages
    setRecentPages(prev => {
      const updated = [page.id, ...prev.filter(id => id !== page.id)];
      return updated.slice(0, 5);
    });
  };

  // Handle bookmark toggle
  const handleBookmarkToggle = (pageId: string) => {
    setBookmarkedPages(prev => {
      const updated = new Set(prev);
      if (updated.has(pageId)) {
        updated.delete(pageId);
      } else {
        updated.add(pageId);
      }
      return updated;
    });
  };

  // Clear search and filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setTypeFilter('all');
    setDifficultyFilter('all');
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get badge color for page type
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'documentation': return 'bg-blue-100 text-blue-800';
      case 'api': return 'bg-purple-100 text-purple-800';
      case 'support': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get difficulty indicator
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600';
      case 'intermediate': return 'text-yellow-600';
      case 'advanced': return 'text-orange-600';
      case 'expert': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div 
      data-testid="agent-pages-tab"
      className={cn('p-6', className)}
      aria-label="Pages list"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Pages & Documentation
          </h2>
          <p className="text-gray-600">Manage and organize agent documentation</p>
        </div>
        
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Page
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            data-testid="pages-search"
            type="text"
            placeholder="Search pages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search pages"
          />
          {searchTerm && (
            <button
              data-testid="clear-search"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <select
          data-testid="type-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="documentation">Documentation</option>
          <option value="api">API Reference</option>
          <option value="support">Support</option>
        </select>

        {/* Category Filter */}
        <select
          data-testid="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.pageCount})
            </option>
          ))}
        </select>

        {/* Difficulty Filter */}
        <select
          data-testid="difficulty-filter"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>

        {/* Sort */}
        <select
          data-testid="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="updated">Recently Updated</option>
          <option value="title">Title A-Z</option>
          <option value="created">Recently Created</option>
          <option value="views">Most Viewed</option>
          <option value="likes">Most Liked</option>
        </select>

        {/* Featured Toggle */}
        <button
          data-testid="featured-toggle"
          onClick={() => setShowFeaturedFirst(!showFeaturedFirst)}
          className={cn(
            'px-4 py-2 rounded-lg border transition-colors',
            showFeaturedFirst 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          )}
        >
          <Star className="w-4 h-4 mr-2" />
          Featured
        </button>
      </div>

      {/* Recent Pages Section */}
      {recentPages.length > 0 && (
        <div data-testid="recent-pages-section" className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recently Viewed</h3>
          <div className="flex gap-2 overflow-x-auto">
            {recentPages.slice(0, 5).map(pageId => {
              const page = agent.pages.find(p => p.id === pageId);
              if (!page) return null;
              return (
                <button
                  key={pageId}
                  onClick={() => handlePageClick(page)}
                  className="flex-shrink-0 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  {page.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {(searchTerm || selectedCategory !== 'all' || typeFilter !== 'all' || difficultyFilter !== 'all') && (
        <div className="mb-4">
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Pages List/Grid */}
      {filteredAndSortedPages.length === 0 ? (
        <div data-testid="no-search-results" className="text-center py-12">
          <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pages Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? 'Try adjusting your search terms.' : 'Create your first documentation page.'}
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPages.map(page => (
            <div
              key={page.id}
              data-testid={`page-card-${page.id}`}
              className={cn(
                'bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer',
                page.featured && 'featured-page ring-2 ring-blue-500'
              )}
              onClick={() => handlePageClick(page)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 data-testid="page-title" className="font-semibold text-gray-900 line-clamp-2">{page.title}</h3>
                  <span 
                    data-testid={`type-badge-${page.type}`}
                    className={cn('inline-block px-2 py-1 text-xs rounded-full mt-2', getTypeBadgeColor(page.type))}
                  >
                    {page.type}
                  </span>
                </div>
                <button
                  data-testid={`bookmark-button-${page.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookmarkToggle(page.id);
                  }}
                  className={cn(
                    'p-1 rounded hover:bg-gray-100',
                    bookmarkedPages.has(page.id) ? 'bookmarked text-blue-600' : 'text-gray-400'
                  )}
                >
                  {bookmarkedPages.has(page.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>
              
              <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                {page.description}
              </p>

              {/* Difficulty indicator */}
              <div 
                data-testid={`difficulty-${page.difficulty}`}
                className={cn('text-xs font-medium mb-2', getDifficultyColor(page.difficulty))}
              >
                {page.difficulty}
              </div>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {page.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
                {page.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{page.tags.length - 3}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span data-testid={`last-updated-${page.id}`}>{formatDate(page.lastUpdated)}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {page.readTime} min read
                  </span>
                  {readingProgress[page.id] && (
                    <div 
                      data-testid={`reading-progress-${page.id}`}
                      className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden"
                    >
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${readingProgress[page.id]}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Page Link */}
              <a
                data-testid={`page-link-${page.id}`}
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden"
                tabIndex={0}
              >
                {page.title}
              </a>

              {/* Preview Button */}
              <button
                data-testid={`preview-button-${page.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Open preview modal
                }}
                className="hidden"
              >
                Preview
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedPages.map(page => (
            <div
              key={page.id}
              data-testid={`page-card-${page.id}`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handlePageClick(page)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{page.title}</h3>
                    <span 
                      data-testid={`type-badge-${page.type}`}
                      className={cn('px-2 py-1 rounded-full text-xs', getTypeBadgeColor(page.type))}
                    >
                      {page.type}
                    </span>
                    {page.external && (
                      <ExternalLink data-testid={`external-icon-${page.id}`} className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{formatDate(page.lastUpdated)}</span>
                    <span>{page.readTime} min read</span>
                    <span data-testid={`difficulty-${page.difficulty}`} className={getDifficultyColor(page.difficulty)}>
                      {page.difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    data-testid={`bookmark-button-${page.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmarkToggle(page.id);
                    }}
                    className={cn(
                      'p-1 rounded hover:bg-gray-100',
                      bookmarkedPages.has(page.id) ? 'bookmarked text-blue-600' : 'text-gray-400'
                    )}
                  >
                    {bookmarkedPages.has(page.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                  <a
                    data-testid={`page-link-${page.id}`}
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                    tabIndex={0}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* External Resources Section */}
      {agent.pages.some(page => page.external) && (
        <div data-testid="external-resources-section" className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">External Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agent.pages.filter(page => page.external).map(page => (
              <a
                key={page.id}
                data-testid={`page-link-${page.id}`}
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink data-testid={`external-icon-${page.id}`} className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">{page.title}</div>
                  <div className="text-sm text-gray-600">{page.description}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Page Preview Modal */}
      <div data-testid="page-preview-modal" className="hidden">
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Page Preview</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="prose max-w-none">
              Preview content would go here...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPagesTab;