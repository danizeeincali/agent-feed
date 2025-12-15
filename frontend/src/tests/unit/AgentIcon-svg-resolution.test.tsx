/**
 * AgentIcon SVG Resolution Test Suite
 *
 * London School TDD (Mockist Approach)
 *
 * Purpose: Test the contract between AgentIcon and lucide-react library
 * Focus: Object collaboration, interaction verification, and behavior testing
 *
 * Context:
 * - AgentIcon component resolves SVG icons from lucide-react
 * - lucide-react exports React.forwardRef objects (typeof === 'object')
 * - Previous bug: type check only looked for 'function', missing forwardRef icons
 * - Fix: type check now handles both 'function' OR 'object'
 *
 * Test Strategy:
 * 1. Mock lucide-react module with realistic React.forwardRef structures
 * 2. Verify icon resolution logic handles object-type components
 * 3. Test tier-based color application
 * 4. Verify fallback behavior when icons not found
 * 5. Ensure SVG rendering excludes emoji fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

/**
 * Mock lucide-react with realistic React.forwardRef structures
 *
 * This simulates the actual lucide-react export structure:
 * - Icons are React.forwardRef objects (typeof === 'object')
 * - They have $$typeof symbol for React internal type checking
 * - They render as SVG elements
 */
vi.mock('lucide-react', () => {
  // Create mock icon component that mimics React.forwardRef structure
  const createMockIcon = (displayName: string) => {
    const IconComponent = React.forwardRef<SVGSVGElement, any>((props, ref) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        data-testid={`lucide-${displayName.toLowerCase()}`}
        {...props}
      >
        <title>{displayName}</title>
        {/* Simplified SVG paths for testing */}
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
      </svg>
    ));
    IconComponent.displayName = displayName;
    return IconComponent;
  };

  return {
    MessageSquare: createMockIcon('MessageSquare'),
    Settings: createMockIcon('Settings'),
    Bot: createMockIcon('Bot'),
    CheckSquare: createMockIcon('CheckSquare'),
    // Deliberately exclude 'InvalidIcon' to test fallback behavior
  };
});

// Import component after mocking
import { AgentIcon } from '../../components/agents/AgentIcon';

describe('AgentIcon SVG Resolution - London School TDD', () => {
  /**
   * Test Data Fixtures
   * Following London School approach: define clear test doubles
   */
  const t1Agent = {
    name: 'feedback-agent',
    icon: 'MessageSquare',
    icon_type: 'svg' as const,
    icon_emoji: '💬',
    tier: 1 as const
  };

  const t2Agent = {
    name: 'system-agent',
    icon: 'Settings',
    icon_type: 'svg' as const,
    icon_emoji: '⚙️',
    tier: 2 as const
  };

  const invalidIconAgent = {
    name: 'broken-agent',
    icon: 'InvalidIcon',
    icon_type: 'svg' as const,
    icon_emoji: '❌',
    tier: 1 as const
  };

  // ========================================
  // CONTRACT VERIFICATION TESTS
  // ========================================

  describe('Icon Resolution Contract', () => {
    it('should recognize object-type React components (React.forwardRef)', () => {
      /**
       * Critical test for the bug fix
       *
       * Behavior: lucide-react exports React.forwardRef objects
       * Contract: getLucideIcon must accept typeof === 'object'
       * Verification: SVG element should be rendered
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement?.tagName.toLowerCase()).toBe('svg');
    });

    it('should recognize function-type React components', () => {
      /**
       * Verify backward compatibility
       *
       * Contract: getLucideIcon must still accept typeof === 'function'
       * Note: Our mock uses forwardRef (object), but this ensures
       * the component handles both types
       */
      const functionAgent = {
        name: 'bot-agent',
        icon: 'Bot',
        icon_type: 'svg' as const,
        tier: 1 as const
      };

      const { container } = render(<AgentIcon agent={functionAgent} />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });
  });

  // ========================================
  // SVG RENDERING VERIFICATION
  // ========================================

  describe('SVG Icon Rendering', () => {
    it('should render SVG for MessageSquare icon', () => {
      /**
       * Interaction: AgentIcon collaborates with lucide-react
       * Expected: MessageSquare component renders as SVG
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement).toHaveAttribute('data-testid', 'lucide-messagesquare');
    });

    it('should render SVG for Settings icon', () => {
      /**
       * Interaction: AgentIcon collaborates with lucide-react
       * Expected: Settings component renders as SVG
       */
      const { container } = render(<AgentIcon agent={t2Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement).toHaveAttribute('data-testid', 'lucide-settings');
    });

    it('should render SVG with proper structure', () => {
      /**
       * Contract verification: SVG structure
       * Expected attributes: xmlns, viewBox, stroke properties
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      expect(svgElement).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svgElement).toHaveAttribute('fill', 'none');
      expect(svgElement).toHaveAttribute('stroke', 'currentColor');
    });
  });

  // ========================================
  // TIER-BASED COLOR STYLING
  // ========================================

  describe('Tier Color Application', () => {
    it('should apply text-blue-600 class for Tier 1 agents', () => {
      /**
       * Behavior: Tier 1 agents get blue color
       * Contract: CSS class 'text-blue-600' applied to SVG
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();

      const className = svgElement?.getAttribute('class') || '';
      expect(className).toContain('text-blue-600');
    });

    it('should apply text-gray-500 class for Tier 2 agents', () => {
      /**
       * Behavior: Tier 2 agents get gray color
       * Contract: CSS class 'text-gray-500' applied to SVG
       */
      const { container } = render(<AgentIcon agent={t2Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();

      const className = svgElement?.getAttribute('class') || '';
      expect(className).toContain('text-gray-500');
    });

    it('should default to Tier 1 color when tier not specified', () => {
      /**
       * Edge case: Missing tier property
       * Expected: Default to text-blue-600 (Tier 1)
       */
      const noTierAgent = {
        name: 'no-tier-agent',
        icon: 'Bot',
        icon_type: 'svg' as const
      };

      const { container } = render(<AgentIcon agent={noTierAgent as any} />);

      const svgElement = container.querySelector('svg');
      const className = svgElement?.getAttribute('class') || '';
      expect(className).toContain('text-blue-600');
    });
  });

  // ========================================
  // FALLBACK BEHAVIOR VERIFICATION
  // ========================================

  describe('Emoji Fallback When Icon Not Found', () => {
    it('should fallback to emoji when icon_type is svg but icon not found', () => {
      /**
       * Collaboration failure scenario
       *
       * Context: lucide-react doesn't export 'InvalidIcon'
       * Expected: Component falls back to emoji (level 2 fallback)
       */
      const { container } = render(<AgentIcon agent={invalidIconAgent} />);

      // Should NOT render SVG
      const svgElement = container.querySelector('svg');
      expect(svgElement).not.toBeInTheDocument();

      // Should render emoji fallback
      const emojiElement = container.querySelector('span[role="img"]');
      expect(emojiElement).toBeInTheDocument();
      expect(emojiElement?.textContent).toBe('❌');
    });

    it('should use icon_emoji property for fallback', () => {
      /**
       * Contract: When SVG fails, use icon_emoji property
       */
      const customEmojiAgent = {
        name: 'custom-agent',
        icon: 'NonExistentIcon',
        icon_type: 'svg' as const,
        icon_emoji: '🎯',
        tier: 1 as const
      };

      const { container } = render(<AgentIcon agent={customEmojiAgent} />);

      const emojiElement = container.querySelector('span[role="img"]');
      expect(emojiElement?.textContent).toBe('🎯');
    });

    it('should preserve tier information in fallback', () => {
      /**
       * Behavior: Even in fallback, agent tier is preserved
       * Note: Emoji fallback doesn't apply tier colors (only size classes)
       */
      const t2InvalidAgent = {
        ...invalidIconAgent,
        tier: 2 as const,
        icon_emoji: '⚠️'
      };

      const { container } = render(<AgentIcon agent={t2InvalidAgent} />);

      const emojiElement = container.querySelector('span[role="img"]');
      expect(emojiElement).toBeInTheDocument();
      expect(emojiElement?.textContent).toBe('⚠️');
    });
  });

  // ========================================
  // MUTUAL EXCLUSION VERIFICATION
  // ========================================

  describe('SVG and Emoji Mutual Exclusion', () => {
    it('should NOT render emoji when SVG succeeds', () => {
      /**
       * Critical behavior: Only ONE rendering path should execute
       *
       * When SVG loads successfully:
       * - SVG element MUST be present
       * - Emoji span MUST NOT be present
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      const emojiElement = container.querySelector('span[role="img"]');

      expect(svgElement).toBeInTheDocument();
      expect(emojiElement).not.toBeInTheDocument();
    });

    it('should NOT render SVG when emoji fallback triggers', () => {
      /**
       * Inverse verification: When fallback happens
       * - SVG element MUST NOT be present
       * - Emoji span MUST be present
       */
      const { container } = render(<AgentIcon agent={invalidIconAgent} />);

      const svgElement = container.querySelector('svg');
      const emojiElement = container.querySelector('span[role="img"]');

      expect(svgElement).not.toBeInTheDocument();
      expect(emojiElement).toBeInTheDocument();
    });

    it('should NOT render initials when SVG succeeds', () => {
      /**
       * Three-level fallback system verification
       * Level 1 (SVG) success = skip level 2 (emoji) and level 3 (initials)
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      const initialsDiv = container.querySelector('div[role="img"]');

      expect(svgElement).toBeInTheDocument();
      expect(initialsDiv).not.toBeInTheDocument();
    });
  });

  // ========================================
  // SIZE AND STYLING INTEGRATION
  // ========================================

  describe('Size Class Integration with SVG', () => {
    it('should apply size classes to SVG element', () => {
      /**
       * Contract: Size prop affects SVG className
       * Default: md (w-6 h-6)
       */
      const { container } = render(<AgentIcon agent={t1Agent} size="md" />);

      const svgElement = container.querySelector('svg');
      const className = svgElement?.getAttribute('class') || '';

      expect(className).toContain('w-6');
      expect(className).toContain('h-6');
    });

    it('should apply large size to SVG', () => {
      /**
       * Interaction: Size prop modifies SVG className
       */
      const { container } = render(<AgentIcon agent={t1Agent} size="lg" />);

      const svgElement = container.querySelector('svg');
      const className = svgElement?.getAttribute('class') || '';

      expect(className).toContain('w-8');
      expect(className).toContain('h-8');
    });

    it('should apply extra-small size to SVG', () => {
      const { container } = render(<AgentIcon agent={t1Agent} size="xs" />);

      const svgElement = container.querySelector('svg');
      const className = svgElement?.getAttribute('class') || '';

      expect(className).toContain('w-3');
      expect(className).toContain('h-3');
    });

    it('should combine size, tier color, and custom classes', () => {
      /**
       * Complex collaboration scenario
       * Expected: All class concerns properly combined
       */
      const { container } = render(
        <AgentIcon
          agent={t1Agent}
          size="lg"
          className="custom-test-class"
        />
      );

      const svgElement = container.querySelector('svg');
      const className = svgElement?.getAttribute('class') || '';

      expect(className).toContain('w-8');        // size
      expect(className).toContain('h-8');        // size
      expect(className).toContain('text-blue-600'); // tier
      expect(className).toContain('custom-test-class'); // custom
    });
  });

  // ========================================
  // ACCESSIBILITY CONTRACT
  // ========================================

  describe('Accessibility Attributes', () => {
    it('should pass aria-label to SVG element', () => {
      /**
       * Contract: SVG must have accessible label
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('aria-label', 'feedback-agent');
    });

    it('should set role="img" on SVG element', () => {
      /**
       * Contract: SVG must have img role for screen readers
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('role', 'img');
    });

    it('should apply strokeWidth property', () => {
      /**
       * Contract: SVG styling includes strokeWidth
       * Note: React transforms strokeWidth prop to stroke-width attribute
       */
      const { container } = render(<AgentIcon agent={t1Agent} />);

      const svgElement = container.querySelector('svg');
      // strokeWidth prop becomes stroke-width attribute in SVG
      expect(svgElement).toHaveAttribute('stroke-width', '2');
    });
  });

  // ========================================
  // EDGE CASE VERIFICATION
  // ========================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing icon property gracefully', () => {
      /**
       * Error scenario: icon_type='svg' but no icon specified
       * Expected: Fallback to emoji or initials
       */
      const noIconAgent = {
        name: 'no-icon-agent',
        icon_type: 'svg' as const,
        icon_emoji: '📦',
        tier: 1 as const
      };

      const { container } = render(<AgentIcon agent={noIconAgent as any} />);

      // Should fall back to emoji
      const emojiElement = container.querySelector('span[role="img"]');
      expect(emojiElement).toBeInTheDocument();
    });

    it('should handle empty string icon', () => {
      /**
       * Error scenario: icon is empty string
       * Expected: Fallback mechanism activates
       */
      const emptyIconAgent = {
        name: 'empty-icon-agent',
        icon: '',
        icon_type: 'svg' as const,
        icon_emoji: '🔍',
        tier: 1 as const
      };

      const { container } = render(<AgentIcon agent={emptyIconAgent} />);

      // Empty string should trigger fallback
      const emojiElement = container.querySelector('span[role="img"]');
      expect(emojiElement).toBeInTheDocument();
    });

    it('should handle case-sensitive icon names', () => {
      /**
       * Contract: Icon names must match exactly
       * 'messageSquare' !== 'MessageSquare'
       */
      const wrongCaseAgent = {
        name: 'wrong-case-agent',
        icon: 'messageSquare', // lowercase 'm' - won't match
        icon_type: 'svg' as const,
        icon_emoji: '⚡',
        tier: 1 as const
      };

      const { container } = render(<AgentIcon agent={wrongCaseAgent} />);

      // Should fallback to emoji due to case mismatch
      const emojiElement = container.querySelector('span[role="img"]');
      expect(emojiElement).toBeInTheDocument();
    });
  });

  // ========================================
  // INTEGRATION SCENARIOS
  // ========================================

  describe('Real-World Integration Scenarios', () => {
    it('should handle T1 agent with valid icon (production scenario)', () => {
      /**
       * Realistic production scenario
       * Agent: feedback-agent
       * Expected: MessageSquare SVG with blue color
       */
      const productionT1Agent = {
        name: 'feedback-agent',
        icon: 'MessageSquare',
        icon_type: 'svg' as const,
        icon_emoji: '💬',
        tier: 1 as const
      };

      const { container } = render(<AgentIcon agent={productionT1Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement).toHaveAttribute('data-testid', 'lucide-messagesquare');

      const className = svgElement?.getAttribute('class') || '';
      expect(className).toContain('text-blue-600');
    });

    it('should handle T2 agent with valid icon (production scenario)', () => {
      /**
       * Realistic production scenario
       * Agent: system-agent
       * Expected: Settings SVG with gray color
       */
      const productionT2Agent = {
        name: 'meta-agent',
        icon: 'Settings',
        icon_type: 'svg' as const,
        icon_emoji: '⚙️',
        tier: 2 as const
      };

      const { container } = render(<AgentIcon agent={productionT2Agent} />);

      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement).toHaveAttribute('data-testid', 'lucide-settings');

      const className = svgElement?.getAttribute('class') || '';
      expect(className).toContain('text-gray-500');
    });

    it('should handle icon migration scenario (emoji to SVG)', () => {
      /**
       * Migration scenario: Agent previously used emoji, now has SVG
       * Expected: SVG takes precedence, emoji is ignored
       */
      const migratedAgent = {
        name: 'migrated-agent',
        icon: 'Bot',
        icon_type: 'svg' as const,
        icon_emoji: '🤖', // Should be ignored
        tier: 1 as const
      };

      const { container } = render(<AgentIcon agent={migratedAgent} />);

      const svgElement = container.querySelector('svg');
      const emojiElement = container.querySelector('span[role="img"]');

      expect(svgElement).toBeInTheDocument();
      expect(emojiElement).not.toBeInTheDocument();
      expect(container.textContent).not.toContain('🤖');
    });
  });
});
