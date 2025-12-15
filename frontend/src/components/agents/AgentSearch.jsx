/**
 * AgentSearch - Search component for agents
 * Provides real-time search with debouncing and suggestions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AgentSearch.css';

const AgentSearch = ({ 
  onSearch, 
  isSearching = false, 
  placeholder = "Search agents...",
  suggestions = [],
  autoFocus = false 
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState([]);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  /**
   * Load search history from localStorage
   */
  useEffect(() => {
    const history = localStorage.getItem('agent-search-history');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  /**
   * Focus input on mount if autoFocus is true
   */
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  /**
   * Debounced search handler
   */
  const debouncedSearch = useCallback((searchQuery) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (onSearch) {
        onSearch(searchQuery);
      }
    }, 300);
  }, [onSearch]);

  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedSuggestionIndex(-1);

    if (value.trim()) {
      setShowSuggestions(true);
      debouncedSearch(value.trim());
    } else {
      setShowSuggestions(false);
      debouncedSearch('');
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  /**
   * Execute search and update history
   */
  const handleSearch = (searchQuery) => {
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery) {
      if (onSearch) onSearch('');
      return;
    }

    // Update search history
    const newHistory = [
      trimmedQuery,
      ...searchHistory.filter(item => item !== trimmedQuery)
    ].slice(0, 10); // Keep only last 10 searches

    setSearchHistory(newHistory);
    localStorage.setItem('agent-search-history', JSON.stringify(newHistory));

    // Execute search
    if (onSearch) {
      onSearch(trimmedQuery);
    }

    // Hide suggestions
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    const suggestionsList = getSuggestionsList();
    const maxIndex = suggestionsList.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < maxIndex ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : maxIndex
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selectedSuggestion = suggestionsList[selectedSuggestionIndex];
          setQuery(selectedSuggestion);
          handleSearch(selectedSuggestion);
        } else {
          handleSearch(query);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
    inputRef.current?.focus();
  };

  /**
   * Clear search
   */
  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    if (onSearch) {
      onSearch('');
    }
    inputRef.current?.focus();
  };

  /**
   * Handle input focus
   */
  const handleFocus = () => {
    if (query.trim() || searchHistory.length > 0) {
      setShowSuggestions(true);
    }
  };

  /**
   * Handle input blur
   */
  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 150);
  };

  /**
   * Get combined suggestions list
   */
  const getSuggestionsList = () => {
    const combined = [];
    
    // Add search history if no query or query matches history
    if (!query.trim() || searchHistory.some(item => 
      item.toLowerCase().includes(query.toLowerCase())
    )) {
      const matchingHistory = query.trim() 
        ? searchHistory.filter(item => 
            item.toLowerCase().includes(query.toLowerCase())
          )
        : searchHistory;
      
      combined.push(...matchingHistory.slice(0, 5));
    }

    // Add external suggestions
    if (suggestions && suggestions.length > 0) {
      const matchingSuggestions = query.trim()
        ? suggestions.filter(item =>
            item.toLowerCase().includes(query.toLowerCase()) &&
            !combined.includes(item)
          )
        : suggestions.filter(item => !combined.includes(item));
      
      combined.push(...matchingSuggestions.slice(0, 5));
    }

    return combined;
  };

  const suggestionsList = getSuggestionsList();
  const showClearButton = query.length > 0;

  return (
    <div className="agent-search">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          {/* Search Icon */}
          <div className="search-icon">
            {isSearching ? (
              <div className="search-spinner">
                <div className="spinner"></div>
              </div>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  fill="currentColor"
                />
              </svg>
            )}
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="search-input"
            disabled={isSearching}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Clear Button */}
          {showClearButton && (
            <button
              type="button"
              onClick={handleClear}
              className="search-clear"
              title="Clear search"
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="search-submit"
          disabled={isSearching}
          title="Search"
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              fill="currentColor"
            />
          </svg>
        </button>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestionsList.length > 0 && (
        <div ref={suggestionsRef} className="search-suggestions">
          <div className="suggestions-list">
            {suggestionsList.map((suggestion, index) => {
              const isHistory = searchHistory.includes(suggestion);
              const isSelected = index === selectedSuggestionIndex;

              return (
                <button
                  key={`${suggestion}-${index}`}
                  className={`suggestion-item ${isSelected ? 'selected' : ''} ${isHistory ? 'history' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedSuggestionIndex(index)}
                >
                  <span className="suggestion-icon">
                    {isHistory ? (
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" fill="currentColor"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                      </svg>
                    )}
                  </span>
                  <span className="suggestion-text">{suggestion}</span>
                  {isHistory && (
                    <span className="suggestion-label">Recent</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Tips */}
          {!query.trim() && searchHistory.length === 0 && (
            <div className="search-tips">
              <div className="tips-header">Search Tips:</div>
              <ul className="tips-list">
                <li>Search by agent name, description, or category</li>
                <li>Use tags like #api, #data, #ui</li>
                <li>Filter by capabilities or file types</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentSearch;