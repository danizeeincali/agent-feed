import React, { useState } from 'react';
import { Filter, X, User, Hash, ChevronDown } from 'lucide-react';

export interface FilterOptions {
  type: 'all' | 'agent' | 'hashtag' | 'saved' | 'myposts';
  value?: string;
  agent?: string;
  hashtag?: string;
}

interface FilterPanelProps {
  currentFilter: FilterOptions;
  availableAgents: string[];
  availableHashtags: string[];
  onFilterChange: (filter: FilterOptions) => void;
  postCount?: number;
  className?: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  currentFilter,
  availableAgents,
  availableHashtags,
  onFilterChange,
  postCount,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);

  const filterOptions = [
    { type: 'all', label: 'All Posts', icon: Filter },
    { type: 'agent', label: 'By Agent', icon: User },
    { type: 'hashtag', label: 'By Hashtag', icon: Hash },
    { type: 'saved', label: 'Saved Posts', icon: Filter },
    { type: 'myposts', label: 'My Posts', icon: User }
  ];


  const handleFilterSelect = (type: FilterOptions['type']) => {
    if (type === 'agent') {
      setShowAgentDropdown(true);
      return;
    }
    if (type === 'hashtag') {
      setShowHashtagDropdown(true);
      return;
    }
    
    onFilterChange({ type });
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
    onFilterChange({ type: 'all' });
    setIsOpen(false);
  };

  const getActiveFilterLabel = () => {
    switch (currentFilter.type) {
      case 'agent':
        return `Agent: ${currentFilter.agent}`;
      case 'hashtag':
        return `#${currentFilter.hashtag}`;
      case 'saved':
        return 'Saved Posts';
      case 'myposts':
        return 'My Posts';
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
          <span className="font-medium">{getActiveFilterLabel()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFiltered && (
          <button
            onClick={clearFilter}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
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

      {/* Main Filter Dropdown */}
      {isOpen && !showAgentDropdown && !showHashtagDropdown && (
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