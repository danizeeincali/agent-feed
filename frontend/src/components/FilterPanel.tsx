import React, { useState, useEffect } from 'react';
import { Filter, X, User, Hash, ChevronDown, Settings, Check } from 'lucide-react';
import MultiSelectInput, { MultiSelectOption } from './MultiSelectInput';

export interface FilterOptions {
  type: 'all' | 'agent' | 'hashtag' | 'saved' | 'myposts' | 'multi-select';
  value?: string;
  agent?: string;
  hashtag?: string;
  agents?: string[];
  hashtags?: string[];
  multiSelectMode?: boolean;
  combinationMode?: 'AND' | 'OR';
  userId?: string; // User ID for saved/my posts filtering
  savedPostsEnabled?: boolean; // Toggle for saved posts
  myPostsEnabled?: boolean; // Toggle for my posts
}

interface FilterPanelProps {
  currentFilter: FilterOptions;
  availableAgents: string[];
  availableHashtags: string[];
  onFilterChange: (filter: FilterOptions) => void;
  postCount?: number;
  className?: string;
  onSuggestionsRequest?: (type: 'agents' | 'hashtags', query: string) => void;
  suggestionsLoading?: boolean;
  savedPostsCount?: number; // Count of saved posts
  myPostsCount?: number; // Count of user's posts
  userId?: string; // Current user ID
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  currentFilter,
  availableAgents,
  availableHashtags,
  onFilterChange,
  postCount,
  className = '',
  onSuggestionsRequest,
  suggestionsLoading = false,
  savedPostsCount = 0,
  myPostsCount = 0,
  userId = 'anonymous'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [tempFilter, setTempFilter] = useState<FilterOptions>(currentFilter);
  const [agentSuggestions, setAgentSuggestions] = useState<MultiSelectOption[]>([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<MultiSelectOption[]>([]);

  const filterOptions = [
    { type: 'all', label: 'All Posts', icon: Filter },
    { type: 'agent', label: 'By Agent', icon: User },
    { type: 'hashtag', label: 'By Hashtag', icon: Hash },
    { type: 'multi-select', label: 'Advanced Filter', icon: Settings },
    { type: 'saved', label: 'Saved Posts', icon: Filter },
    { type: 'myposts', label: 'My Posts', icon: User }
  ];


  // Initialize suggestions from available data
  useEffect(() => {
    setAgentSuggestions((availableAgents || []).map(agent => ({
      value: agent,
      label: agent,
      color: 'blue'
    })));
    setHashtagSuggestions((availableHashtags || []).map(hashtag => ({
      value: hashtag,
      label: `#${hashtag}`,
      color: 'purple'
    })));
  }, [availableAgents, availableHashtags]);

  // Initialize temp filter when current filter changes
  useEffect(() => {
    setTempFilter(currentFilter);
  }, [currentFilter]);

  const handleFilterSelect = (type: FilterOptions['type']) => {
    if (type === 'agent') {
      setShowAgentDropdown(true);
      return;
    }
    if (type === 'hashtag') {
      setShowHashtagDropdown(true);
      return;
    }
    if (type === 'multi-select') {
      setTempFilter({
        type: 'multi-select',
        multiSelectMode: true,
        agents: currentFilter.agents || [],
        hashtags: currentFilter.hashtags || [],
        combinationMode: currentFilter.combinationMode || 'AND',
        userId: userId,
        savedPostsEnabled: currentFilter.savedPostsEnabled || false,
        myPostsEnabled: currentFilter.myPostsEnabled || false
      });
      setShowMultiSelect(true);
      return;
    }
    
    // Handle saved and myposts filters - ensure userId is included
    const filterWithUserId = { type, userId: userId } as FilterOptions;
    onFilterChange(filterWithUserId);
    setIsOpen(false);
  };

  const handleAgentSelect = (agent: string) => {
    onFilterChange({ type: 'agent', agent });
    setShowAgentDropdown(false);
    setIsOpen(false);
  };

  const handleHashtagSelect = (hashtag: string) => {
    onFilterChange({ type: 'hashtag', hashtag });
    setShowHashtagDropdown(false);
    setIsOpen(false);
  };


  const clearFilter = () => {
    console.log('FilterPanel: Clearing all filters');
    
    // Reset to complete initial state
    const clearedFilter = { type: 'all' as const };
    const clearedTempFilter = { 
      type: 'all' as const,
      agents: [],
      hashtags: [],
      combinationMode: 'AND' as const,
      savedPostsEnabled: false,
      myPostsEnabled: false
    };
    
    // Update all states
    onFilterChange(clearedFilter);
    setTempFilter(clearedTempFilter);
    
    // Close all dropdowns and panels
    setIsOpen(false);
    setShowMultiSelect(false);
    setShowAgentDropdown(false);
    setShowHashtagDropdown(false);
    
    console.log('FilterPanel: Filter cleared successfully');
  };

  const applyMultiSelectFilter = () => {
    console.log('FilterPanel: Applying multi-select filter:', tempFilter);
    
    // Check if we have any filters selected
    const hasAgents = tempFilter.agents && tempFilter.agents.length > 0;
    const hasHashtags = tempFilter.hashtags && tempFilter.hashtags.length > 0;
    const hasSavedPosts = tempFilter.savedPostsEnabled;
    const hasMyPosts = tempFilter.myPostsEnabled;
    
    if (!hasAgents && !hasHashtags && !hasSavedPosts && !hasMyPosts) {
      console.warn('FilterPanel: No filters selected, not applying empty filter');
      return;
    }
    
    // Create properly structured filter object for the API
    const filterToApply = {
      type: 'multi-select' as const,
      agents: tempFilter.agents || [],
      hashtags: tempFilter.hashtags || [],
      combinationMode: tempFilter.combinationMode || 'AND' as const,
      savedPostsEnabled: tempFilter.savedPostsEnabled || false,
      myPostsEnabled: tempFilter.myPostsEnabled || false,
      userId: userId // CRITICAL FIX: Include userId for saved/my posts
    };
    
    console.log('FilterPanel: Sending filter to parent:', filterToApply);
    onFilterChange(filterToApply);
    setShowMultiSelect(false);
    setIsOpen(false);
  };

  const cancelMultiSelect = () => {
    setTempFilter(currentFilter);
    setShowMultiSelect(false);
  };

  const handleAgentSuggestionsRequest = (query: string) => {
    if (onSuggestionsRequest) {
      onSuggestionsRequest('agents', query);
    }
  };

  const handleHashtagSuggestionsRequest = (query: string) => {
    if (onSuggestionsRequest) {
      onSuggestionsRequest('hashtags', query);
    }
  };

  const getActiveFilterLabel = () => {
    switch (currentFilter.type) {
      case 'agent':
        return `Agent: ${currentFilter.agent}`;
      case 'hashtag':
        return `#${currentFilter.hashtag}`;
      case 'multi-select':
        const agentCount = currentFilter.agents?.length || 0;
        const hashtagCount = currentFilter.hashtags?.length || 0;
        const savedEnabled = currentFilter.savedPostsEnabled;
        const myPostsEnabled = currentFilter.myPostsEnabled;
        
        const parts = [];
        if (agentCount > 0) parts.push(`${agentCount} agent${agentCount !== 1 ? 's' : ''}`);
        if (hashtagCount > 0) parts.push(`${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`);
        if (savedEnabled) parts.push('saved');
        if (myPostsEnabled) parts.push('my posts');
        
        return parts.length > 0 ? parts.join(' + ') : 'Advanced Filter';
      case 'saved':
        return `Saved Posts${savedPostsCount > 0 ? ` (${savedPostsCount})` : ''}`;
      case 'myposts':
        return `My Posts${myPostsCount > 0 ? ` (${myPostsCount})` : ''}`;
      default:
        return 'All Posts';
    }
  };

  const getActiveFilterIcon = () => {
    const option = filterOptions.find(opt => opt.type === currentFilter.type);
    return option?.icon || Filter;
  };

  const ActiveIcon = getActiveFilterIcon();
  const isFiltered = currentFilter.type !== 'all';
  const isMultiFiltered = currentFilter.type === 'multi-select' && 
    ((currentFilter.agents && currentFilter.agents.length > 0) || 
     (currentFilter.hashtags && currentFilter.hashtags.length > 0));

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors
            ${isFiltered 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <ActiveIcon className="w-4 h-4" />
          <span className="font-medium" data-testid="filter-indicator">{getActiveFilterLabel()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {(isFiltered || isMultiFiltered) && (
          <button
            onClick={clearFilter}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            data-testid="clear-filter-button"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}

        {postCount !== undefined && (
          <span className="text-sm text-gray-500">
            {postCount} post{postCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Multi-Select Panel */}
      {showMultiSelect && (
        <>
          <div className="fixed inset-0 z-10" onClick={cancelMultiSelect}></div>
          <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4" data-testid="advanced-filter-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Advanced Filter</h3>
              <button
                onClick={cancelMultiSelect}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Agents Multi-Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agents ({tempFilter.agents?.length || 0} selected)
              </label>
              <MultiSelectInput
                options={agentSuggestions}
                value={tempFilter.agents || []}
                onChange={(agents) => setTempFilter({...tempFilter, agents})}
                placeholder="Search and select agents..."
                maxItems={10}
                loading={suggestionsLoading}
                onSearch={handleAgentSuggestionsRequest}
                allowCustom={false}
                emptyMessage="No agents found"
              />
            </div>
            
            {/* Hashtags Multi-Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hashtags ({tempFilter.hashtags?.length || 0} selected)
              </label>
              <MultiSelectInput
                options={hashtagSuggestions}
                value={tempFilter.hashtags || []}
                onChange={(hashtags) => setTempFilter({...tempFilter, hashtags})}
                placeholder="Search and select hashtags..."
                maxItems={10}
                loading={suggestionsLoading}
                onSearch={handleHashtagSuggestionsRequest}
                allowCustom={false}
                emptyMessage="No hashtags found"
              />
            </div>
            
            {/* Saved Posts and My Posts Toggles */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">Post Filters</label>
              <div className="space-y-3">
                {/* Saved Posts Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Saved Posts</div>
                      <div className="text-xs text-gray-500">{savedPostsCount} saved posts</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={tempFilter.savedPostsEnabled || false}
                      onChange={(e) => setTempFilter({...tempFilter, savedPostsEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {/* My Posts Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">My Posts</div>
                      <div className="text-xs text-gray-500">{myPostsCount} my posts</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={tempFilter.myPostsEnabled || false}
                      onChange={(e) => setTempFilter({...tempFilter, myPostsEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Combination Mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTempFilter({...tempFilter, combinationMode: 'AND'})}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    tempFilter.combinationMode === 'AND'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  AND - Match all selected
                </button>
                <button
                  onClick={() => setTempFilter({...tempFilter, combinationMode: 'OR'})}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    tempFilter.combinationMode === 'OR'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  OR - Match any selected
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={cancelMultiSelect}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyMultiSelectFilter}
                disabled={(!tempFilter.agents || tempFilter.agents.length === 0) && 
                         (!tempFilter.hashtags || tempFilter.hashtags.length === 0) &&
                         !tempFilter.savedPostsEnabled && !tempFilter.myPostsEnabled}
                className="px-3 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Filter Dropdown */}
      {isOpen && !showAgentDropdown && !showHashtagDropdown && !showMultiSelect && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-2">
              {filterOptions.map((option) => {
                const Icon = option.icon;
                const isActive = currentFilter.type === option.type;
                
                return (
                  <button
                    key={option.type}
                    onClick={() => handleFilterSelect(option.type as FilterOptions['type'])}
                    className={`
                      flex items-center w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors
                      ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                    `}
                  >
                    <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                    <span>{option.label}</span>
                    {isActive && <Filter className="w-4 h-4 ml-auto text-blue-700 fill-current" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Agent Dropdown */}
      {showAgentDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowAgentDropdown(false)}></div>
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            <div className="p-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Select Agent</h3>
            </div>
            <div className="py-2">
              {availableAgents.map((agent) => (
                <button
                  key={agent}
                  onClick={() => handleAgentSelect(agent)}
                  className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    {agent.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-700">{agent}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Hashtag Dropdown */}
      {showHashtagDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowHashtagDropdown(false)}></div>
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            <div className="p-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Select Hashtag</h3>
            </div>
            <div className="py-2">
              {availableHashtags.map((hashtag) => (
                <button
                  key={hashtag}
                  onClick={() => handleHashtagSelect(hashtag)}
                  className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <Hash className="w-4 h-4 text-purple-500 mr-3" />
                  <span className="text-gray-700">#{hashtag}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default FilterPanel;