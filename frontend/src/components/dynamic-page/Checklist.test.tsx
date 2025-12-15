/**
 * Checklist Component - Unit Tests
 *
 * Tests for production-ready Checklist component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Checklist, ChecklistItem } from './Checklist';

// Mock fetch for API tests
global.fetch = jest.fn();

describe('Checklist Component', () => {
  const mockItems: ChecklistItem[] = [
    { id: '1', text: 'Task 1', checked: false },
    { id: '2', text: 'Task 2', checked: true },
    { id: '3', text: 'Task 3', checked: false },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders all checklist items', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    test('renders progress bar with correct percentage', () => {
      render(<Checklist items={mockItems} />);

      // 1 out of 3 items checked = 33%
      expect(screen.getByText(/33%/)).toBeInTheDocument();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    test('renders empty state when no items', () => {
      render(<Checklist items={[]} />);

      expect(screen.getByText('No checklist items available')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(
        <Checklist items={mockItems} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Checkbox Functionality', () => {
    test('toggles checkbox on click', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      // Initially unchecked
      expect(firstCheckbox).toHaveAttribute('aria-checked', 'false');

      // Click to check
      fireEvent.click(firstCheckbox);

      // Now checked
      expect(firstCheckbox).toHaveAttribute('aria-checked', 'true');
    });

    test('does not toggle when allowEdit is false', () => {
      render(<Checklist items={mockItems} allowEdit={false} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      const initialState = firstCheckbox.getAttribute('aria-checked');

      fireEvent.click(firstCheckbox);

      // State should not change
      expect(firstCheckbox).toHaveAttribute('aria-checked', initialState);
    });

    test('displays read-only indicator when allowEdit is false', () => {
      render(<Checklist items={mockItems} allowEdit={false} />);

      expect(screen.getByText('Read-only')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('toggles checkbox with Enter key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      firstCheckbox.focus();
      fireEvent.keyDown(firstCheckbox, { key: 'Enter' });

      expect(firstCheckbox).toHaveAttribute('aria-checked', 'true');
    });

    test('toggles checkbox with Space key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      firstCheckbox.focus();
      fireEvent.keyDown(firstCheckbox, { key: ' ' });

      expect(firstCheckbox).toHaveAttribute('aria-checked', 'true');
    });

    test('navigates down with ArrowDown key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];
      const secondCheckbox = checkboxes[1];

      firstCheckbox.focus();
      fireEvent.keyDown(firstCheckbox, { key: 'ArrowDown' });

      expect(secondCheckbox).toHaveFocus();
    });

    test('navigates up with ArrowUp key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const secondCheckbox = checkboxes[1];
      const firstCheckbox = checkboxes[0];

      secondCheckbox.focus();
      fireEvent.keyDown(secondCheckbox, { key: 'ArrowUp' });

      expect(firstCheckbox).toHaveFocus();
    });

    test('jumps to first item with Home key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const lastCheckbox = checkboxes[2];
      const firstCheckbox = checkboxes[0];

      lastCheckbox.focus();
      fireEvent.keyDown(lastCheckbox, { key: 'Home' });

      expect(firstCheckbox).toHaveFocus();
    });

    test('jumps to last item with End key', () => {
      render(<Checklist items={mockItems} allowEdit={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];
      const lastCheckbox = checkboxes[2];

      firstCheckbox.focus();
      fireEvent.keyDown(firstCheckbox, { key: 'End' });

      expect(lastCheckbox).toHaveFocus();
    });
  });

  describe('API Integration', () => {
    test('calls API endpoint on toggle', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <Checklist
          items={mockItems}
          allowEdit={true}
          onChange="/api/checklist/update"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/checklist/update',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"itemId":"1"'),
          })
        );
      });
    });

    test('shows loading state during API call', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
      );

      render(
        <Checklist
          items={mockItems}
          allowEdit={true}
          onChange="/api/checklist/update"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Loading spinner should appear
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });
    });

    test('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(
        <Checklist
          items={mockItems}
          allowEdit={true}
          onChange="/api/checklist/update"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      fireEvent.click(firstCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      // Should have retry button
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    test('rolls back state on API error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('API Error')
      );

      render(
        <Checklist
          items={mockItems}
          allowEdit={true}
          onChange="/api/checklist/update"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      // Initially unchecked
      expect(firstCheckbox).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(firstCheckbox);

      // Wait for error and rollback
      await waitFor(() => {
        expect(firstCheckbox).toHaveAttribute('aria-checked', 'false');
      });
    });
  });

  describe('Template Variables', () => {
    test('replaces template variables with metadata values', () => {
      const itemsWithTemplates: ChecklistItem[] = [
        {
          id: '1',
          text: 'Review {{taskName}} for {{projectName}}',
          checked: false,
          metadata: {
            taskName: 'PR #123',
            projectName: 'Agent Feed',
          },
        },
      ];

      render(<Checklist items={itemsWithTemplates} />);

      expect(screen.getByText('Review PR #123 for Agent Feed')).toBeInTheDocument();
    });

    test('keeps template syntax when no metadata provided', () => {
      const itemsWithTemplates: ChecklistItem[] = [
        {
          id: '1',
          text: 'Review {{taskName}}',
          checked: false,
        },
      ];

      render(<Checklist items={itemsWithTemplates} />);

      expect(screen.getByText('Review {{taskName}}')).toBeInTheDocument();
    });

    test('displays metadata description when available', () => {
      const itemsWithMetadata: ChecklistItem[] = [
        {
          id: '1',
          text: 'Task 1',
          checked: false,
          metadata: {
            description: 'Additional task details',
          },
        },
      ];

      render(<Checklist items={itemsWithMetadata} />);

      expect(screen.getByText('Additional task details')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA roles', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Checklist');
      expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    });

    test('has proper ARIA labels for checkboxes', () => {
      render(<Checklist items={mockItems} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toHaveAttribute('aria-label', 'Check Task 1');
      expect(checkboxes[1]).toHaveAttribute('aria-label', 'Uncheck Task 2');
    });

    test('has progressbar with proper ARIA attributes', () => {
      render(<Checklist items={mockItems} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '33');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    test('disables checkboxes when not editable', () => {
      render(<Checklist items={mockItems} allowEdit={false} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('Progress Tracking', () => {
    test('shows completion message when all items checked', () => {
      const allCheckedItems = mockItems.map(item => ({ ...item, checked: true }));
      render(<Checklist items={allCheckedItems} />);

      expect(screen.getByText('All tasks completed!')).toBeInTheDocument();
    });

    test('shows remaining items count', () => {
      render(<Checklist items={mockItems} />);

      expect(screen.getByText('2 remaining')).toBeInTheDocument();
    });

    test('updates progress bar when items change', () => {
      const { rerender } = render(<Checklist items={mockItems} />);

      expect(screen.getByText(/33%/)).toBeInTheDocument();

      const updatedItems = mockItems.map(item => ({ ...item, checked: true }));
      rerender(<Checklist items={updatedItems} />);

      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });
});
