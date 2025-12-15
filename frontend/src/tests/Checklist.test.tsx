import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Checklist, ChecklistItem } from '../components/dynamic-page/Checklist';

const mockItems: ChecklistItem[] = [
  {
    id: '1',
    text: 'Task 1',
    checked: false,
  },
  {
    id: '2',
    text: 'Task 2 with {{variable}}',
    checked: true,
    metadata: { variable: 'replaced value' },
  },
  {
    id: '3',
    text: 'Task 3',
    checked: false,
    metadata: { description: 'Additional info' },
  },
];

describe('Checklist Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all checklist items', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText(/Task 2 with replaced value/)).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    it('renders empty state when no items', () => {
      render(<Checklist items={[]} />);

      expect(screen.getByText('No checklist items available')).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('1 / 3 (33%)')).toBeInTheDocument();
    });

    it('displays correct progress percentage', () => {
      render(<Checklist items={mockItems} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '33');
      expect(progressBar).toHaveStyle({ width: '33%' });
    });

    it('applies custom className', () => {
      const { container } = render(
        <Checklist items={mockItems} className="custom-checklist" />
      );

      expect(container.firstChild).toHaveClass('custom-checklist');
    });

    it('displays metadata descriptions', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByText('Additional info')).toBeInTheDocument();
    });
  });

  describe('Template Variables', () => {
    it('replaces template variables with metadata values', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByText(/Task 2 with replaced value/)).toBeInTheDocument();
      expect(screen.queryByText(/{{variable}}/)).not.toBeInTheDocument();
    });

    it('keeps template syntax when no metadata provided', () => {
      const itemsWithUnresolvedVars: ChecklistItem[] = [
        {
          id: '1',
          text: 'Task with {{unresolved}}',
          checked: false,
        },
      ];

      render(<Checklist items={itemsWithUnresolvedVars} />);

      expect(screen.getByText(/{{unresolved}}/)).toBeInTheDocument();
    });
  });

  describe('Checkbox Interaction', () => {
    it('toggles checkbox on click', async () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });

      expect(task1Checkbox).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(task1Checkbox);

      await waitFor(() => {
        expect(task1Checkbox).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('applies strikethrough to checked items', () => {
      render(<Checklist items={mockItems} />);

      const task2Text = screen.getByText(/Task 2 with replaced value/);
      expect(task2Text).toHaveClass('line-through');

      const task1Text = screen.getByText('Task 1');
      expect(task1Text).not.toHaveClass('line-through');
    });

    it('disables checkboxes when allowEdit is false', () => {
      render(<Checklist items={mockItems} allowEdit={false} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('API Integration', () => {
    it('calls API on checkbox toggle', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );
      global.fetch = mockFetch;

      render(
        <Checklist
          items={mockItems}
          onChange="/api/checklist/update"
          allowEdit={true}
        />
      );

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });
      fireEvent.click(task1Checkbox);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/checklist/update',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('"itemId":"1"'),
          })
        );
      });
    });

    it('includes item data in API payload', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );
      global.fetch = mockFetch;

      render(
        <Checklist
          items={mockItems}
          onChange="/api/checklist"
          allowEdit={true}
        />
      );

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });
      fireEvent.click(task1Checkbox);

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);

        expect(body).toHaveProperty('itemId', '1');
        expect(body).toHaveProperty('checked', true);
        expect(body).toHaveProperty('item');
        expect(body).toHaveProperty('timestamp');
      });
    });

    it('handles API errors gracefully', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );
      global.fetch = mockFetch;

      render(
        <Checklist
          items={mockItems}
          onChange="/api/checklist"
          allowEdit={true}
        />
      );

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });
      fireEvent.click(task1Checkbox);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Item should be rolled back to original state
      expect(task1Checkbox).toHaveAttribute('aria-checked', 'false');
    });

    it('shows loading state during API call', async () => {
      const mockFetch = vi.fn(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ok: true, json: () => ({}) } as Response), 100)
        )
      );
      global.fetch = mockFetch;

      render(
        <Checklist
          items={mockItems}
          onChange="/api/checklist"
          allowEdit={true}
        />
      );

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });
      fireEvent.click(task1Checkbox);

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /Check Task 1/i })).toHaveAttribute(
          'aria-disabled',
          'true'
        );
      });
    });

    it('does not call API when onChange not provided', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      render(<Checklist items={mockItems} allowEdit={true} />);

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });
      fireEvent.click(task1Checkbox);

      await waitFor(() => {
        expect(task1Checkbox).toHaveAttribute('aria-checked', 'true');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('provides retry functionality on error', async () => {
      let callCount = 0;
      const mockFetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First attempt failed'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      });
      global.fetch = mockFetch;

      render(
        <Checklist
          items={mockItems}
          onChange="/api/checklist"
          allowEdit={true}
        />
      );

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });
      fireEvent.click(task1Checkbox);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('toggles on Enter key', async () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });
      fireEvent.keyDown(task1Checkbox, { key: 'Enter' });

      await waitFor(() => {
        expect(task1Checkbox).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('toggles on Space key', async () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });
      fireEvent.keyDown(task1Checkbox, { key: ' ' });

      await waitFor(() => {
        expect(task1Checkbox).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('navigates with arrow keys', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      firstCheckbox.focus();
      fireEvent.keyDown(firstCheckbox, { key: 'ArrowDown' });

      // Second checkbox should be focused
      expect(document.activeElement).toBe(checkboxes[1]);
    });

    it('navigates up with ArrowUp key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const secondCheckbox = checkboxes[1];

      secondCheckbox.focus();
      fireEvent.keyDown(secondCheckbox, { key: 'ArrowUp' });

      expect(document.activeElement).toBe(checkboxes[0]);
    });

    it('jumps to first item with Home key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const lastCheckbox = checkboxes[checkboxes.length - 1];

      lastCheckbox.focus();
      fireEvent.keyDown(lastCheckbox, { key: 'Home' });

      expect(document.activeElement).toBe(checkboxes[0]);
    });

    it('jumps to last item with End key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      firstCheckbox.focus();
      fireEvent.keyDown(firstCheckbox, { key: 'End' });

      expect(document.activeElement).toBe(checkboxes[checkboxes.length - 1]);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByRole('group', { name: 'Checklist' })).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox').length).toBe(mockItems.length);
    });

    it('provides descriptive aria-labels', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByRole('checkbox', { name: /Check Task 1/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Uncheck Task 2/i })).toBeInTheDocument();
    });

    it('has accessible progress bar', () => {
      render(<Checklist items={mockItems} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '33');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', '33% complete');
    });

    it('indicates disabled state with aria-disabled', () => {
      render(<Checklist items={mockItems} allowEdit={false} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('Progress Summary', () => {
    it('shows completion message when all done', () => {
      const allChecked: ChecklistItem[] = mockItems.map(item => ({
        ...item,
        checked: true,
      }));

      render(<Checklist items={allChecked} />);

      expect(screen.getByText('All tasks completed!')).toBeInTheDocument();
    });

    it('shows remaining count', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByText('2 remaining')).toBeInTheDocument();
    });

    it('shows read-only indicator when not editable', () => {
      render(<Checklist items={mockItems} allowEdit={false} />);

      expect(screen.getByText('Read-only')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles items without metadata', () => {
      const simpleItems: ChecklistItem[] = [
        { id: '1', text: 'Simple task', checked: false },
      ];

      render(<Checklist items={simpleItems} />);

      expect(screen.getByText('Simple task')).toBeInTheDocument();
    });

    it('prevents multiple simultaneous toggles', async () => {
      const mockFetch = vi.fn(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ok: true, json: () => ({}) } as Response), 100)
        )
      );
      global.fetch = mockFetch;

      render(
        <Checklist
          items={mockItems}
          onChange="/api/checklist"
          allowEdit={true}
        />
      );

      const task1Checkbox = screen.getByRole('checkbox', { name: /Check Task 1/i });

      // Click multiple times rapidly
      fireEvent.click(task1Checkbox);
      fireEvent.click(task1Checkbox);
      fireEvent.click(task1Checkbox);

      // Should only make one API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('handles very long text', () => {
      const longTextItem: ChecklistItem[] = [
        {
          id: '1',
          text: 'This is a very long task description that should wrap properly and not break the layout even on smaller screens',
          checked: false,
        },
      ];

      render(<Checklist items={longTextItem} />);

      expect(screen.getByText(/This is a very long task description/)).toBeInTheDocument();
    });
  });
});
