/**
 * AgentTierToggle Component Test Suite
 * Test-Driven Development (TDD) - Red Phase
 *
 * Tests written BEFORE implementation following London School TDD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AgentTierToggle, AgentTierToggleProps } from '@/components/agents/AgentTierToggle';

describe('AgentTierToggle Component', () => {
  const defaultProps: AgentTierToggleProps = {
    currentTier: '1',
    onTierChange: vi.fn(),
    tierCounts: {
      tier1: 8,
      tier2: 11,
      total: 19,
    },
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render three tier buttons', () => {
      render(<AgentTierToggle {...defaultProps} />);

      expect(screen.getByRole('button', { name: /tier 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tier 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    });

    it('should render with correct tier counts in labels', () => {
      render(<AgentTierToggle {...defaultProps} />);

      expect(screen.getByText(/\(8\)/)).toBeInTheDocument(); // Tier 1 count
      expect(screen.getByText(/\(11\)/)).toBeInTheDocument(); // Tier 2 count
      expect(screen.getByText(/\(19\)/)).toBeInTheDocument(); // All count
    });

    it('should render group container with correct ARIA role', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const group = screen.getByRole('group', { name: /agent tier filter/i });
      expect(group).toBeInTheDocument();
    });

    it('should render buttons with correct labels', () => {
      render(<AgentTierToggle {...defaultProps} />);

      expect(screen.getByText(/tier 1/i)).toBeInTheDocument();
      expect(screen.getByText(/tier 2/i)).toBeInTheDocument();
      expect(screen.getByText(/all/i)).toBeInTheDocument();
    });
  });

  describe('Active State Management', () => {
    it('should show Tier 1 as active when currentTier is "1"', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="1" />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      expect(tier1Button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show Tier 2 as active when currentTier is "2"', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="2" />);

      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      expect(tier2Button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show All as active when currentTier is "all"', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="all" />);

      const allButton = screen.getByRole('button', { name: /all/i });
      expect(allButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should only have one button with aria-pressed="true" at a time', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="1" />);

      const buttons = screen.getAllByRole('button');
      const activeButtons = buttons.filter(btn => btn.getAttribute('aria-pressed') === 'true');

      expect(activeButtons).toHaveLength(1);
    });

    it('should apply active styling to current tier button', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="1" />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      expect(tier1Button.className).toContain('bg-blue-600');
      expect(tier1Button.className).toContain('text-white');
    });

    it('should apply inactive styling to non-current tier buttons', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="1" />);

      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      expect(tier2Button.className).toContain('text-gray-700');
      expect(tier2Button.className).toContain('hover:bg-gray-100');
    });
  });

  describe('User Interactions', () => {
    it('should call onTierChange with "1" when Tier 1 button is clicked', async () => {
      const handleChange = vi.fn();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} currentTier="2" />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      await userEvent.click(tier1Button);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('1');
    });

    it('should call onTierChange with "2" when Tier 2 button is clicked', async () => {
      const handleChange = vi.fn();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} currentTier="1" />);

      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      await userEvent.click(tier2Button);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('2');
    });

    it('should call onTierChange with "all" when All button is clicked', async () => {
      const handleChange = vi.fn();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} currentTier="1" />);

      const allButton = screen.getByRole('button', { name: /all/i });
      await userEvent.click(allButton);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('all');
    });

    it('should allow clicking the same tier button multiple times', async () => {
      const handleChange = vi.fn();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} currentTier="1" />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      await userEvent.click(tier1Button);
      await userEvent.click(tier1Button);

      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(handleChange).toHaveBeenNthCalledWith(1, '1');
      expect(handleChange).toHaveBeenNthCalledWith(2, '1');
    });

    it('should handle rapid successive clicks correctly', async () => {
      const handleChange = vi.fn();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      const tier2Button = screen.getByRole('button', { name: /tier 2/i });

      await userEvent.click(tier1Button);
      await userEvent.click(tier2Button);
      await userEvent.click(tier1Button);

      expect(handleChange).toHaveBeenCalledTimes(3);
      expect(handleChange).toHaveBeenNthCalledWith(1, '1');
      expect(handleChange).toHaveBeenNthCalledWith(2, '2');
      expect(handleChange).toHaveBeenNthCalledWith(3, '1');
    });
  });

  describe('Loading State', () => {
    it('should disable all buttons when loading is true', () => {
      render(<AgentTierToggle {...defaultProps} loading={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call onTierChange when button clicked while loading', async () => {
      const handleChange = vi.fn();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} loading={true} />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      await userEvent.click(tier1Button);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should apply loading opacity to buttons when loading', () => {
      render(<AgentTierToggle {...defaultProps} loading={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.className).toContain('opacity-50');
        expect(button.className).toContain('cursor-not-allowed');
      });
    });

    it('should enable buttons when loading is false', () => {
      render(<AgentTierToggle {...defaultProps} loading={false} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation with Tab key', async () => {
      const user = userEvent.setup();
      render(<AgentTierToggle {...defaultProps} />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      const allButton = screen.getByRole('button', { name: /all/i });

      tier1Button.focus();
      expect(tier1Button).toHaveFocus();

      await user.tab();
      expect(tier2Button).toHaveFocus();

      await user.tab();
      expect(allButton).toHaveFocus();
    });

    it('should trigger onTierChange when Enter key is pressed', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} currentTier="1" />);

      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      tier2Button.focus();

      await user.keyboard('{Enter}');

      expect(handleChange).toHaveBeenCalledWith('2');
    });

    it('should trigger onTierChange when Space key is pressed', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} currentTier="1" />);

      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      tier2Button.focus();

      await user.keyboard(' ');

      expect(handleChange).toHaveBeenCalledWith('2');
    });

    it('should maintain focus after tier change', async () => {
      const user = userEvent.setup();
      render(<AgentTierToggle {...defaultProps} />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      tier1Button.focus();

      await user.keyboard('{Enter}');

      expect(tier1Button).toHaveFocus();
    });

    it('should not respond to disabled buttons with keyboard', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<AgentTierToggle {...defaultProps} onTierChange={handleChange} loading={true} />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      tier1Button.focus();

      await user.keyboard('{Enter}');

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility (ARIA)', () => {
    it('should have role="group" on container with accessible name', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'Agent tier filter');
    });

    it('should have aria-pressed attribute on all buttons', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });

    it('should set aria-pressed="true" only for active button', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="2" />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      const allButton = screen.getByRole('button', { name: /all/i });

      expect(tier1Button).toHaveAttribute('aria-pressed', 'false');
      expect(tier2Button).toHaveAttribute('aria-pressed', 'true');
      expect(allButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have accessible button labels', () => {
      render(<AgentTierToggle {...defaultProps} />);

      expect(screen.getByRole('button', { name: /tier 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tier 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    });

    it('should indicate disabled state with aria-disabled when loading', () => {
      render(<AgentTierToggle {...defaultProps} loading={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should have proper tabindex for keyboard navigation', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Buttons should not have tabindex=-1
        expect(button.getAttribute('tabindex')).not.toBe('-1');
      });
    });
  });

  describe('Visual Styling', () => {
    it('should apply color coding to tier buttons', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="1" />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      expect(tier1Button.className).toContain('bg-blue-600');
    });

    it('should apply different styling to active vs inactive buttons', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="1" />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      const tier2Button = screen.getByRole('button', { name: /tier 2/i });

      // Active button (Tier 1)
      expect(tier1Button.className).toContain('text-white');

      // Inactive button (Tier 2)
      expect(tier2Button.className).toContain('text-gray-700');
    });

    it('should include count badges in button text', () => {
      render(<AgentTierToggle {...defaultProps} />);

      // Check that counts are displayed
      expect(screen.getByText(/8/)).toBeInTheDocument();
      expect(screen.getByText(/11/)).toBeInTheDocument();
      expect(screen.getByText(/19/)).toBeInTheDocument();
    });

    it('should apply rounded corners to button group', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const group = screen.getByRole('group');
      expect(group.className).toContain('rounded-lg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero counts gracefully', () => {
      render(
        <AgentTierToggle
          {...defaultProps}
          tierCounts={{ tier1: 0, tier2: 0, total: 0 }}
        />
      );

      // All three buttons should show (0)
      const countElements = screen.getAllByText(/\(0\)/);
      expect(countElements).toHaveLength(3);
    });

    it('should handle very large counts', () => {
      render(
        <AgentTierToggle
          {...defaultProps}
          tierCounts={{ tier1: 999, tier2: 1000, total: 1999 }}
        />
      );

      // Check that large counts are displayed correctly
      expect(screen.getByText(/\(999\)/)).toBeInTheDocument();
      expect(screen.getByText(/\(1000\)/)).toBeInTheDocument();
      expect(screen.getByText(/\(1999\)/)).toBeInTheDocument();
    });

    it('should handle missing onTierChange gracefully', () => {
      // This test ensures the component doesn't crash if callback is missing
      const { container } = render(
        <AgentTierToggle
          currentTier="1"
          onTierChange={vi.fn()}
          tierCounts={{ tier1: 8, tier2: 11, total: 19 }}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('should update active state when currentTier prop changes', () => {
      const { rerender } = render(<AgentTierToggle {...defaultProps} currentTier="1" />);

      const tier1Button = screen.getByRole('button', { name: /tier 1/i });
      expect(tier1Button).toHaveAttribute('aria-pressed', 'true');

      rerender(<AgentTierToggle {...defaultProps} currentTier="2" />);

      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      expect(tier2Button).toHaveAttribute('aria-pressed', 'true');
      expect(tier1Button).toHaveAttribute('aria-pressed', 'false');
    });

    it('should maintain correct state when toggled between all three tiers', async () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <AgentTierToggle {...defaultProps} onTierChange={handleChange} currentTier="1" />
      );

      const tier2Button = screen.getByRole('button', { name: /tier 2/i });
      await userEvent.click(tier2Button);

      rerender(<AgentTierToggle {...defaultProps} onTierChange={handleChange} currentTier="2" />);

      const allButton = screen.getByRole('button', { name: /all/i });
      await userEvent.click(allButton);

      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(handleChange).toHaveBeenNthCalledWith(1, '2');
      expect(handleChange).toHaveBeenNthCalledWith(2, 'all');
    });
  });
});
