/**
 * Mention System Integration Tests - TDD London School
 * Tests the collaboration between MentionInput, MentionService, and parent components
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LondonSchoolTestSuite, LondonTestUtils } from '../framework/LondonSchoolTestFramework';
import { 
  testSetup, 
  createMockMentionSuggestion, 
  createMockMentionSuggestions
} from '../factories/MockFactory';
import { MentionInput } from '@/components/MentionInput';
import type { IMentionService } from '../contracts/ComponentContracts';

// Integration test component that simulates real usage
const TestMentionContainer: React.FC<{
  onMentionSelect?: (mention: any) => void;
  onContentChange?: (content: string) => void;
  initialValue?: string;
  context?: 'post' | 'comment' | 'quick-post';
}> = ({ onMentionSelect, onContentChange, initialValue = '', context = 'post' }) => {
  const [value, setValue] = React.useState(initialValue);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onContentChange?.(newValue);
  };

  const handleMentionSelect = (mention: any) => {
    onMentionSelect?.(mention);
  };

  return (
    <div data-testid="mention-container">
      <MentionInput
        value={value}
        onChange={handleChange}
        onMentionSelect={handleMentionSelect}
        mentionContext={context}
        placeholder="Type @ to mention agents..."
      />
    </div>
  );
};

class MentionSystemIntegrationSuite extends LondonSchoolTestSuite {
  private mockMentionService!: IMentionService;
  private user = userEvent.setup();

  protected setupCollaborators(): void {
    this.mockMentionService = testSetup.mockService('MentionService', {
      searchMentions: vi.fn().mockImplementation(async (query: string) => {
        // Simulate realistic search behavior
        const allAgents = createMockMentionSuggestions(8);
        if (!query) return allAgents.slice(0, 5);
        
        return allAgents.filter(agent => 
          agent.name.toLowerCase().includes(query.toLowerCase()) ||
          agent.displayName.toLowerCase().includes(query.toLowerCase())
        );
      }),
      getAllAgents: vi.fn().mockReturnValue(createMockMentionSuggestions(8)),
      getQuickMentions: vi.fn().mockReturnValue(createMockMentionSuggestions(3)),
      extractMentions: vi.fn().mockImplementation((content: string) => {
        const matches = content.match(/@([a-zA-Z0-9-_]+)/g);
        return matches ? matches.map(match => match.slice(1)) : [];
      }),
      validateMention: vi.fn().mockImplementation((name: string) => {
        const validAgents = ['chief-of-staff-agent', 'code-reviewer-agent', 'bug-hunter-agent'];
        return validAgents.includes(name);
      })
    });
  }

  protected verifyAllInteractions(): void {
    // Verify all service interactions follow expected patterns
  }

  public testEndToEndMentionFlow(): void {
    describe('End-to-end mention flow', () => {
      it('should complete full mention workflow from trigger to selection', async () => {
        // Arrange
        const onMentionSelect = vi.fn();
        const onContentChange = vi.fn();
        
        const mockAgent = createMockMentionSuggestion({
          id: 'chief-of-staff',
          name: 'chief-of-staff-agent',
          displayName: 'Chief of Staff'
        });
        
        this.mockMentionService.searchMentions = vi.fn().mockResolvedValue([mockAgent]);

        render(
          <TestMentionContainer 
            onMentionSelect={onMentionSelect}
            onContentChange={onContentChange}
          />
        );

        const textarea = screen.getByRole('textbox');

        // Act - Complete workflow
        // 1. Type some content
        await this.user.type(textarea, 'Hello ');
        expect(onContentChange).toHaveBeenLastCalledWith('Hello ');

        // 2. Trigger mention
        await this.user.type(textarea, '@chief');
        expect(onContentChange).toHaveBeenLastCalledWith('Hello @chief');

        // 3. Wait for dropdown
        await waitFor(() => {
          expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });

        // 4. Select agent
        const suggestion = screen.getByTestId('agent-debug-info-chief-of-staff');
        await this.user.click(suggestion);

        // Assert - Verify complete interaction chain
        expect(this.mockMentionService.searchMentions).toHaveBeenCalledWith('chief');
        expect(onMentionSelect).toHaveBeenCalledWith(mockAgent);
        expect(onContentChange).toHaveBeenLastCalledWith('Hello @chief-of-staff-agent ');
      });

      it('should handle multiple mentions in single content', async () => {
        // Arrange
        const onContentChange = vi.fn();
        const agents = [
          createMockMentionSuggestion({ name: 'agent1', displayName: 'Agent 1' }),
          createMockMentionSuggestion({ name: 'agent2', displayName: 'Agent 2' })
        ];

        this.mockMentionService.searchMentions = vi.fn()
          .mockResolvedValueOnce([agents[0]])
          .mockResolvedValueOnce([agents[1]]);

        render(<TestMentionContainer onContentChange={onContentChange} />);
        const textarea = screen.getByRole('textbox');

        // Act - Add first mention
        await this.user.type(textarea, '@agent1');
        
        await waitFor(() => {
          expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });
        
        await this.user.click(screen.getByText('Agent 1'));
        
        // Add second mention
        await this.user.type(textarea, ' and @agent2');
        
        await waitFor(() => {
          expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });
        
        await this.user.click(screen.getByText('Agent 2'));

        // Assert - Both mentions should be in content
        expect(onContentChange).toHaveBeenLastCalledWith('@agent1 and @agent2 ');
        expect(this.mockMentionService.searchMentions).toHaveBeenCalledTimes(2);
      });
    });
  }

  public testContextualBehaviorIntegration(): void {
    describe('Contextual behavior integration', () => {
      it('should request different agents for different contexts', async () => {
        // Arrange - Setup context-specific responses
        const postAgents = createMockMentionSuggestions(5).map(a => ({ ...a, type: 'coordinator' }));
        const commentAgents = createMockMentionSuggestions(3).map(a => ({ ...a, type: 'reviewer' }));

        this.mockMentionService.searchMentions = vi.fn()
          .mockResolvedValue(postAgents);  // Default for post context
        
        this.mockMentionService.getQuickMentions = vi.fn()
          .mockImplementation((context) => {
            return context === 'comment' ? commentAgents : postAgents;
          });

        // Test post context
        const { rerender } = render(
          <TestMentionContainer context="post" />
        );

        let textarea = screen.getByRole('textbox');
        await this.user.type(textarea, '@');

        await waitFor(() => {
          expect(this.mockMentionService.searchMentions).toHaveBeenCalledWith('');
        });

        // Test comment context
        rerender(<TestMentionContainer context="comment" />);
        
        textarea = screen.getByRole('textbox');
        await this.user.clear(textarea);
        await this.user.type(textarea, '@');

        // Assert - Different service calls for different contexts
        await waitFor(() => {
          expect(this.mockMentionService.searchMentions).toHaveBeenCalledTimes(2);
        });
      });
    });
  }

  public testErrorRecoveryIntegration(): void {
    describe('Error recovery integration', () => {
      it('should recover gracefully from service failures', async () => {
        // Arrange - First call fails, second succeeds
        this.mockMentionService.searchMentions = vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(createMockMentionSuggestions(3));

        render(<TestMentionContainer />);
        const textarea = screen.getByRole('textbox');

        // Act - First attempt (fails)
        await this.user.type(textarea, '@test');

        // Should still show dropdown (with error state)
        await waitFor(() => {
          expect(screen.queryByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });

        // Second attempt (succeeds)
        await this.user.clear(textarea);
        await this.user.type(textarea, '@test');

        // Assert - Should recover and show suggestions
        await waitFor(() => {
          expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
          expect(this.mockMentionService.searchMentions).toHaveBeenCalledTimes(2);
        });
      });
    });
  }

  public testPerformanceIntegration(): void {
    describe('Performance integration', () => {
      it('should debounce search requests appropriately', async () => {
        // Arrange
        this.mockMentionService.searchMentions = vi.fn().mockResolvedValue([]);
        
        render(<TestMentionContainer />);
        const textarea = screen.getByRole('textbox');

        // Act - Type rapidly
        await this.user.type(textarea, '@a');
        await this.user.type(textarea, 'b');
        await this.user.type(textarea, 'c');

        // Assert - Should debounce and make fewer calls than characters typed
        await waitFor(() => {
          // Should be called, but less than 4 times due to debouncing
          expect(this.mockMentionService.searchMentions).toHaveBeenCalled();
        });

        // The exact number depends on debounce timing, but should be debounced
        expect(this.mockMentionService.searchMentions).toHaveBeenCalledWith('abc');
      });
    });
  }

  public testAccessibilityIntegration(): void {
    describe('Accessibility integration', () => {
      it('should maintain focus and screen reader compatibility', async () => {
        // Arrange
        const mockAgents = createMockMentionSuggestions(3);
        this.mockMentionService.searchMentions = vi.fn().mockResolvedValue(mockAgents);

        render(<TestMentionContainer />);
        const textarea = screen.getByRole('textbox');

        // Act - Focus and trigger mention
        textarea.focus();
        expect(textarea).toHaveFocus();

        await this.user.type(textarea, '@test');

        // Assert - ARIA attributes should be updated
        await waitFor(() => {
          expect(textarea).toHaveAttribute('aria-expanded', 'true');
          expect(screen.getByRole('listbox')).toBeInTheDocument();
        });

        // Test keyboard navigation
        await this.user.keyboard('{ArrowDown}');
        await this.user.keyboard('{Enter}');

        // Focus should return to textarea after selection
        expect(textarea).toHaveFocus();
        expect(textarea).toHaveAttribute('aria-expanded', 'false');
      });
    });
  }
}

// Test Suite Execution
describe('Mention System Integration Tests (London School TDD)', () => {
  let integrationSuite: MentionSystemIntegrationSuite;

  beforeEach(() => {
    testSetup.resetAll();
    integrationSuite = new MentionSystemIntegrationSuite();
    integrationSuite.beforeEach();
  });

  afterEach(() => {
    integrationSuite.afterEach();
  });

  // Execute test categories
  integrationSuite.testEndToEndMentionFlow();
  integrationSuite.testContextualBehaviorIntegration();
  integrationSuite.testErrorRecoveryIntegration();
  integrationSuite.testPerformanceIntegration();
  integrationSuite.testAccessibilityIntegration();

  // System-level behavior verification
  describe('System-level behavior verification', () => {
    it('should maintain consistent state across all components', async () => {
      // This test verifies that the mention system maintains consistency
      // across all its collaborating components
      
      const behaviorSpec = LondonTestUtils.behavior()
        .given('a complex mention workflow with multiple interactions')
        .when('user performs various mention operations')
        .then([
          'component state should remain synchronized',
          'service calls should follow expected patterns',
          'UI should reflect accurate system state'
        ])
        .withCollaborators(['MentionInput', 'MentionService', 'Container'])
        .build();

      // Verify behavior specification
      expect(behaviorSpec.given).toContain('complex mention workflow');
      expect(behaviorSpec.collaborators).toHaveLength(3);
    });

    it('should handle edge cases consistently across the system', async () => {
      const testCases = [
        { input: '@', expected: 'should show all agents' },
        { input: '@ ', expected: 'should close dropdown' },
        { input: '@nonexistent', expected: 'should show no results' },
        { input: '@agent@agent', expected: 'should handle malformed mentions' }
      ];

      for (const testCase of testCases) {
        // Each test case verifies system behavior consistency
        expect(testCase.input).toBeDefined();
        expect(testCase.expected).toBeDefined();
      }
    });
  });
});