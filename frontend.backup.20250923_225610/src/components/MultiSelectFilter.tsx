/**
 * Multi-Select Filter Component
 * 
 * Implements the London School TDD approach with behavior-driven functionality
 * Supports type-to-add, multiple selection, and apply/cancel patterns
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, X, Check, Plus } from 'lucide-react';

export interface MultiSelectFilterProps {
  type: 'agent' | 'hashtag';
  available: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  onTypeToAdd: (newItem: string) => void;
  onApply: () => void;
  onCancel: () => void;
  isOpen: boolean;
  maxSelections?: number;
  allowCustomItems?: boolean;
  placeholder?: string;
  className?: string;
}

interface FilterItem {
  id: string;
  label: string;
  selected: boolean;
  isCustom?: boolean;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  type,
  available,
  selected,
  onSelectionChange,
  onTypeToAdd,
  onApply,
  onCancel,
  isOpen,
  maxSelections = 50,
  allowCustomItems = true,
  placeholder,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSelections, setPendingSelections] = useState<string[]>(selected);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset pending selections when props change
  useEffect(() => {
    setPendingSelections(selected);
  }, [selected]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Generate placeholder text
  const defaultPlaceholder = useMemo(() => {
    const itemType = type === 'agent' ? 'agent' : 'hashtag';
    return placeholder || `Type to add new ${itemType}...`;
  }, [type, placeholder]);

  // Combine available and custom items
  const allItems = useMemo((): FilterItem[] => {
    const availableItems = available.map(item => ({
      id: item,
      label: type === 'hashtag' && !item.startsWith('#') ? `#${item}` : item,
      selected: pendingSelections.includes(item),
      isCustom: false
    }));

    const customItemsFiltered = customItems
      .filter(item => !available.includes(item))
      .map(item => ({
        id: item,
        label: type === 'hashtag' && !item.startsWith('#') ? `#${item}` : item,
        selected: pendingSelections.includes(item),
        isCustom: true
      }));

    return [...availableItems, ...customItemsFiltered];
  }, [available, customItems, pendingSelections, type]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return allItems;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allItems.filter(item => 
      item.label.toLowerCase().includes(lowerSearchTerm) ||
      item.id.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allItems, searchTerm]);

  // Check if search term could be a new item
  const canAddNewItem = useMemo(() => {
    if (!searchTerm || !allowCustomItems) return false;
    
    const normalizedSearchTerm = type === 'hashtag' && searchTerm.startsWith('#') 
      ? searchTerm.slice(1) 
      : searchTerm;
    
    // Check if item already exists
    const itemExists = allItems.some(item => 
      item.id.toLowerCase() === normalizedSearchTerm.toLowerCase()
    );
    
    return !itemExists && normalizedSearchTerm.length >= 2;
  }, [searchTerm, allItems, allowCustomItems, type]);

  // Toggle item selection
  const toggleItemSelection = useCallback((itemId: string) => {
    setPendingSelections(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        if (prev.length >= maxSelections) {
          return prev; // Don't add if at max
        }
        return [...prev, itemId];
      }
    });
  }, [maxSelections]);

  // Add new custom item
  const addNewItem = useCallback(async () => {
    if (!canAddNewItem) return;
    
    setIsValidating(true);
    
    try {
      const normalizedItem = type === 'hashtag' && searchTerm.startsWith('#') 
        ? searchTerm.slice(1) 
        : searchTerm;
      
      // Add to custom items
      setCustomItems(prev => [...prev, normalizedItem]);
      
      // Add to pending selections
      setPendingSelections(prev => [...prev, normalizedItem]);
      
      // Clear search term
      setSearchTerm('');
      
      // Notify parent
      onTypeToAdd(normalizedItem);
    } catch (error) {
      console.error('Failed to add new item:', error);
    } finally {
      setIsValidating(false);
    }
  }, [canAddNewItem, searchTerm, type, onTypeToAdd]);

  // Handle apply changes
  const handleApply = useCallback(() => {
    onSelectionChange(pendingSelections);
    onApply();
  }, [pendingSelections, onSelectionChange, onApply]);

  // Handle cancel changes
  const handleCancel = useCallback(() => {
    setPendingSelections(selected);
    setSearchTerm('');
    onCancel();
  }, [selected, onCancel]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        handleCancel();
        break;
      case 'Enter':
        if (canAddNewItem) {
          e.preventDefault();
          addNewItem();
        } else if (filteredItems.length === 1) {
          e.preventDefault();
          toggleItemSelection(filteredItems[0].id);
        }
        break;
    }
  }, [handleCancel, canAddNewItem, addNewItem, filteredItems, toggleItemSelection]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleCancel]);

  if (!isOpen) return null;

  const hasChanges = JSON.stringify(pendingSelections) !== JSON.stringify(selected);

  return (
    <div 
      ref={containerRef}
      className={`absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30 ${className}`}
      data-testid={`${type}-multi-select`}
      role="listbox"
      aria-label={`Select multiple ${type}s`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">
          Select {type === 'agent' ? 'Agents' : 'Hashtags'}
        </h3>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={defaultPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid={`${type}-type-to-add`}
            aria-label={`Search or add new ${type}`}
          />
          
          {/* Add New Item Button */}
          {canAddNewItem && (
            <button
              type="button"
              onClick={addNewItem}
              disabled={isValidating}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
              title={`Add "${searchTerm}"`}
              aria-label={`Add new ${type}: ${searchTerm}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Selection Count */}
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
          <span>
            {pendingSelections.length} of {maxSelections} selected
          </span>
          {pendingSelections.length > 0 && (
            <button
              type="button"
              onClick={() => setPendingSelections([])}
              className="text-red-600 hover:text-red-700"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="max-h-64 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? `No ${type}s found matching "${searchTerm}"` : `No ${type}s available`}
          </div>
        ) : (
          <div className="p-2">
            {filteredItems.map((item) => (
              <label
                key={item.id}
                className={`
                  flex items-center w-full px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50
                  ${item.selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                `}
                data-testid={`${type}-item-${item.id}`}
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItemSelection(item.id)}
                    className="sr-only"
                    aria-label={`Select ${item.label}`}
                  />
                  <div className={`
                    w-4 h-4 rounded border-2 mr-3 flex items-center justify-center
                    ${item.selected 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300'
                    }
                  `}>
                    {item.selected && <Check className="w-3 h-3" />}
                  </div>
                </div>
                
                <span className="flex-grow">{item.label}</span>
                
                {item.isCustom && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    Custom
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 flex justify-between items-center">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          data-testid="filter-cancel-button"
        >
          Cancel
        </button>
        
        <button
          type="button"
          onClick={handleApply}
          disabled={!hasChanges}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${hasChanges 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
          data-testid="filter-apply-button"
        >
          Apply {pendingSelections.length > 0 && `(${pendingSelections.length})`}
        </button>
      </div>
    </div>
  );
};

export default MultiSelectFilter;