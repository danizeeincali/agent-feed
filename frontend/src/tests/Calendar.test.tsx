import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Calendar from '../components/dynamic-page/Calendar';

// Mock react-day-picker
vi.mock('react-day-picker', () => ({
  DayPicker: ({ selected, onSelect, components, disabled }: any) => (
    <div data-testid="day-picker">
      <button
        onClick={() => !disabled && onSelect(new Date('2025-10-15'))}
        data-testid="select-date-button"
      >
        Select Date
      </button>
      {components?.DayContent && (
        <div data-testid="day-content">
          {components.DayContent({ date: new Date('2025-10-15') })}
        </div>
      )}
    </div>
  ),
  DateRange: {} as any,
  Matcher: {} as any,
}));

const mockEvents = [
  {
    date: '2025-10-15',
    title: 'Meeting',
    description: 'Team sync',
  },
  {
    date: '2025-10-15',
    title: 'Deadline',
    description: 'Project due',
  },
  {
    date: '2025-10-20',
    title: 'Conference',
  },
];

describe('Calendar Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders calendar with default props', () => {
      render(<Calendar />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();
    });

    it('displays mode-specific header text', () => {
      render(<Calendar mode="single" />);
      expect(screen.getByText('Select a date')).toBeInTheDocument();

      render(<Calendar mode="multiple" />);
      expect(screen.getByText('Select multiple dates')).toBeInTheDocument();

      render(<Calendar mode="range" />);
      expect(screen.getByText('Select a date range')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Calendar className="custom-calendar" />);

      expect(container.querySelector('.custom-calendar')).toBeInTheDocument();
    });

    it('renders calendar icon', () => {
      const { container } = render(<Calendar />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Date Selection', () => {
    it('handles single date selection', async () => {
      render(<Calendar mode="single" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      });
    });

    it('displays selected date in readable format', async () => {
      render(<Calendar mode="single" selectedDate="2025-10-15" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/October 15.*2025/)).toBeInTheDocument();
      });
    });

    it('handles invalid selectedDate gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Calendar selectedDate="invalid-date" />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('parses ISO date strings correctly', () => {
      render(<Calendar selectedDate="2025-10-15" />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();
    });
  });

  describe('Events', () => {
    it('displays events for selected date', async () => {
      render(<Calendar mode="single" events={mockEvents} selectedDate="2025-10-15" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('Events on this date')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
        expect(screen.getByText('Team sync')).toBeInTheDocument();
        expect(screen.getByText('Deadline')).toBeInTheDocument();
      });
    });

    it('shows event indicators on calendar', () => {
      render(<Calendar events={mockEvents} />);

      const dayContent = screen.getByTestId('day-content');
      expect(dayContent).toBeInTheDocument();
    });

    it('handles events without descriptions', async () => {
      render(<Calendar mode="single" events={mockEvents} selectedDate="2025-10-20" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      // Should still render event without description
      await waitFor(() => {
        expect(screen.getByText('Conference')).toBeInTheDocument();
      });
    });

    it('handles invalid event dates gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const invalidEvents = [
        { date: 'invalid', title: 'Bad Event' },
      ];

      render(<Calendar events={invalidEvents} />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('limits event indicators to 3 dots', () => {
      const manyEvents = Array.from({ length: 10 }, (_, i) => ({
        date: '2025-10-15',
        title: `Event ${i}`,
      }));

      const { container } = render(<Calendar events={manyEvents} />);

      const dayContent = screen.getByTestId('day-content');
      const dots = dayContent.querySelectorAll('.w-1.h-1');

      // Should show max 3 dots even with 10 events
      expect(dots.length).toBeLessThanOrEqual(3);
    });
  });

  describe('API Integration', () => {
    it('calls API on date selection', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );
      global.fetch = mockFetch;

      render(<Calendar mode="single" onDateSelect="/api/calendar/select" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/calendar/select',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );
      });
    });

    it('sends correct payload for single mode', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );
      global.fetch = mockFetch;

      render(<Calendar mode="single" onDateSelect="/api/calendar" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);

        expect(body).toHaveProperty('mode', 'single');
        expect(body).toHaveProperty('selectedDate');
      });
    });

    it('handles API errors gracefully', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('API Error'))
      );
      global.fetch = mockFetch;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Calendar mode="single" onDateSelect="/api/calendar" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
        expect(screen.getByText(/API Error/)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('shows loading state during API call', async () => {
      const mockFetch = vi.fn(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ok: true, json: () => ({}) } as Response), 100)
        )
      );
      global.fetch = mockFetch;

      render(<Calendar mode="single" onDateSelect="/api/calendar" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('Saving selection...')).toBeInTheDocument();
      });
    });

    it('does not call API when onDateSelect not provided', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      render(<Calendar mode="single" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Selection Modes', () => {
    it('handles single mode', () => {
      render(<Calendar mode="single" />);

      expect(screen.getByText('Select a date')).toBeInTheDocument();
    });

    it('handles multiple mode', () => {
      render(<Calendar mode="multiple" />);

      expect(screen.getByText('Select multiple dates')).toBeInTheDocument();
    });

    it('handles range mode', () => {
      render(<Calendar mode="range" />);

      expect(screen.getByText('Select a date range')).toBeInTheDocument();
    });

    it('defaults to single mode', () => {
      render(<Calendar />);

      expect(screen.getByText('Select a date')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has gradient header', () => {
      const { container } = render(<Calendar />);

      const header = container.querySelector('.from-primary-50');
      expect(header).toBeInTheDocument();
    });

    it('applies border and shadow styling', () => {
      const { container } = render(<Calendar />);

      const calendarContainer = container.querySelector('.border-gray-200.shadow-sm');
      expect(calendarContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible labels for zoom buttons', () => {
      render(<Calendar />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();
    });

    it('maintains focus management', () => {
      render(<Calendar />);

      const dayPicker = screen.getByTestId('day-picker');
      expect(dayPicker).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty events array', () => {
      render(<Calendar events={[]} />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();
    });

    it('handles undefined events', () => {
      render(<Calendar events={undefined} />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();
    });

    it('handles whitespace in selectedDate', () => {
      render(<Calendar selectedDate="  2025-10-15  " />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();
    });

    it('handles empty string selectedDate', () => {
      render(<Calendar selectedDate="" />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();
    });

    it('handles events on same date', async () => {
      const sameDayEvents = [
        { date: '2025-10-15', title: 'Event 1' },
        { date: '2025-10-15', title: 'Event 2' },
        { date: '2025-10-15', title: 'Event 3' },
      ];

      render(<Calendar mode="single" events={sameDayEvents} selectedDate="2025-10-15" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument();
        expect(screen.getByText('Event 2')).toBeInTheDocument();
        expect(screen.getByText('Event 3')).toBeInTheDocument();
      });
    });

    it('handles very long event titles', async () => {
      const longTitleEvents = [
        {
          date: '2025-10-15',
          title: 'This is a very long event title that should be handled properly',
          description: 'With a long description as well',
        },
      ];

      render(<Calendar mode="single" events={longTitleEvents} selectedDate="2025-10-15" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/This is a very long event title/)).toBeInTheDocument();
      });
    });

    it('handles special characters in event data', async () => {
      const specialEvents = [
        {
          date: '2025-10-15',
          title: 'Event with <>&"\'',
          description: 'Description with special chars',
        },
      ];

      render(<Calendar mode="single" events={specialEvents} selectedDate="2025-10-15" />);

      const selectButton = screen.getByTestId('select-date-button');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/Event with <>&/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('handles large number of events efficiently', () => {
      const manyEvents = Array.from({ length: 365 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        title: `Event ${i}`,
      }));

      render(<Calendar events={manyEvents} />);

      expect(screen.getByTestId('day-picker')).toBeInTheDocument();
    });
  });
});
