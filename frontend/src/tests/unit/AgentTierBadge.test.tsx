/**
 * Unit Tests for AgentTierBadge Component
 * TDD Implementation - Test Suite Created First
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentTierBadge } from '../../components/agents/AgentTierBadge';

describe('AgentTierBadge Component', () => {
  describe('T1 Badge Styling', () => {
    it('should render T1 badge with blue background', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText(/T1/);
      expect(badge).toHaveClass('bg-blue-100');
    });

    it('should render T1 badge with blue text', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText(/T1/);
      expect(badge).toHaveClass('text-blue-800');
    });

    it('should render T1 badge with blue border', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText(/T1/);
      expect(badge).toHaveClass('border-blue-300');
    });

    it('should have ARIA label for T1 User-facing tier', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByLabelText(/Tier 1.*User-facing/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('T2 Badge Styling', () => {
    it('should render T2 badge with gray background', () => {
      render(<AgentTierBadge tier={2} />);
      const badge = screen.getByText(/T2/);
      expect(badge).toHaveClass('bg-gray-100');
    });

    it('should render T2 badge with gray text', () => {
      render(<AgentTierBadge tier={2} />);
      const badge = screen.getByText(/T2/);
      expect(badge).toHaveClass('text-gray-800');
    });

    it('should render T2 badge with gray border', () => {
      render(<AgentTierBadge tier={2} />);
      const badge = screen.getByText(/T2/);
      expect(badge).toHaveClass('border-gray-300');
    });

    it('should have ARIA label for T2 System tier', () => {
      render(<AgentTierBadge tier={2} />);
      const badge = screen.getByLabelText(/Tier 2.*System/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Default Variant', () => {
    it('should render default variant with full label for T1', () => {
      render(<AgentTierBadge tier={1} />);
      expect(screen.getByText('T1 - User-facing')).toBeInTheDocument();
    });

    it('should render default variant with full label for T2', () => {
      render(<AgentTierBadge tier={2} />);
      expect(screen.getByText('T2 - System')).toBeInTheDocument();
    });

    it('should have rounded-full class in default variant', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('rounded-full');
    });

    it('should have border class in default variant', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('border');
    });
  });

  describe('Compact Variant', () => {
    it('should render compact variant with short label', () => {
      render(<AgentTierBadge tier={1} variant="compact" />);
      expect(screen.getByText('T1')).toBeInTheDocument();
      expect(screen.queryByText('User-facing')).not.toBeInTheDocument();
    });

    it('should have rounded (not rounded-full) class in compact variant', () => {
      render(<AgentTierBadge tier={1} variant="compact" />);
      const badge = screen.getByText('T1');
      expect(badge).toHaveClass('rounded');
      expect(badge).not.toHaveClass('rounded-full');
    });

    it('should have smaller padding in compact variant', () => {
      render(<AgentTierBadge tier={1} variant="compact" />);
      const badge = screen.getByText('T1');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
    });

    it('should have accessible ARIA label in compact variant', () => {
      render(<AgentTierBadge tier={1} variant="compact" />);
      const badge = screen.getByLabelText(/Tier 1/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Icon-only Variant', () => {
    it('should render icon-only variant with just tier number', () => {
      render(<AgentTierBadge tier={1} variant="icon-only" />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.queryByText(/T1/)).not.toBeInTheDocument();
    });

    it('should have circular shape in icon-only variant', () => {
      render(<AgentTierBadge tier={2} variant="icon-only" />);
      const badge = screen.getByLabelText(/Tier 2/i);
      expect(badge).toHaveClass('rounded-full');
    });

    it('should have fixed dimensions in icon-only variant', () => {
      render(<AgentTierBadge tier={1} variant="icon-only" />);
      const badge = screen.getByLabelText(/Tier 1/i);
      expect(badge).toHaveClass('w-6');
      expect(badge).toHaveClass('h-6');
    });

    it('should have accessible ARIA label in icon-only variant', () => {
      render(<AgentTierBadge tier={1} variant="icon-only" />);
      const badge = screen.getByLabelText(/Tier 1.*User-facing/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('showLabel Prop', () => {
    it('should hide label when showLabel is false', () => {
      render(<AgentTierBadge tier={1} showLabel={false} />);
      expect(screen.getByText('T1')).toBeInTheDocument();
      expect(screen.queryByText('User-facing')).not.toBeInTheDocument();
    });

    it('should show label when showLabel is true (default)', () => {
      render(<AgentTierBadge tier={1} showLabel={true} />);
      expect(screen.getByText('T1 - User-facing')).toBeInTheDocument();
    });

    it('should show label by default when showLabel is not specified', () => {
      render(<AgentTierBadge tier={2} />);
      expect(screen.getByText('T2 - System')).toBeInTheDocument();
    });
  });

  describe('Custom className Prop', () => {
    it('should apply custom className', () => {
      render(<AgentTierBadge tier={1} className="custom-class" />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('custom-class');
    });

    it('should preserve base classes when custom className is provided', () => {
      render(<AgentTierBadge tier={1} className="ml-2" />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('ml-2');
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-800');
    });

    it('should work with empty className', () => {
      render(<AgentTierBadge tier={1} className="" />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('bg-blue-100');
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should accept tier 1', () => {
      render(<AgentTierBadge tier={1} />);
      expect(screen.getByText(/T1/)).toBeInTheDocument();
    });

    it('should accept tier 2', () => {
      render(<AgentTierBadge tier={2} />);
      expect(screen.getByText(/T2/)).toBeInTheDocument();
    });

    it('should accept variant "default"', () => {
      render(<AgentTierBadge tier={1} variant="default" />);
      expect(screen.getByText('T1 - User-facing')).toBeInTheDocument();
    });

    it('should accept variant "compact"', () => {
      render(<AgentTierBadge tier={1} variant="compact" />);
      expect(screen.getByText('T1')).toBeInTheDocument();
    });

    it('should accept variant "icon-only"', () => {
      render(<AgentTierBadge tier={1} variant="icon-only" />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have inline-flex display for proper alignment', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('inline-flex');
    });

    it('should have items-center for vertical centering', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('items-center');
    });

    it('should have text-xs for proper font sizing', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('text-xs');
    });

    it('should have font-medium for readability', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge).toHaveClass('font-medium');
    });

    it('should use semantic span element', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText('T1 - User-facing');
      expect(badge.tagName).toBe('SPAN');
    });
  });

  describe('Visual Consistency', () => {
    it('should maintain consistent styling across T1 badges', () => {
      const { rerender } = render(<AgentTierBadge tier={1} />);
      const badge1 = screen.getByText('T1 - User-facing');
      const classes1 = badge1.className;

      rerender(<AgentTierBadge tier={1} />);
      const badge2 = screen.getByText('T1 - User-facing');
      expect(badge2.className).toBe(classes1);
    });

    it('should maintain consistent styling across T2 badges', () => {
      const { rerender } = render(<AgentTierBadge tier={2} />);
      const badge1 = screen.getByText('T2 - System');
      const classes1 = badge1.className;

      rerender(<AgentTierBadge tier={2} />);
      const badge2 = screen.getByText('T2 - System');
      expect(badge2.className).toBe(classes1);
    });
  });

  describe('Edge Cases', () => {
    it('should render correctly with all props combined', () => {
      render(
        <AgentTierBadge
          tier={1}
          variant="compact"
          showLabel={false}
          className="custom-margin"
        />
      );
      const badge = screen.getByText('T1');
      expect(badge).toHaveClass('custom-margin');
      expect(badge).toHaveClass('bg-blue-100');
    });

    it('should handle rapid re-renders', () => {
      const { rerender } = render(<AgentTierBadge tier={1} />);
      rerender(<AgentTierBadge tier={2} />);
      rerender(<AgentTierBadge tier={1} />);
      expect(screen.getByText('T1 - User-facing')).toBeInTheDocument();
    });

    it('should maintain correct styling when variant changes', () => {
      const { rerender } = render(<AgentTierBadge tier={1} variant="default" />);
      expect(screen.getByText('T1 - User-facing')).toBeInTheDocument();

      rerender(<AgentTierBadge tier={1} variant="compact" />);
      expect(screen.getByText('T1')).toBeInTheDocument();
      expect(screen.queryByText('User-facing')).not.toBeInTheDocument();
    });
  });

  describe('Integration with Icon Mapping System', () => {
    it('should display T1 label matching icon documentation', () => {
      render(<AgentTierBadge tier={1} />);
      // Per AGENT-ICON-EMOJI-MAPPING.md, T1 = User-facing
      expect(screen.getByText(/User-facing/)).toBeInTheDocument();
    });

    it('should display T2 label matching icon documentation', () => {
      render(<AgentTierBadge tier={2} />);
      // Per AGENT-ICON-EMOJI-MAPPING.md, T2 = System
      expect(screen.getByText(/System/)).toBeInTheDocument();
    });

    it('should use blue color scheme for T1 as per documentation', () => {
      render(<AgentTierBadge tier={1} />);
      const badge = screen.getByText(/T1/);
      // Per documentation: T1 uses blue-600 color scheme
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-800');
    });

    it('should use gray color scheme for T2 as per documentation', () => {
      render(<AgentTierBadge tier={2} />);
      const badge = screen.getByText(/T2/);
      // Per documentation: T2 uses gray-500 color scheme
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('text-gray-800');
    });
  });
});
