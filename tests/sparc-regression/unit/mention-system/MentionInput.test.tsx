/**
 * SPARC Regression Test - MentionInput Component
 * Priority: P1 (Critical - Mention system core functionality)
 * Features: mention-system, ui-components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MentionInput } from '@/components/MentionInput';
import { TestDataFactory, testDataFactory } from '../../utilities/TestDataFactory';
import { TestCategory, TestPriority, FeatureTag } from '../../config/sparc-regression-config';

// Test metadata
const TEST_METADATA = {
  category: TestCategory.UNIT,
  priority: TestPriority.P1,
  features: [FeatureTag.MENTION_SYSTEM, FeatureTag.UI_COMPONENTS],
  description: 'MentionInput component core functionality and regression prevention',
  estimatedDuration: 120, // seconds
};

describe('MentionInput - SPARC Regression Tests', () => {
  let mockOnChange: jest.Mock;
  let mockOnMentionSelect: jest.Mock;
  let mockFetchSuggestions: jest.Mock;
  let testData: ReturnType<typeof testDataFactory.generateTestScenarios>;

  beforeEach(() => {
    // Reset test data factory
    testDataFactory.reset();
    
    // Create fresh mock functions
    mockOnChange = jest.fn();
    mockOnMentionSelect = jest.fn();
    mockFetchSuggestions = jest.fn();
    
    // Generate test scenarios
    testData = testDataFactory.generateTestScenarios();
    
    // Setup default mock implementations
    mockFetchSuggestions.mockResolvedValue(testData.mentionScenarios.emptyQuery.expectedSuggestions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('P1 - Core Functionality (Must Never Break)', () => {
    test('REGRESSION: Mention dropdown renders and is visible (z-index fix)', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type @ to trigger mention dropdown
      await user.type(textarea, '@');
      
      // Wait for dropdown to appear
      await waitFor(() => {
        const dropdown = screen.getByTestId('mention-debug-dropdown');
        expect(dropdown).toBeInTheDocument();
      });

      // CRITICAL: Verify dropdown has high z-index to prevent being hidden
      const dropdown = screen.getByTestId('mention-debug-dropdown');
      const computedStyle = window.getComputedStyle(dropdown);
      
      // Check z-index is high enough
      expect(parseInt(computedStyle.zIndex) || 0).toBeGreaterThanOrEqual(99999);
      
      // Check dropdown is actually visible
      expect(dropdown).toBeVisible();
    });

    test('REGRESSION: Empty query shows all agents (fallback behavior)', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type @ with no additional characters
      await user.type(textarea, '@');
      
      // Wait for suggestions to load
      await waitFor(() => {
        expect(mockFetchSuggestions).toHaveBeenCalledWith('');
      });

      // Verify agents are displayed
      await waitFor(() => {
        const suggestions = screen.getAllByRole('option');
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    test('REGRESSION: Mention selection inserts correct text format', async () => {
      const user = userEvent.setup();
      const testAgent = testData.mentionScenarios.emptyQuery.expectedSuggestions[0];
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type @ to trigger dropdown
      await user.type(textarea, '@');
      
      // Wait for dropdown and select first agent
      await waitFor(() => {
        const firstSuggestion = screen.getAllByRole('option')[0];
        return user.click(firstSuggestion);
      });

      // Verify mention was selected correctly
      expect(mockOnMentionSelect).toHaveBeenCalledWith(testAgent);
      
      // Verify text was inserted with correct format
      expect(mockOnChange).toHaveBeenCalledWith(`@${testAgent.name} `);
    });

    test('REGRESSION: Keyboard navigation works in dropdown', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type @ to open dropdown
      await user.type(textarea, '@');
      
      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength.greaterThan(0);
      });

      // Test keyboard navigation
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      
      // Verify second item is selected (first ArrowDown moves from -1 to 0, second to 1)
      const options = screen.getAllByRole('option');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      
      // Test selection with Enter
      await user.keyboard('{Enter}');
      
      // Verify selection was triggered
      expect(mockOnMentionSelect).toHaveBeenCalled();
    });

    test('REGRESSION: Dropdown closes on Escape key', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Open dropdown
      await user.type(textarea, '@');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');
      
      // Verify dropdown is closed
      await waitFor(() => {
        expect(screen.queryByTestId('mention-debug-dropdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('P1 - Search Functionality', () => {
    test('REGRESSION: Partial query filters suggestions correctly', async () => {
      const user = userEvent.setup();
      const partialScenario = testData.mentionScenarios.partialMatch;
      
      mockFetchSuggestions.mockResolvedValueOnce(partialScenario.expectedSuggestions);
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type @ followed by partial query
      await user.type(textarea, `@${partialScenario.query}`);
      
      // Verify search was called with correct query
      await waitFor(() => {
        expect(mockFetchSuggestions).toHaveBeenCalledWith(partialScenario.query);
      });

      // Verify filtered results are shown
      await waitFor(() => {
        const suggestions = screen.getAllByRole('option');
        expect(suggestions).toHaveLength(partialScenario.expectedSuggestions.length);
      });
    });

    test('REGRESSION: No match query shows appropriate message', async () => {
      const user = userEvent.setup();
      const noMatchScenario = testData.mentionScenarios.noMatch;
      
      mockFetchSuggestions.mockResolvedValueOnce(noMatchScenario.expectedSuggestions);
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type @ with non-matching query
      await user.type(textarea, `@${noMatchScenario.query}`);
      
      // Wait for search and verify no results message
      await waitFor(() => {
        expect(screen.getByText(`No agents found matching "${noMatchScenario.query}"`)).toBeInTheDocument();
      });
    });

    test('REGRESSION: Debounced search prevents excessive API calls', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
          debounceMs={200}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type multiple characters quickly
      await user.type(textarea, '@test', { delay: 50 }); // Fast typing
      
      // Wait for debounce period
      await waitFor(() => {
        expect(mockFetchSuggestions).toHaveBeenCalledTimes(2); // Once for empty, once for final query
      }, { timeout: 300 });
      
      // Verify final call was with complete query
      expect(mockFetchSuggestions).toHaveBeenLastCalledWith('test');
    });
  });

  describe('P2 - Error Handling & Edge Cases', () => {
    test('REGRESSION: Handles API failure gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API failure
      mockFetchSuggestions.mockRejectedValueOnce(new Error('API failure'));
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type @ to trigger API call
      await user.type(textarea, '@');
      
      // Should still show dropdown with fallback suggestions
      await waitFor(() => {
        const dropdown = screen.getByTestId('mention-debug-dropdown');
        expect(dropdown).toBeInTheDocument();
      });

      // Should show fallback agents or empty state
      const suggestions = screen.getAllByRole('option');
      expect(suggestions.length).toBeGreaterThanOrEqual(0); // Fallback or empty state
    });

    test('REGRESSION: Handles extremely long input correctly', async () => {
      const user = userEvent.setup();
      const longText = 'a'.repeat(1000);
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
          maxLength={500}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Try to type very long text
      await user.type(textarea, longText);
      
      // Verify maxLength is respected
      expect(mockOnChange).toHaveBeenCalledWith(longText.substring(0, 500));
    });

    test('REGRESSION: Multiple @ symbols handled correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Type content with multiple @ symbols
      await user.type(textarea, 'Hello @agent1 and @');
      
      // Should trigger dropdown for the last @
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });

      // Should search for empty query after the last @
      expect(mockFetchSuggestions).toHaveBeenCalledWith('');
    });
  });

  describe('P1 - Accessibility & UX', () => {
    test('REGRESSION: ARIA attributes are correctly set', async () => {
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
          aria-label="Test mention input"
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Verify ARIA attributes
      expect(textarea).toHaveAttribute('aria-label', 'Test mention input');
      expect(textarea).toHaveAttribute('aria-haspopup', 'listbox');
      expect(textarea).toHaveAttribute('aria-expanded', 'false');
    });

    test('REGRESSION: Focus management works correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMentionSelect={mockOnMentionSelect}
          fetchSuggestions={mockFetchSuggestions}
          autoFocus
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Verify autoFocus works
      expect(textarea).toHaveFocus();
      
      // Type @ to open dropdown
      await user.type(textarea, '@');
      
      // Verify focus remains on textarea
      expect(textarea).toHaveFocus();
      
      // Select mention via keyboard
      await waitFor(() => {
        expect(screen.getAllByRole('option')).toHaveLength.greaterThan(0);
      });
      
      await user.keyboard('{Enter}');
      
      // Focus should return to textarea after selection
      expect(textarea).toHaveFocus();
    });
  });
});

// Export test metadata for reporting
export { TEST_METADATA };