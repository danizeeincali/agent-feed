import React, { useState, useMemo, useCallback } from 'react';
import { DayPicker, DateRange, Matcher } from 'react-day-picker';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../../services/api';
import 'react-day-picker/dist/style.css';

/**
 * Calendar component props interface
 * Supports single, multiple, and range date selection modes
 */
interface CalendarProps {
  /** Selection mode: single date, multiple dates, or date range */
  mode?: 'single' | 'multiple' | 'range';
  /** Initial selected date in ISO format (YYYY-MM-DD) */
  selectedDate?: string;
  /** Array of events to display on calendar dates */
  events?: Array<{
    date: string;
    title: string;
    description?: string;
  }>;
  /** API endpoint to call when dates are selected */
  onDateSelect?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Production-ready Calendar component using react-day-picker
 *
 * Features:
 * - Single, multiple, and range date selection
 * - Event indicators on dates
 * - API integration for date selection callbacks
 * - Accessible with ARIA labels
 * - Mobile-responsive with touch support
 * - Tailwind CSS styling matching app theme
 *
 * @example
 * ```tsx
 * <Calendar
 *   mode="range"
 *   events={[
 *     { date: '2025-10-15', title: 'Meeting', description: 'Team sync' }
 *   ]}
 *   onDateSelect="/api/calendar/select"
 * />
 * ```
 */
const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selectedDate,
  events = [],
  onDateSelect,
  className = '',
}) => {
  // State management for different selection modes
  const [selected, setSelected] = useState<Date | Date[] | DateRange | undefined>(() => {
    if (!selectedDate) return undefined;

    try {
      const date = parseISO(selectedDate);
      if (isValid(date)) {
        return mode === 'multiple' ? [date] : date;
      }
    } catch (error) {
      console.error('Invalid selectedDate format:', error);
    }

    return undefined;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse and validate events
  const eventDates = useMemo(() => {
    const dateMap = new Map<string, Array<{ title: string; description?: string }>>();

    events.forEach(event => {
      try {
        const date = parseISO(event.date);
        if (isValid(date)) {
          const dateKey = format(date, 'yyyy-MM-dd');
          const existing = dateMap.get(dateKey) || [];
          existing.push({ title: event.title, description: event.description });
          dateMap.set(dateKey, existing);
        }
      } catch (error) {
        console.error('Invalid event date:', event.date, error);
      }
    });

    return dateMap;
  }, [events]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date): Array<{ title: string; description?: string }> => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventDates.get(dateKey) || [];
  }, [eventDates]);

  // Check if a date has events
  const hasEvents = useCallback((date: Date): boolean => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventDates.has(dateKey);
  }, [eventDates]);

  // Handle date selection with API callback
  const handleDateSelect = useCallback(async (newSelected: Date | Date[] | DateRange | undefined) => {
    setSelected(newSelected);
    setError(null);

    // Call API endpoint if provided
    if (onDateSelect && newSelected) {
      setIsLoading(true);

      try {
        let payload: Record<string, any> = { mode };

        // Format payload based on selection mode
        if (mode === 'single' && newSelected instanceof Date) {
          payload.selectedDate = format(newSelected, 'yyyy-MM-dd');
        } else if (mode === 'multiple' && Array.isArray(newSelected)) {
          payload.selectedDates = newSelected.map(date => format(date, 'yyyy-MM-dd'));
        } else if (mode === 'range' && newSelected && typeof newSelected === 'object' && 'from' in newSelected) {
          const range = newSelected as DateRange;
          payload.from = range.from ? format(range.from, 'yyyy-MM-dd') : null;
          payload.to = range.to ? format(range.to, 'yyyy-MM-dd') : null;
        }

        // Make API call
        const response = await fetch(onDateSelect, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Date selection API response:', data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send date selection';
        setError(errorMessage);
        console.error('Error calling onDateSelect API:', err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [mode, onDateSelect]);

  // Custom day content renderer to show event indicators
  const renderDay = useCallback((date: Date) => {
    const dayEvents = getEventsForDate(date);
    const hasEventIndicator = dayEvents.length > 0;

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span className="relative z-10">{format(date, 'd')}</span>
        {hasEventIndicator && (
          <div
            className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5"
            aria-label={`${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}`}
          >
            {dayEvents.slice(0, 3).map((_, index) => (
              <div
                key={index}
                className="w-1 h-1 rounded-full bg-primary-500"
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [getEventsForDate]);

  // Modifiers for styling dates with events
  const modifiers: Record<string, Matcher> = useMemo(() => ({
    hasEvents: (date: Date) => hasEvents(date),
  }), [hasEvents]);

  const modifiersClassNames: Record<string, string> = {
    hasEvents: 'rdp-day_has-events font-semibold',
  };

  return (
    <div className={`calendar-container ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
          <div className="flex items-center gap-2 text-primary-700">
            <CalendarIcon className="w-5 h-5" />
            <h3 className="font-semibold text-sm">
              {mode === 'single' && 'Select a date'}
              {mode === 'multiple' && 'Select multiple dates'}
              {mode === 'range' && 'Select a date range'}
            </h3>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="p-4">
          <DayPicker
            mode={mode}
            selected={selected}
            onSelect={handleDateSelect as any}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            showOutsideDays
            className="calendar-day-picker"
            classNames={{
              months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
              month: 'space-y-4',
              caption: 'flex justify-center pt-1 relative items-center',
              caption_label: 'text-sm font-medium text-gray-900',
              nav: 'space-x-1 flex items-center',
              nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-gray-100 rounded-md transition-colors inline-flex items-center justify-center',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse space-y-1',
              head_row: 'flex',
              head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
              row: 'flex w-full mt-2',
              cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
              day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md transition-colors inline-flex items-center justify-center',
              day_selected: 'bg-primary-600 text-white hover:bg-primary-700 hover:text-white focus:bg-primary-700 focus:text-white',
              day_today: 'bg-gray-100 text-gray-900 font-semibold',
              day_outside: 'text-gray-400 opacity-50',
              day_disabled: 'text-gray-400 opacity-50 cursor-not-allowed',
              day_range_middle: 'aria-selected:bg-primary-100 aria-selected:text-gray-900',
              day_hidden: 'invisible',
            }}
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
              DayContent: ({ date }) => renderDay(date),
            }}
            disabled={isLoading}
          />
        </div>

        {/* Selected Date Display */}
        {selected && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm">
              <span className="text-gray-600 font-medium">Selected: </span>
              <span className="text-gray-900">
                {mode === 'single' && selected instanceof Date && format(selected, 'PPP')}
                {mode === 'multiple' && Array.isArray(selected) &&
                  selected.map(date => format(date, 'PPP')).join(', ')}
                {mode === 'range' && selected && typeof selected === 'object' && 'from' in selected && (
                  <>
                    {selected.from && format(selected.from, 'PPP')}
                    {selected.to && ` - ${format(selected.to, 'PPP')}`}
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Event List for Selected Date */}
        {mode === 'single' && selected instanceof Date && getEventsForDate(selected).length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Events on this date
            </h4>
            <div className="space-y-2">
              {getEventsForDate(selected).map((event, index) => (
                <div
                  key={index}
                  className="bg-primary-50 border border-primary-200 rounded-md p-2"
                >
                  <div className="font-medium text-sm text-primary-900">{event.title}</div>
                  {event.description && (
                    <div className="text-xs text-primary-700 mt-1">{event.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="px-4 py-2 border-t border-gray-200 bg-blue-50">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
              <span>Saving selection...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="px-4 py-2 border-t border-gray-200 bg-red-50">
            <div className="text-sm text-red-700">
              <span className="font-medium">Error: </span>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS for additional styling */}
      <style>{`
        .calendar-day-picker {
          width: 100%;
        }

        .calendar-day-picker .rdp-day_has-events {
          position: relative;
        }

        /* Mobile touch optimization */
        @media (max-width: 640px) {
          .calendar-day-picker .rdp-day {
            height: 2.5rem;
            width: 2.5rem;
            font-size: 0.875rem;
          }

          .calendar-day-picker .rdp-head_cell {
            width: 2.5rem;
          }
        }

        /* High contrast for accessibility */
        @media (prefers-contrast: high) {
          .calendar-day-picker .rdp-day_selected {
            outline: 2px solid currentColor;
            outline-offset: 2px;
          }
        }

        /* Focus visible for keyboard navigation */
        .calendar-day-picker .rdp-day:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          z-index: 10;
        }

        /* Smooth transitions */
        .calendar-day-picker .rdp-day,
        .calendar-day-picker .rdp-nav_button {
          transition: background-color 0.2s ease, color 0.2s ease, transform 0.1s ease;
        }

        .calendar-day-picker .rdp-day:active {
          transform: scale(0.95);
        }

        /* Range selection styling */
        .calendar-day-picker .rdp-day_range_start {
          border-top-right-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
        }

        .calendar-day-picker .rdp-day_range_end {
          border-top-left-radius: 0 !important;
          border-bottom-left-radius: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default Calendar;
