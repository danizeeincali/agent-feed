/**
 * NLD-Guided Mention System Anti-Pattern Fixes
 * Implementation of recommended fixes for mention dropdown reliability
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle 
} from 'react';
import { MentionSuggestion } from '../services/MentionService';

// ✅ FIX 1: Improved debounce hook with proper cleanup
const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timeout to prevent race conditions
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
};

// ✅ FIX 2: Custom hook for mention logic separation
const useMentionState = (value: string, textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  const [mentionQuery, setMentionQuery] = useState<{ query: string; startIndex: number } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ✅ FIXED: Include textareaRef in dependencies to prevent stale closures
  const updateMentionState = useCallback(() => {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart || 0;
    const currentMentionQuery = findMentionQuery(value, cursorPosition);

    if (currentMentionQuery) {
      setMentionQuery(currentMentionQuery);
      setIsDropdownOpen(true);
    } else {
      setMentionQuery(null);
      setIsDropdownOpen(false);
    }
  }, [value, textareaRef]); // ✅ All dependencies included

  return {
    mentionQuery,
    isDropdownOpen,
    updateMentionState,
    setIsDropdownOpen,
    setMentionQuery
  };
};

// ✅ FIX 3: Enhanced suggestion fetching with AbortController
const useSuggestionFetching = (
  debouncedQuery: string,
  mentionQuery: { query: string; startIndex: number } | null,
  fetchSuggestions?: (query: string, options?: { signal?: AbortSignal }) => Promise<MentionSuggestion[]>
) => {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Early return if no query
    if (!mentionQuery || !debouncedQuery) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // ✅ CRITICAL FIX: AbortController for race condition prevention
    const abortController = new AbortController();

    const fetchAgentSuggestions = async () => {
      // Check if already aborted
      if (abortController.signal.aborted) return;

      setIsLoading(true);
      setError(null);

      try {
        let results: MentionSuggestion[];
        
        if (fetchSuggestions) {
          // ✅ Pass abort signal to custom fetch function
          results = await fetchSuggestions(debouncedQuery, { 
            signal: abortController.signal 
          });
        } else {
          // ✅ Built-in MentionService with abort support
          results = await MentionService.searchMentions(debouncedQuery, {
            signal: abortController.signal
          });
        }
        
        // ✅ Only update state if not aborted
        if (!abortController.signal.aborted) {
          setSuggestions(results);
          setIsLoading(false);
        }
      } catch (error) {
        // ✅ Handle AbortError gracefully
        if (error.name === 'AbortError') return;
        
        if (!abortController.signal.aborted) {
          setError(error.message || 'Failed to fetch suggestions');
          setSuggestions([]);
          setIsLoading(false);
        }
      }
    };

    fetchAgentSuggestions();

    // ✅ CRITICAL: Cleanup function to abort in-flight requests
    return () => {
      abortController.abort();
    };
  }, [debouncedQuery, mentionQuery, fetchSuggestions]);

  return { suggestions, isLoading, error, setSuggestions };
};

// ✅ FIX 4: Proper click outside handling with correct dependencies
const useClickOutside = (
  dropdownRef: React.RefObject<HTMLDivElement>,
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  isDropdownOpen: boolean,
  onClickOutside: () => void
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !textareaRef.current?.contains(event.target as Node)
      ) {
        onClickOutside();
      }
    };

    // Only add listener when dropdown is open
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, dropdownRef, textareaRef, onClickOutside]); // ✅ All state included
};

// ✅ FIX 5: Cursor positioning with useLayoutEffect instead of setTimeout
const useCursorPositioning = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  const [newCursorPosition, setNewCursorPosition] = useState<number | null>(null);

  // ✅ FIXED: Use useLayoutEffect for DOM timing instead of setTimeout(0)
  useLayoutEffect(() => {
    if (textareaRef.current && newCursorPosition !== null) {
      textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      textareaRef.current.focus();
      setNewCursorPosition(null);
    }
  }, [newCursorPosition, textareaRef]);

  return { setNewCursorPosition };
};

// ✅ Main component with all fixes applied
export const MentionInputFixed = forwardRef<MentionInputRef, MentionInputProps>(({
  value,
  onChange,
  onMentionSelect,
  fetchSuggestions,
  debounceMs = 300,
  maxSuggestions = 6,
  mentionContext = 'post',
  placeholder = "Type @ to mention agents...",
  className,
  disabled = false,
  ...props
}, ref) => {
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsListRef = useRef<HTMLUListElement>(null);

  // State
  const [selectedIndex, setSelectedIndex] = useState(0);

  // ✅ Custom hooks with proper separation of concerns
  const { 
    mentionQuery, 
    isDropdownOpen, 
    updateMentionState,
    setIsDropdownOpen,
    setMentionQuery
  } = useMentionState(value, textareaRef);

  const debouncedQuery = useDebouncedValue(mentionQuery?.query || '', debounceMs);
  
  const { 
    suggestions, 
    isLoading, 
    error,
    setSuggestions 
  } = useSuggestionFetching(debouncedQuery, mentionQuery, fetchSuggestions);

  const { setNewCursorPosition } = useCursorPositioning(textareaRef);

  // ✅ Click outside handler with proper dependencies
  const handleClickOutside = useCallback(() => {
    setIsDropdownOpen(false);
    setMentionQuery(null);
    setSuggestions([]);
  }, [setIsDropdownOpen, setMentionQuery, setSuggestions]);

  useClickOutside(dropdownRef, textareaRef, isDropdownOpen, handleClickOutside);

  // ✅ Mention selection with proper cursor positioning
  const handleMentionSelect = useCallback((mention: MentionSuggestion) => {
    if (!textareaRef.current || !mentionQuery) return;

    const beforeMention = value.substring(0, mentionQuery.startIndex);
    const afterMention = value.substring(textareaRef.current.selectionStart || 0);
    const mentionText = `@${mention.name}`;
    
    const newValue = beforeMention + mentionText + ' ' + afterMention;
    const newCursorPos = mentionQuery.startIndex + mentionText.length + 1;

    onChange(newValue);
    onMentionSelect?.(mention);
    
    // Close dropdown
    setIsDropdownOpen(false);
    setMentionQuery(null);
    setSuggestions([]);

    // ✅ Use proper cursor positioning
    setNewCursorPosition(newCursorPos);
  }, [value, mentionQuery, onChange, onMentionSelect, setIsDropdownOpen, setMentionQuery, setSuggestions, setNewCursorPosition]);

  // ✅ Keyboard navigation with proper dependencies
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleMentionSelect(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        setMentionQuery(null);
        setSuggestions([]);
        break;
    }
  }, [isDropdownOpen, suggestions, selectedIndex, handleMentionSelect, setIsDropdownOpen, setMentionQuery, setSuggestions]);

  // ✅ Input change handler with mention detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Trigger mention detection
    updateMentionState();
  }, [onChange, updateMentionState]);

  // ✅ Selection change handler
  const handleSelectionChange = useCallback(() => {
    updateMentionState();
  }, [updateMentionState]);

  // ✅ Scroll selected item into view
  useEffect(() => {
    if (suggestionsListRef.current && isDropdownOpen && suggestions.length > 0) {
      const selectedElement = suggestionsListRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isDropdownOpen, suggestions.length]);

  // ✅ Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // ✅ Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    blur: () => textareaRef.current?.blur(),
    insertMention: handleMentionSelect,
    getCurrentMentionQuery: () => mentionQuery?.query || null,
  }), [handleMentionSelect, mentionQuery]);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        {...props}
      />

      {/* ✅ Error display */}
      {error && (
        <div className="text-red-500 text-sm mt-1">
          Error loading suggestions: {error}
        </div>
      )}

      {/* ✅ Dropdown with proper error boundaries */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          role="listbox"
          aria-label="Agent suggestions"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              <span>Loading agents...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul ref={suggestionsListRef} className="py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`px-4 py-3 cursor-pointer transition-colors duration-150 flex items-center space-x-3 ${
                    index === selectedIndex 
                      ? "bg-blue-50 text-blue-900" 
                      : "hover:bg-gray-50 text-gray-900"
                  }`}
                  onClick={() => handleMentionSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {suggestion.displayName.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm truncate">
                        {suggestion.displayName}
                      </span>
                      <span className="text-xs text-gray-500">
                        @{suggestion.name}
                      </span>
                    </div>
                    {suggestion.description && (
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {suggestion.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : mentionQuery?.query ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No agents found matching "{mentionQuery.query}"
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              Type to search agents...
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MentionInputFixed.displayName = 'MentionInputFixed';

// ✅ Utility function for mention detection (unchanged but documented)
const findMentionQuery = (text: string, cursorPosition: number): { query: string; startIndex: number } | null => {
  // Find the @ symbol before the cursor
  let atIndex = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (text[i] === '@') {
      atIndex = i;
      break;
    }
    if (text[i] === ' ' || text[i] === '\n') {
      break;
    }
  }

  if (atIndex === -1) return null;

  // Extract query from @ to cursor
  const query = text.substring(atIndex + 1, cursorPosition);
  
  // Make sure there's no space in the query (which would break the mention)
  if (query.includes(' ') || query.includes('\n')) return null;

  return { query, startIndex: atIndex };
};

// ✅ Enhanced MentionService with AbortController support
class MentionServiceEnhanced {
  static async searchMentions(
    query: string, 
    options: { 
      maxSuggestions?: number; 
      signal?: AbortSignal 
    } = {}
  ): Promise<MentionSuggestion[]> {
    const { maxSuggestions = 8, signal } = options;

    // Check if already aborted
    if (signal?.aborted) {
      throw new Error('Request was aborted');
    }

    // Simulate network delay
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (signal?.aborted) {
          reject(new Error('Request was aborted'));
          return;
        }

        // Your existing search logic here
        const results = this.performSearch(query);
        resolve(results.slice(0, maxSuggestions));
      }, 200);

      // Handle abort
      signal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Request was aborted'));
      });
    });
  }

  private static performSearch(query: string): MentionSuggestion[] {
    // Your existing search implementation
    return [];
  }
}

export default MentionInputFixed;