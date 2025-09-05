import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectInputProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxItems?: number;
  allowCustom?: boolean;
  loading?: boolean;
  onSearch?: (query: string) => void;
  searchQuery?: string;
  emptyMessage?: string;
}

const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  options,
  value,
  onChange,
  placeholder = "Type to search and select...",
  className = '',
  maxItems,
  allowCustom = false,
  loading = false,
  onSearch,
  searchQuery = '',
  emptyMessage = "No options found"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(inputValue.toLowerCase()) &&
    !value.includes(option.value)
  );

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setInputValue('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setHighlightedIndex(-1);
    setIsOpen(true);
    
    // Trigger external search if provided
    if (onSearch) {
      onSearch(newValue);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          selectOption(filteredOptions[highlightedIndex]);
        } else if (allowCustom && inputValue.trim() && !options.find(opt => opt.value === inputValue.trim())) {
          // Add custom option
          const customOption = {
            value: inputValue.trim(),
            label: inputValue.trim()
          };
          selectOption(customOption);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setInputValue('');
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      
      case 'Backspace':
        if (inputValue === '' && value.length > 0) {
          // Remove last selected item
          onChange(value.slice(0, -1));
        }
        break;
    }
  };

  // Select an option
  const selectOption = (option: MultiSelectOption) => {
    if (maxItems && value.length >= maxItems) {
      return;
    }
    
    if (!value.includes(option.value)) {
      onChange([...value, option.value]);
    }
    
    setInputValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Remove selected option
  const removeOption = (valueToRemove: string) => {
    onChange(value.filter(v => v !== valueToRemove));
  };

  // Get display label for selected value
  const getOptionLabel = (optionValue: string) => {
    const option = options.find(opt => opt.value === optionValue);
    return option ? option.label : optionValue;
  };

  // Get display color for selected value
  const getOptionColor = (optionValue: string) => {
    const option = options.find(opt => opt.value === optionValue);
    return option?.color;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Input Container */}
      <div 
        className={`
          flex flex-wrap items-center gap-2 p-2 border border-gray-200 rounded-lg bg-white 
          focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 
          min-h-[44px] cursor-text transition-colors
          ${maxItems && value.length >= maxItems ? 'opacity-60' : ''}
        `}
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        {/* Selected Items as Chips */}
        {value.map((selectedValue) => {
          const color = getOptionColor(selectedValue);
          return (
            <div
              key={selectedValue}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium
                ${color ? `bg-${color}-100 text-${color}-800` : 'bg-blue-100 text-blue-800'}
                hover:bg-opacity-80 transition-colors
              `}
            >
              <span>{getOptionLabel(selectedValue)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(selectedValue);
                }}
                className="ml-1 hover:bg-white hover:bg-opacity-50 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${getOptionLabel(selectedValue)}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Input Field */}
        <div className="flex items-center flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 outline-none bg-transparent text-sm"
            disabled={maxItems && value.length >= maxItems}
          />
          
          {loading ? (
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          ) : (
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {/* Search Result Count */}
            {inputValue && (
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                {loading ? 'Searching...' : `${filteredOptions.length} result${filteredOptions.length !== 1 ? 's' : ''}`}
              </div>
            )}

            {/* Options List */}
            {filteredOptions.length > 0 ? (
              <div className="py-1">
                {filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => selectOption(option)}
                    className={`
                      flex items-center w-full px-3 py-2 text-left text-sm transition-colors
                      ${index === highlightedIndex 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {option.color && (
                      <div 
                        className={`w-3 h-3 rounded-full mr-2 bg-${option.color}-500`}
                      />
                    )}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    Searching...
                  </div>
                ) : inputValue && allowCustom ? (
                  <div>
                    <div className="mb-2">{emptyMessage}</div>
                    <button
                      onClick={() => selectOption({ value: inputValue.trim(), label: inputValue.trim() })}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Add "{inputValue}"
                    </button>
                  </div>
                ) : (
                  emptyMessage
                )}
              </div>
            )}

            {/* Max Items Warning */}
            {maxItems && value.length >= maxItems && (
              <div className="px-3 py-2 text-xs text-amber-600 bg-amber-50 border-t border-amber-100">
                Maximum {maxItems} item{maxItems !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MultiSelectInput;