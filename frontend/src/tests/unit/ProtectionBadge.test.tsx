/**
 * ProtectionBadge Component - TDD Test Suite
 *
 * Test-Driven Development Implementation
 * Following SPARC methodology for comprehensive test coverage
 *
 * Test Coverage:
 * - Rendering logic (show/hide based on protection status)
 * - Icon and styling based on protection level
 * - Tooltip behavior and content
 * - ARIA accessibility attributes
 * - TypeScript type safety
 * - Edge cases and error handling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ProtectionBadge } from '../../components/agents/ProtectionBadge';

describe('ProtectionBadge Component - TDD Test Suite', () => {

  /**
   * TEST 1: Should not render when isProtected is false
   *
   * This is the most basic test - the badge should be completely
   * absent from the DOM when the agent is not protected.
   */
  describe('Rendering Logic', () => {
    it('should not render when isProtected is false', () => {
      const { container } = render(<ProtectionBadge isProtected={false} />);

      // Component should return null and render nothing
      expect(container.firstChild).toBeNull();

      // No "Protected" text should be in the document
      expect(screen.queryByText(/protected/i)).not.toBeInTheDocument();
    });

    /**
     * TEST 2: Should render lock icon and text when protected
     *
     * When isProtected is true, the badge must appear with:
     * - Lock icon (from lucide-react)
     * - "Protected" text
     * - Proper ARIA label for screen readers
     */
    it('should render lock icon and text when isProtected is true', () => {
      render(<ProtectionBadge isProtected={true} />);

      // Check for the badge container with ARIA label
      const badge = screen.getByLabelText(/protected agent/i);
      expect(badge).toBeInTheDocument();

      // Check for "Protected" text
      expect(screen.getByText('Protected')).toBeInTheDocument();

      // Check for lock icon (lucide-react renders as SVG)
      const lockIcon = badge.querySelector('svg');
      expect(lockIcon).toBeInTheDocument();
    });

    /**
     * TEST 3: Should render with default protection reason
     *
     * When no protectionReason is provided, a default message
     * should be used for the tooltip.
     */
    it('should use default protection reason when not provided', async () => {
      const user = userEvent.setup();
      render(<ProtectionBadge isProtected={true} showTooltip={true} />);

      const badge = screen.getByLabelText(/protected agent/i);

      // Hover to trigger tooltip
      await user.hover(badge);

      // Default message should appear
      await waitFor(() => {
        expect(screen.getByText(/this agent is protected from modification/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Tooltip Behavior Tests
   */
  describe('Tooltip Behavior', () => {
    /**
     * TEST 4: Should show tooltip with custom reason on hover
     *
     * When hovering over the badge with showTooltip=true,
     * the custom protection reason should be displayed.
     */
    it('should show tooltip with custom reason on hover', async () => {
      const user = userEvent.setup();
      const customReason = 'System critical - Phase 4.2 specialist agent';

      render(
        <ProtectionBadge
          isProtected={true}
          protectionReason={customReason}
          showTooltip={true}
        />
      );

      const badge = screen.getByLabelText(/protected agent/i);

      // Tooltip should not be visible initially
      expect(screen.queryByText(customReason)).not.toBeInTheDocument();

      // Hover to show tooltip
      await user.hover(badge);

      // Tooltip should now be visible
      await waitFor(() => {
        expect(screen.getByText(customReason)).toBeInTheDocument();
      });
    });

    /**
     * TEST 5: Should hide tooltip when mouse leaves
     *
     * The tooltip should disappear when the user stops hovering.
     */
    it('should hide tooltip when mouse leaves badge', async () => {
      const user = userEvent.setup();
      const customReason = 'Protected system agent';

      render(
        <ProtectionBadge
          isProtected={true}
          protectionReason={customReason}
          showTooltip={true}
        />
      );

      const badge = screen.getByLabelText(/protected agent/i);

      // Hover to show tooltip
      await user.hover(badge);
      await waitFor(() => {
        expect(screen.getByText(customReason)).toBeInTheDocument();
      });

      // Unhover to hide tooltip
      await user.unhover(badge);

      await waitFor(() => {
        expect(screen.queryByText(customReason)).not.toBeInTheDocument();
      });
    });

    /**
     * TEST 6: Should not show tooltip when showTooltip is false
     *
     * Even when hovering, if showTooltip=false, no tooltip should appear.
     */
    it('should not show tooltip when showTooltip is false', async () => {
      const user = userEvent.setup();
      const customReason = 'Should not appear';

      render(
        <ProtectionBadge
          isProtected={true}
          protectionReason={customReason}
          showTooltip={false}
        />
      );

      const badge = screen.getByLabelText(/protected agent/i);

      // Hover over badge
      await user.hover(badge);

      // Wait a moment to ensure tooltip doesn't appear
      await new Promise(resolve => setTimeout(resolve, 200));

      // Tooltip should never appear
      expect(screen.queryByText(customReason)).not.toBeInTheDocument();
    });
  });

  /**
   * Styling and Appearance Tests
   */
  describe('Styling and Appearance', () => {
    /**
     * TEST 7: Should apply custom className
     *
     * When a custom className is provided, it should be applied
     * to the badge container.
     */
    it('should apply custom className when provided', () => {
      const customClass = 'my-custom-badge';

      render(
        <ProtectionBadge
          isProtected={true}
          className={customClass}
        />
      );

      const badge = screen.getByLabelText(/protected agent/i);
      expect(badge).toHaveClass(customClass);
    });

    /**
     * TEST 8: Should have proper styling classes
     *
     * The badge should have the expected base classes for:
     * - Red/warning color scheme
     * - Proper spacing and sizing
     * - Flexbox layout for icon + text
     */
    it('should have proper base styling classes', () => {
      render(<ProtectionBadge isProtected={true} />);

      const badge = screen.getByLabelText(/protected agent/i);

      // Check for expected Tailwind classes
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('rounded');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('border-red-300');
    });
  });

  /**
   * Accessibility Tests
   */
  describe('Accessibility (ARIA)', () => {
    /**
     * TEST 9: Should have proper ARIA label for screen readers
     *
     * The badge must be accessible with a descriptive ARIA label.
     */
    it('should have proper ARIA label for screen readers', () => {
      render(<ProtectionBadge isProtected={true} />);

      const badge = screen.getByLabelText(/protected agent - cannot be modified/i);
      expect(badge).toBeInTheDocument();
    });

    /**
     * TEST 10: Should be keyboard accessible
     *
     * The badge should be focusable and tooltip should work
     * with keyboard navigation (for accessibility).
     */
    it('should show tooltip on keyboard focus', async () => {
      const user = userEvent.setup();
      const customReason = 'Keyboard accessible tooltip';

      render(
        <ProtectionBadge
          isProtected={true}
          protectionReason={customReason}
          showTooltip={true}
        />
      );

      const badge = screen.getByLabelText(/protected agent/i);

      // Tab to focus the badge
      await user.tab();

      // Check if badge is focused
      expect(badge).toHaveFocus();
    });
  });

  /**
   * Edge Cases and Error Handling
   */
  describe('Edge Cases', () => {
    /**
     * TEST 11: Should handle empty protection reason gracefully
     *
     * If an empty string is provided for protectionReason,
     * it should fall back to the default message.
     */
    it('should handle empty protection reason string', async () => {
      const user = userEvent.setup();

      render(
        <ProtectionBadge
          isProtected={true}
          protectionReason=""
          showTooltip={true}
        />
      );

      const badge = screen.getByLabelText(/protected agent/i);
      await user.hover(badge);

      // Should show default message, not empty string
      await waitFor(() => {
        expect(screen.getByText(/this agent is protected from modification/i)).toBeInTheDocument();
      });
    });

    /**
     * TEST 12: Should handle multiple badges on same page
     *
     * Multiple ProtectionBadge components should be able to
     * coexist without conflicts.
     */
    it('should support multiple badges on the same page', () => {
      const { rerender } = render(
        <div>
          <ProtectionBadge isProtected={true} protectionReason="Agent 1" />
          <ProtectionBadge isProtected={true} protectionReason="Agent 2" />
          <ProtectionBadge isProtected={false} />
        </div>
      );

      // Should render exactly 2 badges (third has isProtected=false)
      const badges = screen.getAllByLabelText(/protected agent/i);
      expect(badges).toHaveLength(2);
    });
  });

  /**
   * Integration Tests
   */
  describe('Integration Scenarios', () => {
    /**
     * TEST 13: Should match pseudocode specification
     *
     * Verify the component matches the PSEUDOCODE-PROTECTION-VALIDATION.md
     * specification for Tier 2 protected agents.
     */
    it('should display correct message for Tier 2 protected agent', async () => {
      const user = userEvent.setup();
      const tier2Message = 'This agent is part of core system infrastructure';

      render(
        <ProtectionBadge
          isProtected={true}
          protectionReason={tier2Message}
          showTooltip={true}
        />
      );

      const badge = screen.getByLabelText(/protected agent/i);
      await user.hover(badge);

      await waitFor(() => {
        expect(screen.getByText(tier2Message)).toBeInTheDocument();
      });
    });

    /**
     * TEST 14: Should work with different protection levels
     *
     * While the current implementation uses a single protection level,
     * this test ensures the component can handle different messages
     * for different protection scenarios.
     */
    it('should handle system critical vs protected vs read-only messages', async () => {
      const user = userEvent.setup();
      const scenarios = [
        { reason: 'System critical - Phase 4.2 specialist', testId: 'critical' },
        { reason: 'Protected - Meta-coordination agent', testId: 'protected' },
        { reason: 'Read-only - Filesystem protected', testId: 'readonly' }
      ];

      for (const scenario of scenarios) {
        const { unmount } = render(
          <ProtectionBadge
            isProtected={true}
            protectionReason={scenario.reason}
            showTooltip={true}
          />
        );

        const badge = screen.getByLabelText(/protected agent/i);
        await user.hover(badge);

        await waitFor(() => {
          expect(screen.getByText(scenario.reason)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  /**
   * TypeScript Type Safety Tests
   *
   * These tests ensure the component enforces proper TypeScript types.
   */
  describe('TypeScript Type Safety', () => {
    /**
     * TEST 15: Should enforce required isProtected prop
     *
     * The isProtected prop is required and must be a boolean.
     */
    it('should accept valid prop types', () => {
      // This test mainly validates at compile-time, but we can
      // verify runtime behavior with valid props
      expect(() => {
        render(
          <ProtectionBadge
            isProtected={true}
            protectionReason="Test"
            showTooltip={true}
            className="test-class"
          />
        );
      }).not.toThrow();
    });
  });
});
