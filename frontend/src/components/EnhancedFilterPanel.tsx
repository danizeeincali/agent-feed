/**
 * Enhanced Filter Panel with Multi-Select Support
 * 
 * Implements TDD London School approach with comprehensive filtering capabilities
 * Supports single and multi-select modes, combined filtering, and real-time validation
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Filter, X, User, Hash, ChevronDown, Settings, Check } from 'lucide-react';
import MultiSelectFilter from './MultiSelectFilter';

export interface FilterOptions {
  type: 'all' | 'agent' | 'hashtag' | 'saved' | 'myposts' | 'multi-agent' | 'multi-hashtag' | 'combined';
  value?: string;
  agent?: string;
  hashtag?: string;
  agents?: string[];
  hashtags?: string[];
  combinationMode?: 'AND' | 'OR';
}

interface EnhancedFilterPanelProps {
  currentFilter: FilterOptions;
  availableAgents: string[];
  availableHashtags: string[];
  onFilterChange: (filter: FilterOptions) => void;
  postCount?: number;
  className?: string;
  enableMultiSelect?: boolean;
  maxSelections?: number;
  onBatchApply?: (filters: FilterOptions) => void;
}

interface FilterState {
  selectedAgents: string[];
  selectedHashtags: string[];
  pendingChanges: boolean;
  isApplying: boolean;
}

const EnhancedFilterPanel: React.FC<EnhancedFilterPanelProps> = ({
  currentFilter,
  availableAgents,
  availableHashtags,
  onFilterChange,
  postCount,
  className = '',
  enableMultiSelect = true,
  maxSelections = 10,
  onBatchApply
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
  const [showMultiAgentSelect, setShowMultiAgentSelect] = useState(false);
  const [showMultiHashtagSelect, setShowMultiHashtagSelect] = useState(false);
  const [useMultiSelectMode, setUseMultiSelectMode] = useState(false);
  
  const [filterState, setFilterState] = useState<FilterState>({
    selectedAgents: currentFilter.agents || [],
    selectedHashtags: currentFilter.hashtags || [],
    pendingChanges: false,
    isApplying: false
  });

  // Update filter state when props change
  useEffect(() => {
    setFilterState(prev => ({
      ...prev,
      selectedAgents: currentFilter.agents || [],
      selectedHashtags: currentFilter.hashtags || [],
      pendingChanges: false
    }));
  }, [currentFilter]);

  // Filter options for single-select mode
  const basicFilterOptions = [
    { type: 'all', label: 'All Posts', icon: Filter },
    { 
      type: 'agent', 
      label: useMultiSelectMode ? 'Multiple Agents' : 'By Agent', 
      icon: User,
      hasMultiSelect: enableMultiSelect
    },
    { 
      type: 'hashtag', 
      label: useMultiSelectMode ? 'Multiple Hashtags' : 'By Hashtag', 
      icon: Hash,
      hasMultiSelect: enableMultiSelect
    },
    { type: 'saved', label: 'Saved Posts', icon: Filter },
    { type: 'myposts', label: 'My Posts', icon: User }
  ];

  // Handle basic filter selection
  const handleFilterSelect = useCallback((type: FilterOptions['type']) => {
    if (type === 'agent') {
      if (useMultiSelectMode && enableMultiSelect) {
        setShowMultiAgentSelect(true);
        setIsOpen(false);
      } else {
        setShowAgentDropdown(true);
      }
      return;
    }
    
    if (type === 'hashtag') {
      if (useMultiSelectMode && enableMultiSelect) {
        setShowMultiHashtagSelect(true);
        setIsOpen(false);
      } else {
        setShowHashtagDropdown(true);
      }
      return;
    }
    
    onFilterChange({ type });
    setIsOpen(false);
  }, [useMultiSelectMode, enableMultiSelect, onFilterChange]);

  // Handle single agent selection
  const handleAgentSelect = useCallback((agent: string) => {
    onFilterChange({ type: 'agent', agent });
    setShowAgentDropdown(false);
    setIsOpen(false);
  }, [onFilterChange]);

  // Handle single hashtag selection
  const handleHashtagSelect = useCallback((hashtag: string) => {
    onFilterChange({ type: 'hashtag', hashtag });
    setShowHashtagDropdown(false);
    setIsOpen(false);
  }, [onFilterChange]);

  // Handle multi-agent selection changes
  const handleMultiAgentChange = useCallback((selectedAgents: string[]) => {
    setFilterState(prev => ({
      ...prev,
      selectedAgents,
      pendingChanges: true
    }));
  }, []);

  // Handle multi-hashtag selection changes
  const handleMultiHashtagChange = useCallback((selectedHashtags: string[]) => {
    setFilterState(prev => ({
      ...prev,
      selectedHashtags,
      pendingChanges: true
    }));
  }, []);

  // Handle type-to-add for agents
  const handleTypeToAddAgent = useCallback((newAgent: string) => {
    // In a real implementation, this would validate against the backend
    console.log('Adding new agent:', newAgent);
  }, []);

  // Handle type-to-add for hashtags
  const handleTypeToAddHashtag = useCallback((newHashtag: string) => {
    // In a real implementation, this would validate hashtag format
    console.log('Adding new hashtag:', newHashtag);
  }, []);

  // Apply multi-select filters
  const applyMultiSelectFilters = useCallback(() => {
    setFilterState(prev => ({ ...prev, isApplying: true }));
    
    const { selectedAgents, selectedHashtags } = filterState;
    
    let newFilter: FilterOptions;
    
    if (selectedAgents.length > 0 && selectedHashtags.length > 0) {
      // Combined filter
      newFilter = {
        type: 'combined',
        agents: selectedAgents,
        hashtags: selectedHashtags,
        combinationMode: 'AND' // Default to AND logic
      };
    } else if (selectedAgents.length > 1) {
      // Multi-agent filter
      newFilter = {
        type: 'multi-agent',
        agents: selectedAgents,
        combinationMode: 'OR' // Default to OR for same type
      };
    } else if (selectedHashtags.length > 1) {
      // Multi-hashtag filter
      newFilter = {
        type: 'multi-hashtag',
        hashtags: selectedHashtags,
        combinationMode: 'AND' // Default to AND for hashtags
      };
    } else if (selectedAgents.length === 1) {
      // Single agent
      newFilter = {
        type: 'agent',
        agent: selectedAgents[0]
      };
    } else if (selectedHashtags.length === 1) {
      // Single hashtag
      newFilter = {
        type: 'hashtag',
        hashtag: selectedHashtags[0]
      };
    } else {
      // No filters
      newFilter = { type: 'all' };
    }
    
    if (onBatchApply) {
      onBatchApply(newFilter);
    } else {
      onFilterChange(newFilter);
    }
    
    setFilterState(prev => ({ 
      ...prev, 
      pendingChanges: false, 
      isApplying: false 
    }));
    
    // Close all dropdowns
    setShowMultiAgentSelect(false);
    setShowMultiHashtagSelect(false);
    setIsOpen(false);
  }, [filterState, onFilterChange, onBatchApply]);

  // Cancel multi-select changes
  const cancelMultiSelectChanges = useCallback(() => {
    setFilterState(prev => ({
      ...prev,
      selectedAgents: currentFilter.agents || [],
      selectedHashtags: currentFilter.hashtags || [],
      pendingChanges: false
    }));
    
    setShowMultiAgentSelect(false);
    setShowMultiHashtagSelect(false);
  }, [currentFilter]);

  // Clear all filters
  const clearFilter = useCallback(() => {
    onFilterChange({ type: 'all' });
    setFilterState({
      selectedAgents: [],
      selectedHashtags: [],
      pendingChanges: false,
      isApplying: false
    });
    setIsOpen(false);
  }, [onFilterChange]);

  // Get active filter label
  const getActiveFilterLabel = useCallback(() => {
    switch (currentFilter.type) {
      case 'agent':
        return `Agent: ${currentFilter.agent}`;
      case 'hashtag':
        return `#${currentFilter.hashtag}`;
      case 'multi-agent':
        return `Agents: ${currentFilter.agents?.slice(0, 2).join(', ')}${(currentFilter.agents?.length || 0) > 2 ? '...' : ''}`;
      case 'multi-hashtag':
        return `Hashtags: ${currentFilter.hashtags?.slice(0, 2).join(', ')}${(currentFilter.hashtags?.length || 0) > 2 ? '...' : ''}`;
      case 'combined':
        const agentCount = currentFilter.agents?.length || 0;
        const hashtagCount = currentFilter.hashtags?.length || 0;
        return `Mixed: ${agentCount} agent${agentCount !== 1 ? 's' : ''} + ${hashtagCount} hashtag${hashtagCount !== 1 ? 's' : ''}`;
      case 'saved':
        return 'Saved Posts';
      case 'myposts':
        return 'My Posts';
      default:
        return 'All Posts';
    }
  }, [currentFilter]);

  // Get active filter icon
  const getActiveFilterIcon = useCallback(() => {
    const option = basicFilterOptions.find(opt => opt.type === currentFilter.type);
    return option?.icon || Filter;
  }, [currentFilter.type, basicFilterOptions]);

  const ActiveIcon = getActiveFilterIcon();
  const isFiltered = currentFilter.type !== 'all';
  const activeFilterLabel = getActiveFilterLabel();

  return (
    <div className={`relative ${className}`} data-testid="enhanced-filter-panel">
      <div className="flex items-center space-x-3 flex-wrap">
        {/* Main Filter Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors
            ${isFiltered 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }
          `}
          aria-expanded={isOpen}
          aria-label="Filter options"
        >
          <ActiveIcon className="w-4 h-4" />
          <span className="font-medium">{activeFilterLabel}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Multi-Select Mode Toggle */}
        {enableMultiSelect && (
          <button
            onClick={() => setUseMultiSelectMode(!useMultiSelectMode)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors
              ${useMultiSelectMode 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }
            `}
            title="Toggle multi-select mode"
            data-testid="multi-select-toggle"
          >
            <Settings className="w-4 h-4" />
            {useMultiSelectMode && <Check className="w-3 h-3" />}
          </button>
        )}

        {/* Clear Filter Button */}
        {isFiltered && (
          <button
            onClick={clearFilter}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            data-testid="clear-filter-button"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}

        {/* Post Count */}
        {postCount !== undefined && (
          <span className="text-sm text-gray-500">
            {postCount} post{postCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Pending Changes Indicator */}
        {filterState.pendingChanges && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-orange-600">Pending changes</span>
            <button
              onClick={applyMultiSelectFilters}
              disabled={filterState.isApplying}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              data-testid="apply-pending-changes"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Main Filter Dropdown */}
      {isOpen && !showAgentDropdown && !showHashtagDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-2">
              {basicFilterOptions.map((option) => {
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
                    <span className="flex-grow">{option.label}</span>
                    {option.hasMultiSelect && useMultiSelectMode && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Multi
                      </span>
                    )}
                    {isActive && <Filter className="w-4 h-4 ml-auto text-blue-700 fill-current" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Single Agent Dropdown */}
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

      {/* Single Hashtag Dropdown */}
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

      {/* Multi-Agent Selection */}
      <MultiSelectFilter
        type="agent"
        available={availableAgents}
        selected={filterState.selectedAgents}
        onSelectionChange={handleMultiAgentChange}
        onTypeToAdd={handleTypeToAddAgent}
        onApply={applyMultiSelectFilters}
        onCancel={cancelMultiSelectChanges}
        isOpen={showMultiAgentSelect}
        maxSelections={maxSelections}
        allowCustomItems={true}
      />

      {/* Multi-Hashtag Selection */}
      <MultiSelectFilter
        type="hashtag"
        available={availableHashtags}
        selected={filterState.selectedHashtags}
        onSelectionChange={handleMultiHashtagChange}
        onTypeToAdd={handleTypeToAddHashtag}
        onApply={applyMultiSelectFilters}
        onCancel={cancelMultiSelectChanges}
        isOpen={showMultiHashtagSelect}
        maxSelections={maxSelections}
        allowCustomItems={true}
      />
    </div>
  );
};

export default EnhancedFilterPanel;