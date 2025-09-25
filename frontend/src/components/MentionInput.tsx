import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { cn } from '../utils/cn';
import { Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { MentionService, MentionSuggestion as BaseMentionSuggestion } from '../services/MentionService';

// Types
export interface MentionSuggestion extends BaseMentionSuggestion {}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  autoFocus?: boolean;
  // Mention-specific props
  onMentionSelect?: (mention: MentionSuggestion) => void;
  fetchSuggestions?: (query: string) => Promise<MentionSuggestion[]>;
  debounceMs?: number;
  maxSuggestions?: number;
  mentionContext?: 'post' | 'comment' | 'quick-post';
  // Style customization
  suggestionClassName?: string;
  dropdownClassName?: string;
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
}

interface MentionInputRef {
  focus: () => void;
  blur: () => void;
  insertMention: (mention: MentionSuggestion) => void;
  getCurrentMentionQuery: () => string | null;
  // CRITICAL FIX: Add missing properties that PostCreator expects
  selectionStart: number;
  selectionEnd: number;
  setSelectionRange: (start: number, end: number) => void;
}

// No longer needed - using MentionService

// Utility functions
const getCursorPosition = (element: HTMLTextAreaElement): number => {
  return element.selectionStart || 0;
};

const setCursorPosition = (element: HTMLTextAreaElement, position: number): void => {
  element.setSelectionRange(position, position);
  element.focus();
};

const findMentionQuery = (text: string, cursorPosition: number): { query: string; startIndex: number } | null => {
  console.log('🔍 EMERGENCY DEBUG: findMentionQuery called', { 
    textSample: text.substring(Math.max(0, cursorPosition - 20), cursorPosition + 5), 
    cursorPosition,
    textLength: text.length,
    fullText: text
  });
  
  // CRITICAL FIX: Ensure we have valid inputs
  if (typeof text !== 'string' || typeof cursorPosition !== 'number' || cursorPosition < 0) {
    console.error('🚨 EMERGENCY: Invalid inputs to findMentionQuery', { text: typeof text, cursorPosition });
    return null;
  }
  
  // Find the @ symbol before the cursor
  let atIndex = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];
    console.log(`🔍 EMERGENCY: Checking char at ${i}: '${char}' (code: ${char?.charCodeAt(0)})`);
    
    if (char === '@') {
      atIndex = i;
      console.log('🎯 EMERGENCY: Found @ at index', atIndex);
      break;
    }
    if (char === ' ' || char === '\n' || char === '\t') {
      console.log('🚫 EMERGENCY: Hit whitespace at', i, 'before finding @, char:', char, 'code:', char.charCodeAt(0));
      break;
    }
  }

  if (atIndex === -1) {
    console.log('❌ EMERGENCY: No @ found before cursor position', cursorPosition);
    return null;
  }

  // Extract query from @ to cursor
  const query = text.substring(atIndex + 1, cursorPosition);
  console.log('📝 EMERGENCY: Extracted query details:', {
    query: `"${query}"`,
    queryLength: query.length,
    atIndex,
    cursorPosition,
    substring: `text.substring(${atIndex + 1}, ${cursorPosition})`
  });
  
  // EMERGENCY FIX: Allow empty queries (user just typed @)
  // Only reject if there's whitespace in the middle
  if (query.includes(' ') || query.includes('\n') || query.includes('\t')) {
    console.log('🚫 EMERGENCY: Query contains whitespace, invalid:', {
      hasSpace: query.includes(' '),
      hasNewline: query.includes('\n'),
      hasTab: query.includes('\t')
    });
    return null;
  }

  const result = { query: query || '', startIndex: atIndex };
  console.log('✅ EMERGENCY: Valid mention query found:', result);
  return result;
};

// No longer needed - filtering handled by MentionService

// Debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(({
  value,
  onChange,
  onSubmit,
  placeholder = "Type @ to mention agents...",
  className,
  disabled = false,
  maxLength,
  rows = 4,
  autoFocus = false,
  onMentionSelect,
  fetchSuggestions,
  debounceMs = 100, // TEMP DEBUG: Reduced from 300ms to 100ms for faster testing
  maxSuggestions = 8,
  mentionContext = 'post',
  suggestionClassName,
  dropdownClassName,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}, ref) => {
  // State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<{ query: string; startIndex: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsListRef = useRef<HTMLUListElement>(null);

  // Debounced query for API calls
  const debouncedQuery = useDebounce(mentionQuery?.query || '', debounceMs);

  // CRITICAL FIX: Track if this is initial load with @ already present (moved after updateMentionState definition)

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    blur: () => textareaRef.current?.blur(),
    insertMention: (mention: MentionSuggestion) => {
      handleMentionSelect(mention);
    },
    getCurrentMentionQuery: () => mentionQuery?.query || null,
    // CRITICAL FIX: Expose textarea properties that PostCreator needs
    get selectionStart() {
      return textareaRef.current?.selectionStart || 0;
    },
    get selectionEnd() {
      return textareaRef.current?.selectionEnd || 0;
    },
    setSelectionRange: (start: number, end: number) => {
      textareaRef.current?.setSelectionRange(start, end);
    },
  }));

  // Handle mention detection and dropdown positioning - CRITICAL FIX
  const updateMentionState = useCallback((inputValue?: string, actualCursorPos?: number) => {
    console.log('🔍 EMERGENCY DEBUG: updateMentionState called', { 
      inputValue: inputValue?.substring(Math.max(0, (inputValue?.length || 0) - 10)), 
      hasTextarea: !!textareaRef.current,
      currentValue: value.substring(Math.max(0, value.length - 10)),
      actualCursorPos,
      valueLength: value.length,
      inputValueLength: inputValue?.length
    });
    
    if (!textareaRef.current) {
      console.log('❌ EMERGENCY: No textarea ref available');
      return;
    }

    // CRITICAL FIX: Always use the most current value and REAL cursor position
    const textToAnalyze = inputValue !== undefined ? inputValue : value;
    
    // CRITICAL FIX: Always use ACTUAL cursor position from textarea
    let cursorPosition;
    if (actualCursorPos !== undefined) {
      cursorPosition = actualCursorPos;
      console.log('🔧 EMERGENCY: Using provided cursor position', cursorPosition);
    } else {
      // CRITICAL FIX: Get REAL cursor position from textarea
      cursorPosition = textareaRef.current.selectionStart || textToAnalyze.length;
      console.log('🔧 EMERGENCY: Using REAL textarea cursor position', cursorPosition);
    }
    
    console.log('📍 EMERGENCY: Analyzing text details', { 
      textToAnalyze: textToAnalyze,
      textSample: textToAnalyze.substring(Math.max(0, textToAnalyze.length - 20)),
      cursorPosition, 
      textLength: textToAnalyze.length,
      actualCursorFromTextarea: textareaRef.current.selectionStart,
      actualCursorEnd: textareaRef.current.selectionEnd
    });
    
    console.log('🎯 EMERGENCY: About to call findMentionQuery with', {
      textToAnalyze,
      cursorPosition,
      lastChar: textToAnalyze[cursorPosition - 1],
      before: textToAnalyze.substring(Math.max(0, cursorPosition - 5), cursorPosition),
      after: textToAnalyze.substring(cursorPosition, cursorPosition + 5)
    });
    
    const currentMentionQuery = findMentionQuery(textToAnalyze, cursorPosition);
    
    console.log('🔍 EMERGENCY: findMentionQuery result:', currentMentionQuery);
    
    if (currentMentionQuery) {
      console.log('✅ EMERGENCY: Mention query found, opening dropdown', currentMentionQuery);
      setMentionQuery(currentMentionQuery);
      setIsDropdownOpen(true);
      setSelectedIndex(0);
    } else {
      console.log('❌ EMERGENCY: No mention query, closing dropdown');
      setMentionQuery(null);
      setIsDropdownOpen(false);
      setSuggestions([]);
    }
  }, [value, textareaRef]);

  // CRITICAL FIX: Track if this is initial load with @ already present
  const isInitialAtLoad = React.useRef(false);
  React.useEffect(() => {
    if (value.includes('@') && !isInitialAtLoad.current) {
      isInitialAtLoad.current = true;
      console.log('🔄 CRITICAL: Initial @ detected, triggering mention state update');
      setTimeout(() => updateMentionState(value), 50);
    }
  }, [value, updateMentionState]);

  // Fetch suggestions based on query
  useEffect(() => {
    const fetchAgentSuggestions = async () => {
      console.log('🔄 DEBUG: Fetching suggestions', { mentionQuery, debouncedQuery, isDropdownOpen });
      
      // EMERGENCY FIX: Always try to fetch suggestions when dropdown should be open
      if (!isDropdownOpen) {
        console.log('⏹️ DEBUG: Skipping fetch - dropdown closed');
        return;
      }
      
      setIsLoading(true);
      try {
        let results: MentionSuggestion[];
        
        if (fetchSuggestions) {
          // Use custom fetch function if provided
          results = await fetchSuggestions(debouncedQuery || '');
        } else {
          // CRITICAL FIX: Always call searchMentions with empty string first
          if (!debouncedQuery || debouncedQuery.trim() === '') {
            console.log('🚨 CRITICAL FIX: Empty query, calling searchMentions with empty string');
            
            try {
              // CRITICAL: Call searchMentions with empty string - this should trigger the agents list
              const searchResults = await MentionService.searchMentions('', {
                maxSuggestions
              });
              
              // CRITICAL FIX: Validate results before using
              if (searchResults && Array.isArray(searchResults)) {
                results = searchResults;
                console.log('🚨 CRITICAL FIX: searchMentions("") result:', results.length, results.map(r => r.displayName));
              } else {
                console.error('🚨 EMERGENCY: searchMentions("") returned invalid result:', searchResults);
                results = [];
              }
            } catch (error) {
              console.error('🚨 EMERGENCY: Error calling searchMentions(""):', error);
              results = [];
            }
            
            // EMERGENCY FALLBACK 1: If searchMentions fails, try quick mentions
            if (results.length === 0) {
              console.log('🚨 EMERGENCY FALLBACK 1: searchMentions empty, trying getQuickMentions...');
              try {
                results = MentionService.getQuickMentions(mentionContext);
                console.log('📋 EMERGENCY DEBUG: Quick mentions result:', results);
              } catch (error) {
                console.error('🚨 EMERGENCY: Error calling getQuickMentions:', error);
                results = [];
              }
            }
            
            // EMERGENCY FALLBACK 2: If quick mentions fail, get all agents
            if (results.length === 0) {
              console.log('🚨 EMERGENCY FALLBACK 2: Quick mentions empty, trying getAllAgents...');
              try {
                const allAgents = MentionService.getAllAgents();
                console.log('📋 EMERGENCY DEBUG: getAllAgents result:', allAgents);
                results = allAgents.slice(0, maxSuggestions);
              } catch (error) {
                console.error('🚨 EMERGENCY: Error calling getAllAgents:', error);
                results = [];
              }
            }
            
            // ULTIMATE FALLBACK: If still no results, provide hardcoded agents
            if (results.length === 0) {
              console.log('🚨 ULTIMATE FALLBACK: Providing hardcoded agents');
              results = [
                {
                  id: 'fallback-assistant',
                  name: 'assistant',
                  displayName: 'Assistant',
                  description: 'AI Assistant (fallback)'
                },
                {
                  id: 'fallback-chief-of-staff',
                  name: 'chief-of-staff-agent',
                  displayName: 'Chief of Staff',
                  description: 'Strategic coordination (fallback)'
                },
                {
                  id: 'fallback-personal-todos',
                  name: 'personal-todos-agent',
                  displayName: 'Personal Todos',
                  description: 'Task management (fallback)'
                }
              ];
            }
          } else {
            // Search based on query
            console.log('🔍 EMERGENCY DEBUG: Searching mentions with query:', debouncedQuery);
            try {
              const searchResults = await MentionService.searchMentions(debouncedQuery, {
                maxSuggestions
              });
              
              // CRITICAL FIX: Validate search results
              if (searchResults && Array.isArray(searchResults)) {
                results = searchResults;
                console.log('🔍 EMERGENCY DEBUG: Search results valid:', results.length, results.map(r => r.displayName));
              } else {
                console.error('🚨 EMERGENCY: searchMentions returned invalid result for query:', debouncedQuery, searchResults);
                results = [];
              }
            } catch (error) {
              console.error('🚨 EMERGENCY: Error in searchMentions with query:', debouncedQuery, error);
              results = [];
            }
            
            // EMERGENCY FALLBACK: If no search results, show quick mentions
            if (results.length === 0) {
              console.log('🚨 EMERGENCY: Search returned empty, fallback to quick mentions');
              try {
                const fallbackResults = MentionService.getQuickMentions(mentionContext);
                if (fallbackResults && Array.isArray(fallbackResults)) {
                  results = fallbackResults;
                  console.log('🚨 EMERGENCY FALLBACK: Using quick mentions:', results.length);
                } else {
                  console.error('🚨 EMERGENCY: getQuickMentions returned invalid result:', fallbackResults);
                  results = [];
                }
              } catch (error) {
                console.error('🚨 EMERGENCY: Error in fallback getQuickMentions:', error);
                results = [];
              }
            }
          }
        }
        
        // CRITICAL FIX: Validate results before logging and setting
        if (results && Array.isArray(results)) {
          console.log('📊 EMERGENCY DEBUG: Got suggestions:', results.length, results.map(r => r ? r.displayName : 'INVALID'));
          // CRITICAL FIX: Ensure we always have suggestions for empty queries
          if (results.length === 0 && (!debouncedQuery || debouncedQuery.trim() === '')) {
            console.log('🚨 CRITICAL FALLBACK: No results for empty query, trying getAllAgents');
            try {
              const allAgents = MentionService.getAllAgents();
              results = allAgents.slice(0, maxSuggestions);
              console.log('🚨 CRITICAL FALLBACK: Using getAllAgents, got:', results.length);
            } catch (fallbackError) {
              console.error('🚨 CRITICAL FALLBACK ERROR:', fallbackError);
            }
          }
          
          const finalResults = results.slice(0, maxSuggestions);
          setSuggestions(finalResults);
          console.log('✅ FINAL SUGGESTIONS SET:', finalResults.length, finalResults.map(r => r.displayName));
        } else {
          console.error('🚨 CRITICAL: Final results is not an array:', results);
          setSuggestions([]);
        }
        setSelectedIndex(0);
      } catch (error) {
        console.error('❌ EMERGENCY DEBUG: Error fetching agent suggestions:', error);
        // EMERGENCY FALLBACK: Provide hardcoded suggestions
        const emergencyFallback: MentionSuggestion[] = [
          {
            id: 'emergency-agent-1',
            name: 'chief-of-staff-agent',
            displayName: 'Chief of Staff',
            description: 'Emergency fallback agent'
          },
          {
            id: 'emergency-agent-2',
            name: 'personal-todos-agent',
            displayName: 'Personal Todos',
            description: 'Emergency fallback agent'
          }
        ];
        console.log('🚨 EMERGENCY: Using hardcoded fallback agents');
        setSuggestions(emergencyFallback);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentSuggestions();
  }, [debouncedQuery, fetchSuggestions, maxSuggestions, mentionQuery, mentionContext, isDropdownOpen]);

  // Handle mention selection
  const handleMentionSelect = useCallback((mention: MentionSuggestion) => {
    if (!textareaRef.current || !mentionQuery) return;

    const beforeMention = value.substring(0, mentionQuery.startIndex);
    const afterMention = value.substring(getCursorPosition(textareaRef.current));
    const mentionText = `@${mention.name}`;
    
    const newValue = beforeMention + mentionText + ' ' + afterMention;
    const newCursorPosition = mentionQuery.startIndex + mentionText.length + 1;

    onChange(newValue);
    onMentionSelect?.(mention);
    
    // Close dropdown
    setIsDropdownOpen(false);
    setMentionQuery(null);
    setSuggestions([]);

    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        setCursorPosition(textareaRef.current, newCursorPosition);
      }
    }, 0);
  }, [value, mentionQuery, onChange, onMentionSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      // Handle submit on Enter when not in mention mode
      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
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
  }, [isDropdownOpen, suggestions, selectedIndex, handleMentionSelect, onSubmit, value]);

  // Update mention state on cursor change
  const handleSelectionChange = useCallback(() => {
    // Use requestAnimationFrame to ensure cursor position is updated
    requestAnimationFrame(() => {
      updateMentionState();
    });
  }, [updateMentionState]);

  // Handle input change - CRITICAL FIX: Ensure onChange is called properly
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const actualCursorPosition = e.target.selectionStart || 0;
    
    console.log('🔤 EMERGENCY INPUT: Value changed', { 
      newValue: newValue.substring(Math.max(0, newValue.length - 20)),
      length: newValue.length,
      hasAt: newValue.includes('@'),
      cursor: actualCursorPosition,
      fullValue: newValue
    });
    
    // Apply max length if specified
    if (maxLength && newValue.length > maxLength) {
      console.log('⚠️ EMERGENCY: Max length exceeded, blocking input');
      return;
    }
    
    // CRITICAL FIX: Always call onChange first to ensure parent state updates
    onChange(newValue);
    
    // CRITICAL FIX: Call updateMentionState immediately with current values
    console.log('🔄 EMERGENCY: Triggering mention state update with LIVE values');
    updateMentionState(newValue, actualCursorPosition);
  }, [onChange, maxLength, updateMentionState]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !textareaRef.current?.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setMentionQuery(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (suggestionsListRef.current && isDropdownOpen) {
      const selectedElement = suggestionsListRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isDropdownOpen]);

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
        rows={rows}
        autoFocus={autoFocus}
        data-mention-context={mentionContext}
        aria-label={ariaLabel || "Compose message with agent mentions"}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        className={cn(
          "w-full px-4 py-3 border border-gray-200 rounded-lg resize-none",
          "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "placeholder-gray-500 text-gray-900",
          "transition-colors duration-200",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50",
          className
        )}
      />

      {/* Character count */}
      {maxLength && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {value.length}/{maxLength}
        </div>
      )}

      {/* 🚨 MESH NETWORK FIX: Force dropdown rendering with emergency debug */}
      {(isDropdownOpen || mentionQuery) && (
        <div
          ref={dropdownRef}
          data-testid="mention-debug-dropdown"
          className={cn(
            "absolute z-[99999] mt-1 w-full max-w-sm bg-white border-2 border-blue-300 rounded-lg shadow-2xl",
            "max-h-64 overflow-y-auto",
            "transform-gpu will-change-transform",
            dropdownClassName
          )}
          role="listbox"
          aria-label="Agent suggestions"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 99999,
            boxShadow: '0 20px 50px -3px rgba(0, 0, 0, 0.3), 0 8px 16px -2px rgba(0, 0, 0, 0.2)',
            backgroundColor: 'white',
            border: '3px solid #007bff',
            display: 'block',
            visibility: 'visible'
          }}
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
                  data-testid={`agent-debug-info-${suggestion.id}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-colors duration-150",
                    "flex items-center space-x-3",
                    index === selectedIndex 
                      ? "bg-blue-50 text-blue-900" 
                      : "hover:bg-gray-50 text-gray-900",
                    suggestionClassName
                  )}
                  onClick={() => handleMentionSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex-shrink-0">
                    {suggestion.avatar ? (
                      <img 
                        src={suggestion.avatar} 
                        alt={suggestion.displayName}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
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
          
          {/* Dropdown footer with hint */}
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 flex items-center justify-between">
            <span>Type @ to mention agents</span>
            <div className="flex items-center space-x-2">
              <ChevronUp className="w-3 h-3" />
              <ChevronDown className="w-3 h-3" />
              <span>Navigate</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">↵</kbd>
              <span>Select</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MentionInput.displayName = 'MentionInput';

export type { MentionInputProps, MentionInputRef };