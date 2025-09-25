import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Star,
  Clock,
  Users,
  Tag,
  Sparkles,
  Grid3X3,
  List,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Zap,
  TrendingUp,
  Plus,
  X,
  Copy,
  Heart,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../utils/cn';
import { PostTemplate, TemplateCategory, TemplateSuggestion } from '../types/templates';
import { useTemplates, useTemplateSearch, useTemplateSuggestions } from '../hooks/useTemplates';

interface TemplateLibraryProps {
  onSelectTemplate: (template: PostTemplate) => void;
  onClose?: () => void;
  context?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
    userRole?: string;
    recentActivity?: string[];
  };
  className?: string;
}

const categoryIcons: Record<TemplateCategory, string> = {
  [TemplateCategory.UPDATE]: '📊',
  [TemplateCategory.INSIGHT]: '💡',
  [TemplateCategory.QUESTION]: '❓',
  [TemplateCategory.ANNOUNCEMENT]: '📢',
  [TemplateCategory.CODE_REVIEW]: '🔍',
  [TemplateCategory.MEETING_SUMMARY]: '📝',
  [TemplateCategory.GOAL_SETTING]: '🎯',
  [TemplateCategory.PROBLEM_SOLVING]: '🔧',
  [TemplateCategory.CELEBRATION]: '🎉',
  [TemplateCategory.REQUEST_HELP]: '🆘',
  [TemplateCategory.BRAINSTORM]: '🧠',
  [TemplateCategory.DECISION]: '⚖️',
  [TemplateCategory.LEARNING]: '📚',
  [TemplateCategory.PROCESS]: '🔄',
  [TemplateCategory.FEEDBACK]: '💭'
};

const categoryColors: Record<TemplateCategory, string> = {
  [TemplateCategory.UPDATE]: 'bg-blue-50 text-blue-700 border-blue-200',
  [TemplateCategory.INSIGHT]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  [TemplateCategory.QUESTION]: 'bg-purple-50 text-purple-700 border-purple-200',
  [TemplateCategory.ANNOUNCEMENT]: 'bg-red-50 text-red-700 border-red-200',
  [TemplateCategory.CODE_REVIEW]: 'bg-green-50 text-green-700 border-green-200',
  [TemplateCategory.MEETING_SUMMARY]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  [TemplateCategory.GOAL_SETTING]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [TemplateCategory.PROBLEM_SOLVING]: 'bg-orange-50 text-orange-700 border-orange-200',
  [TemplateCategory.CELEBRATION]: 'bg-pink-50 text-pink-700 border-pink-200',
  [TemplateCategory.REQUEST_HELP]: 'bg-red-50 text-red-700 border-red-200',
  [TemplateCategory.BRAINSTORM]: 'bg-violet-50 text-violet-700 border-violet-200',
  [TemplateCategory.DECISION]: 'bg-slate-50 text-slate-700 border-slate-200',
  [TemplateCategory.LEARNING]: 'bg-teal-50 text-teal-700 border-teal-200',
  [TemplateCategory.PROCESS]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  [TemplateCategory.FEEDBACK]: 'bg-rose-50 text-rose-700 border-rose-200'
};

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelectTemplate,
  onClose,
  context,
  className
}) => {
  // State management
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'popularity' | 'recent' | 'name' | 'usage'>('popularity');
  const [expandedCategories, setExpandedCategories] = useState<Set<TemplateCategory>>(new Set());

  // Hooks
  const { query, setQuery, results: searchResults, isSearching } = useTemplateSearch();
  const { suggestions } = useTemplateSuggestions(context);
  const { 
    templates, 
    popularTemplates, 
    categories, 
    isLoading,
    useTemplate,
    getTemplatesByCategory
  } = useTemplates({
    category: selectedCategory === 'all' ? undefined : selectedCategory
  });

  // Computed values
  const displayTemplates = useMemo(() => {
    let templatesToShow = query ? searchResults : templates;
    
    // Sort templates
    switch (sortBy) {
      case 'popularity':
        templatesToShow = [...templatesToShow].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'name':
        templatesToShow = [...templatesToShow].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'usage':
        templatesToShow = [...templatesToShow].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        break;
      case 'recent':
        templatesToShow = [...templatesToShow]; // Already sorted by creation date
        break;
    }
    
    return templatesToShow;
  }, [query, searchResults, templates, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    templates.forEach(template => {
      counts[template.category] = (counts[template.category] || 0) + 1;
    });
    return counts;
  }, [templates]);

  // Event handlers
  const handleSelectTemplate = (template: PostTemplate) => {
    useTemplate(template.id);
    onSelectTemplate(template);
  };

  const toggleCategory = (category: TemplateCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCopyTemplate = (template: PostTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(template.content);
    // You might want to show a toast notification here
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading templates...</span>
      </div>
    );
  }

  return (
    <div data-testid="template-library" className={cn('bg-white rounded-lg border border-gray-200 shadow-lg', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Template Library</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {showFilters ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="popularity">Most Popular</option>
                <option value="recent">Recently Added</option>
                <option value="name">Alphabetical</option>
                <option value="usage">Most Used</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === 'grid' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gray-50 p-3 rounded-lg border">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg transition-colors text-left',
                    selectedCategory === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  )}
                >
                  All Templates ({templates.length})
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg transition-colors text-left',
                      selectedCategory === category
                        ? categoryColors[category]
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {categoryIcons[category]} {category.replace('-', ' ')} ({categoryCounts[category] || 0})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {/* Suggestions Section */}
        {suggestions.length > 0 && !query && (
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="font-medium text-gray-900">Suggested for You</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {suggestions.slice(0, 3).map(({ template, reason }) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-colors text-left"
                >
                  <div className="text-2xl">{template.icon || categoryIcons[template.category]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-yellow-700 truncate">{reason}</div>
                  </div>
                  <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Templates */}
        {!query && selectedCategory === 'all' && (
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium text-gray-900">Most Popular</h3>
            </div>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {popularTemplates.slice(0, 5).map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="flex-shrink-0 w-48 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{template.icon || categoryIcons[template.category]}</span>
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Template Grid/List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              {query ? `Search Results (${displayTemplates.length})` : 
               selectedCategory === 'all' ? 'All Templates' : 
               `${selectedCategory.replace('-', ' ')} Templates`}
            </h3>
          </div>

          {displayTemplates.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {query ? 'No templates found matching your search.' : 'No templates available.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  onCopy={handleCopyTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {displayTemplates.map(template => (
                <TemplateListItem
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  onCopy={handleCopyTemplate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Template Card Component
interface TemplateCardProps {
  template: PostTemplate;
  onSelect: (template: PostTemplate) => void;
  onCopy: (template: PostTemplate, e: React.MouseEvent) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onCopy }) => {
  return (
    <div
      onClick={() => onSelect(template)}
      className="group relative p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{template.icon || categoryIcons[template.category]}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm truncate">{template.name}</h4>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => onCopy(template, e)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Copy template"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Badge */}
      <div className="mb-3">
        <span className={cn(
          'inline-block px-2 py-1 text-xs font-medium rounded-full border',
          categoryColors[template.category]
        )}>
          {template.category.replace('-', ' ')}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              #{tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{template.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {template.popularity && (
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3" />
              <span>{template.popularity}</span>
            </div>
          )}
          {template.usageCount && (
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{template.usageCount}</span>
            </div>
          )}
        </div>
        {template.estimatedTime && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{template.estimatedTime}m</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Template List Item Component
interface TemplateListItemProps {
  template: PostTemplate;
  onSelect: (template: PostTemplate) => void;
  onCopy: (template: PostTemplate, e: React.MouseEvent) => void;
}

const TemplateListItem: React.FC<TemplateListItemProps> = ({ template, onSelect, onCopy }) => {
  return (
    <div
      onClick={() => onSelect(template)}
      className="group flex items-center space-x-4 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-gray-50 transition-all cursor-pointer"
    >
      <span className="text-xl flex-shrink-0">{template.icon || categoryIcons[template.category]}</span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h4 className="font-medium text-gray-900">{template.name}</h4>
          <span className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full border',
            categoryColors[template.category]
          )}>
            {template.category.replace('-', ' ')}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">{template.description}</p>
      </div>

      <div className="flex items-center space-x-4 text-xs text-gray-500">
        {template.estimatedTime && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{template.estimatedTime}m</span>
          </div>
        )}
        {template.popularity && (
          <div className="flex items-center space-x-1">
            <Star className="w-3 h-3" />
            <span>{template.popularity}</span>
          </div>
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => onCopy(template, e)}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Copy template"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};