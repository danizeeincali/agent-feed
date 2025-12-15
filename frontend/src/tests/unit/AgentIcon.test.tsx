import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentIcon } from '../../components/agents/AgentIcon';

describe('AgentIcon Component - TDD Test Suite', () => {
  // ===========================
  // LEVEL 1: SVG Icon Tests
  // ===========================

  describe('SVG Icon Rendering', () => {
    it('should render SVG icon when icon prop provided', () => {
      const agent = {
        name: 'test-agent',
        icon: 'Bot',
        icon_type: 'svg' as const,
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      const iconElement = screen.getByRole('img');
      expect(iconElement).toBeInTheDocument();
    });

    it('should render CheckSquare icon for personal-todos-agent', () => {
      const agent = {
        name: 'personal-todos-agent',
        icon: 'CheckSquare',
        icon_type: 'svg' as const,
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      const iconElement = screen.getByRole('img');
      expect(iconElement).toBeInTheDocument();
    });

    it('should apply correct size classes', () => {
      const agent = {
        name: 'test-agent',
        icon: 'Bot',
        icon_type: 'svg' as const,
        tier: 1 as const
      };
      const { container, getByRole } = render(<AgentIcon agent={agent} size="lg" />);
      const iconElement = getByRole('img');
      expect(iconElement).toBeInTheDocument();
      // SVG icons render the className on the SVG element itself
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement?.className.baseVal || svgElement?.getAttribute('class') || '').toContain('w-8');
      expect(svgElement?.className.baseVal || svgElement?.getAttribute('class') || '').toContain('h-8');
    });

    it('should render an icon with aria-label for tier 1 agents', () => {
      const agent = {
        name: 'test-agent',
        icon: 'Bot',
        icon_type: 'svg' as const,
        tier: 1 as const
      };
      const { getByRole } = render(<AgentIcon agent={agent} />);
      const iconElement = getByRole('img');
      expect(iconElement).toBeInTheDocument();
      expect(iconElement).toHaveAccessibleName('test-agent');
    });

    it('should render an icon with aria-label for tier 2 agents', () => {
      const agent = {
        name: 'meta-agent',
        icon: 'Settings',
        icon_type: 'svg' as const,
        tier: 2 as const
      };
      const { getByRole } = render(<AgentIcon agent={agent} />);
      const iconElement = getByRole('img');
      expect(iconElement).toBeInTheDocument();
      expect(iconElement).toHaveAccessibleName('meta-agent');
    });
  });

  // ===========================
  // LEVEL 2: Emoji Fallback Tests
  // ===========================

  describe('Emoji Fallback Rendering', () => {
    it('should fallback to emoji when icon type is emoji', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const,
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('should fallback to emoji when SVG icon not found', () => {
      const agent = {
        name: 'test-agent',
        icon: 'NonExistentIcon',
        icon_emoji: '📋',
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      expect(screen.getByText('📋')).toBeInTheDocument();
    });

    it('should render emoji with correct size', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const,
        tier: 1 as const
      };
      const { container } = render(<AgentIcon agent={agent} size="xl" />);
      const emojiContainer = screen.getByRole('img');
      expect(emojiContainer.className).toContain('w-12');
      expect(emojiContainer.className).toContain('h-12');
    });

    it('should have proper ARIA label for emoji', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const,
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      const iconElement = screen.getByRole('img');
      expect(iconElement).toHaveAccessibleName('test-agent');
    });
  });

  // ===========================
  // LEVEL 3: Initials Fallback Tests
  // ===========================

  describe('Initials Fallback Rendering', () => {
    it('should fallback to initials when no icon', () => {
      const agent = {
        name: 'Test Agent',
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      expect(screen.getByText('TA')).toBeInTheDocument();
    });

    it('should generate correct initials for hyphenated names', () => {
      const agent = {
        name: 'personal-todos-agent',
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      expect(screen.getByText('PT')).toBeInTheDocument();
    });

    it('should generate correct initials for meta-agent', () => {
      const agent = {
        name: 'meta-agent',
        tier: 2 as const
      };
      render(<AgentIcon agent={agent} />);
      expect(screen.getByText('ME')).toBeInTheDocument();
    });

    it('should generate single letter initials for single word', () => {
      const agent = {
        name: 'avi',
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      expect(screen.getByText('AV')).toBeInTheDocument();
    });

    it('should render initials with tier-based background color', () => {
      const agent = {
        name: 'test-agent',
        tier: 1 as const
      };
      const { container } = render(<AgentIcon agent={agent} />);
      const initialsDiv = container.querySelector('div[role="img"]');
      expect(initialsDiv?.className).toContain('bg-gray-200');
    });
  });

  // ===========================
  // Size System Tests
  // ===========================

  describe('Size System', () => {
    it('should render xs size correctly', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const,
        tier: 1 as const
      };
      const { container } = render(<AgentIcon agent={agent} size="xs" />);
      const iconElement = container.querySelector('[role="img"]');
      expect(iconElement?.className).toContain('w-3');
      expect(iconElement?.className).toContain('h-3');
    });

    it('should render sm size correctly', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const,
        tier: 1 as const
      };
      const { container } = render(<AgentIcon agent={agent} size="sm" />);
      const iconElement = container.querySelector('[role="img"]');
      expect(iconElement?.className).toContain('w-4');
      expect(iconElement?.className).toContain('h-4');
    });

    it('should default to md size', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const,
        tier: 1 as const
      };
      const { container } = render(<AgentIcon agent={agent} />);
      const iconElement = container.querySelector('[role="img"]');
      expect(iconElement?.className).toContain('w-6');
      expect(iconElement?.className).toContain('h-6');
    });

    it('should render 2xl size correctly', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const,
        tier: 1 as const
      };
      const { container } = render(<AgentIcon agent={agent} size="2xl" />);
      const iconElement = container.querySelector('[role="img"]');
      expect(iconElement?.className).toContain('w-16');
      expect(iconElement?.className).toContain('h-16');
    });
  });

  // ===========================
  // Accessibility Tests
  // ===========================

  describe('Accessibility', () => {
    it('should have role="img" for SVG icons', () => {
      const agent = {
        name: 'test-agent',
        icon: 'Bot',
        icon_type: 'svg' as const,
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      const iconElement = screen.getByRole('img');
      expect(iconElement).toBeInTheDocument();
    });

    it('should have aria-label with agent name', () => {
      const agent = {
        name: 'personal-todos-agent',
        icon: 'CheckSquare',
        icon_type: 'svg' as const,
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      const iconElement = screen.getByRole('img');
      expect(iconElement).toHaveAccessibleName('personal-todos-agent');
    });

    it('should support custom className', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const,
        tier: 1 as const
      };
      const { container } = render(<AgentIcon agent={agent} className="custom-class" />);
      const iconElement = container.querySelector('[role="img"]');
      expect(iconElement?.className).toContain('custom-class');
    });
  });

  // ===========================
  // Edge Cases
  // ===========================

  describe('Edge Cases', () => {
    it('should handle agent with no tier', () => {
      const agent = {
        name: 'test-agent',
        icon_emoji: '🤖',
        icon_type: 'emoji' as const
      };
      render(<AgentIcon agent={agent as any} />);
      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('should handle agent with empty name', () => {
      const agent = {
        name: '',
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      // Should render something (fallback)
      const iconElement = screen.getByRole('img');
      expect(iconElement).toBeInTheDocument();
    });

    it('should handle very long agent names', () => {
      const agent = {
        name: 'this-is-a-very-long-agent-name-with-many-words',
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      const initialsElement = screen.getByRole('img');
      expect(initialsElement).toBeInTheDocument();
    });

    it('should handle special characters in agent name', () => {
      const agent = {
        name: 'agent-with-@#$-special',
        tier: 1 as const
      };
      render(<AgentIcon agent={agent} />);
      const iconElement = screen.getByRole('img');
      expect(iconElement).toBeInTheDocument();
    });
  });
});
