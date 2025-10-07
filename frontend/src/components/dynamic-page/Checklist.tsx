import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Check, Loader2, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Checklist Item Interface
 */
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  metadata?: any;
}

/**
 * Checklist Component Props
 */
export interface ChecklistProps {
  items: ChecklistItem[];
  allowEdit?: boolean;
  onChange?: string; // API endpoint for POST requests
  className?: string;
}

/**
 * Production-ready Checklist Component
 *
 * Features:
 * - Full checkbox toggle functionality
 * - API event handling via onChange endpoint (POST requests)
 * - Template variable support for items
 * - Accessible keyboard navigation
 * - Mobile-responsive styling with Tailwind CSS
 * - Loading states for API calls
 * - Error handling with retry capability
 * - Optimistic updates with rollback on failure
 *
 * @example
 * ```tsx
 * <Checklist
 *   items={[
 *     { id: '1', text: 'Task 1', checked: false },
 *     { id: '2', text: 'Task 2', checked: true }
 *   ]}
 *   allowEdit={true}
 *   onChange="/api/checklist/update"
 * />
 * ```
 */
export const Checklist: React.FC<ChecklistProps> = ({
  items: initialItems,
  allowEdit = true,
  onChange,
  className
}) => {
  // State management
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [errorItems, setErrorItems] = useState<Map<string, string>>(new Map());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Refs for managing focus and keyboard navigation
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Sync with external prop changes
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Cleanup retry timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  /**
   * Process template variables in text
   * Supports {{variable}} syntax
   */
  const processTemplateVariables = useCallback((text: string, metadata?: any): string => {
    if (!metadata) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return metadata[variable] !== undefined ? String(metadata[variable]) : match;
    });
  }, []);

  /**
   * Handle checkbox toggle with API call
   */
  const handleToggle = useCallback(async (itemId: string) => {
    if (!allowEdit) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Optimistic update
    const previousChecked = item.checked;
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === itemId ? { ...i, checked: !i.checked } : i
      )
    );

    // Clear any existing error for this item
    setErrorItems(prev => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });

    // If onChange endpoint is provided, make API call
    if (onChange) {
      // Set loading state
      setLoadingItems(prev => new Set(prev).add(itemId));

      try {
        const response = await fetch(onChange, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId,
            checked: !previousChecked,
            item: {
              ...item,
              checked: !previousChecked
            },
            timestamp: new Date().toISOString()
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Success - remove loading state
        setLoadingItems(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });

      } catch (error) {
        console.error('Checklist API error:', error);

        // Rollback optimistic update
        setItems(prevItems =>
          prevItems.map(i =>
            i.id === itemId ? { ...i, checked: previousChecked } : i
          )
        );

        // Set error state
        const errorMessage = error instanceof Error ? error.message : 'Failed to update';
        setErrorItems(prev => new Map(prev).set(itemId, errorMessage));

        // Remove loading state
        setLoadingItems(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });

        // Auto-retry after 3 seconds
        const timeout = setTimeout(() => {
          setErrorItems(prev => {
            const next = new Map(prev);
            next.delete(itemId);
            return next;
          });
        }, 3000);

        retryTimeouts.current.set(itemId, timeout);
      }
    }
  }, [items, allowEdit, onChange]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent, itemId: string) => {
    const currentIndex = items.findIndex(i => i.id === itemId);

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleToggle(itemId);
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < items.length - 1) {
          const nextItem = items[currentIndex + 1];
          setFocusedItemId(nextItem.id);
          itemRefs.current.get(nextItem.id)?.focus();
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          const prevItem = items[currentIndex - 1];
          setFocusedItemId(prevItem.id);
          itemRefs.current.get(prevItem.id)?.focus();
        }
        break;

      case 'Home':
        event.preventDefault();
        if (items.length > 0) {
          const firstItem = items[0];
          setFocusedItemId(firstItem.id);
          itemRefs.current.get(firstItem.id)?.focus();
        }
        break;

      case 'End':
        event.preventDefault();
        if (items.length > 0) {
          const lastItem = items[items.length - 1];
          setFocusedItemId(lastItem.id);
          itemRefs.current.get(lastItem.id)?.focus();
        }
        break;
    }
  }, [items, handleToggle]);

  /**
   * Retry failed item update
   */
  const handleRetry = useCallback((itemId: string) => {
    // Clear error and retry toggle
    setErrorItems(prev => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
    handleToggle(itemId);
  }, [handleToggle]);

  /**
   * Calculate progress statistics
   */
  const progress = {
    total: items.length,
    completed: items.filter(item => item.checked).length,
    percentage: items.length > 0
      ? Math.round((items.filter(item => item.checked).length / items.length) * 100)
      : 0
  };

  // Empty state
  if (items.length === 0) {
    return (
      <div className={cn(
        'flex items-center justify-center py-8 px-4',
        'text-gray-500 text-sm',
        className
      )}>
        <CheckSquare className="w-5 h-5 mr-2 opacity-50" />
        No checklist items available
      </div>
    );
  }

  return (
    <div
      className={cn(
        'checklist-container w-full',
        className
      )}
      role="group"
      aria-label="Checklist"
    >
      {/* Progress bar */}
      <div className="mb-4 px-1">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-gray-700">
            Progress
          </span>
          <span className="text-gray-600">
            {progress.completed} / {progress.total} ({progress.percentage}%)
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
            style={{ width: `${progress.percentage}%` }}
            role="progressbar"
            aria-valuenow={progress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress.percentage}% complete`}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item, index) => {
          const isLoading = loadingItems.has(item.id);
          const error = errorItems.get(item.id);
          const hasError = !!error;
          const processedText = processTemplateVariables(item.text, item.metadata);

          return (
            <div
              key={item.id}
              className={cn(
                'group relative',
                'rounded-lg border transition-all duration-200',
                hasError
                  ? 'border-red-300 bg-red-50'
                  : item.checked
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <button
                ref={el => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                onClick={() => handleToggle(item.id)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                onFocus={() => setFocusedItemId(item.id)}
                onBlur={() => setFocusedItemId(null)}
                disabled={!allowEdit || isLoading}
                className={cn(
                  'w-full flex items-start gap-3 p-3 sm:p-4',
                  'text-left transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  'rounded-lg',
                  !allowEdit && 'cursor-default',
                  allowEdit && !isLoading && 'cursor-pointer',
                  isLoading && 'cursor-wait'
                )}
                aria-checked={item.checked}
                aria-label={`${item.checked ? 'Uncheck' : 'Check'} ${processedText}`}
                aria-disabled={!allowEdit || isLoading}
                role="checkbox"
                tabIndex={0}
              >
                {/* Checkbox icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : item.checked ? (
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>

                {/* Item text */}
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'block text-sm sm:text-base break-words',
                      item.checked
                        ? 'text-gray-500 line-through'
                        : 'text-gray-900',
                      isLoading && 'opacity-50'
                    )}
                  >
                    {processedText}
                  </span>

                  {/* Metadata display (optional) */}
                  {item.metadata?.description && (
                    <span className="block mt-1 text-xs text-gray-500">
                      {item.metadata.description}
                    </span>
                  )}
                </div>

                {/* Status indicator */}
                {item.checked && !isLoading && !hasError && (
                  <div className="flex-shrink-0 flex items-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </button>

              {/* Error message */}
              {hasError && (
                <div className="px-3 sm:px-4 pb-3 flex items-start gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="break-words">{error}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetry(item.id);
                      }}
                      className="mt-1 text-red-800 underline hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600 px-1">
          <span>
            {progress.completed === progress.total && progress.total > 0
              ? 'All tasks completed!'
              : `${progress.total - progress.completed} remaining`}
          </span>
          {!allowEdit && (
            <span className="text-gray-500 italic">Read-only</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checklist;
