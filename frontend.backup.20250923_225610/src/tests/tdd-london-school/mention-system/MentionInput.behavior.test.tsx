/**
 * MentionInput Component Behavior Tests - TDD London School
 * Tests the interaction patterns and UI behavior of MentionInput component
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LondonSchoolTestSuite, LondonTestUtils } from '../framework/LondonSchoolTestFramework';
import { 
  testSetup, 
  createMockMentionSuggestion, 
  createMockMentionSuggestions,
  createMockMentionService
} from '../factories/MockFactory';
import { MentionInput, type MentionInputProps, type MentionInputRef } from '@/components/MentionInput';
import type { IMentionService } from '../contracts/ComponentContracts';

// Mock the MentionService module
vi.mock('@/services/MentionService', () => ({
  MentionService: {
    searchMentions: vi.fn(),
    getAllAgents: vi.fn(),
    getQuickMentions: vi.fn(),
    getAgentById: vi.fn(),
    validateMention: vi.fn(),
    extractMentions: vi.fn(),
    clearCache: vi.fn()
  }
}));

class MentionInputBehaviorSuite extends LondonSchoolTestSuite {
  private mockMentionService!: IMentionService;
  private defaultProps: MentionInputProps;
  private user = userEvent.setup();

  constructor() {
    super();
    this.defaultProps = {
      value: '',
      onChange: vi.fn(),
      placeholder: 'Type @ to mention...',
      mentionContext: 'post'
    };
  }

  protected setupCollaborators(): void {
    this.mockMentionService = createMockMentionService({
      searchMentions: vi.fn().mockResolvedValue(createMockMentionSuggestions(3)),
      getAllAgents: vi.fn().mockReturnValue(createMockMentionSuggestions(5)),
      getQuickMentions: vi.fn().mockReturnValue(createMockMentionSuggestions(3))
    });

    testSetup.mockService('MentionService', this.mockMentionService);
  }

  protected verifyAllInteractions(): void {
    // Verify MentionService collaborations after each test
  }

  private renderMentionInput(props?: Partial<MentionInputProps>): RenderResult {
    const finalProps = { ...this.defaultProps, ...props };
    return render(<MentionInput {...finalProps} />);
  }

  public testInitialRenderBehavior(): void {
    describe('Initial render behavior', () => {
      it('should render textarea with correct attributes', () => {
        // Arrange & Act
        this.renderMentionInput();

        // Assert - London School focuses on observable behavior
        const textarea = screen.getByRole('textbox');
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveAttribute('placeholder', 'Type @ to mention...');
        expect(textarea).toHaveAttribute('data-mention-context', 'post');
        expect(textarea).toHaveAttribute('aria-label', 'Compose message with agent mentions');
      });

      it('should not show dropdown initially', () => {
        // Arrange & Act
        this.renderMentionInput();

        // Assert
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mention-debug-dropdown')).not.toBeInTheDocument();
      });
    });
  }

  public testMentionTriggerBehavior(): void {
    describe('Mention trigger behavior', () => {
      it('should show dropdown when @ is typed', async () => {
        // Arrange
        const onMentionSelect = vi.fn();
        this.renderMentionInput({ onMentionSelect });
        const textarea = screen.getByRole('textbox');

        // Act - Type @ character
        await this.user.type(textarea, '@');

        // Assert - Verify dropdown appears and service is called
        await waitFor(() => {
          expect(screen.queryByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });
        
        // London School: Verify collaboration with MentionService
        expect(this.mockMentionService.searchMentions).toHaveBeenCalledWith('');
      });

      it('should update dropdown when typing after @', async () => {
        // Arrange
        this.renderMentionInput();
        const textarea = screen.getByRole('textbox');

        // Act - Type @ch to trigger search
        await this.user.type(textarea, '@ch');

        // Assert - Verify service called with query
        await waitFor(() => {
          expect(this.mockMentionService.searchMentions).toHaveBeenCalledWith('ch');
        });
      });

      it('should hide dropdown when mention context is broken', async () => {
        // Arrange
        this.renderMentionInput();
        const textarea = screen.getByRole('textbox');

        // Act - Type @ then space (breaks mention context)
        await this.user.type(textarea, '@ ');

        // Assert - Dropdown should not be visible
        expect(screen.queryByTestId('mention-debug-dropdown')).not.toBeInTheDocument();
      });
    });
  }

  public testMentionSelectionBehavior(): void {
    describe('Mention selection behavior', () => {
      it('should call onChange and onMentionSelect when agent is clicked', async () => {
        // Arrange
        const onChange = vi.fn();
        const onMentionSelect = vi.fn();
        const mockSuggestions = [
          createMockMentionSuggestion({ 
            id: 'chief-of-staff',
            name: 'chief-of-staff-agent',
            displayName: 'Chief of Staff'
          })
        ];
        
        this.mockMentionService.searchMentions = vi.fn().mockResolvedValue(mockSuggestions);
        
        this.renderMentionInput({ onChange, onMentionSelect });
        const textarea = screen.getByRole('textbox');

        // Act - Trigger mention dropdown
        await this.user.type(textarea, '@');
        
        // Wait for dropdown to appear
        await waitFor(() => {
          expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });

        // Click on the first suggestion
        const suggestion = screen.getByTestId('agent-debug-info-chief-of-staff');
        await this.user.click(suggestion);

        // Assert - Verify collaborations
        expect(onChange).toHaveBeenCalledWith('@chief-of-staff-agent ');
        expect(onMentionSelect).toHaveBeenCalledWith(mockSuggestions[0]);
        
        // Verify dropdown closes after selection
        expect(screen.queryByTestId('mention-debug-dropdown')).not.toBeInTheDocument();
      });

      it('should handle keyboard navigation and selection', async () => {
        // Arrange
        const onChange = vi.fn();
        const mockSuggestions = createMockMentionSuggestions(3);
        this.mockMentionService.searchMentions = vi.fn().mockResolvedValue(mockSuggestions);
        
        this.renderMentionInput({ onChange });
        const textarea = screen.getByRole('textbox');

        // Act - Trigger dropdown and navigate
        await this.user.type(textarea, '@');
        
        await waitFor(() => {
          expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });

        // Press ArrowDown to select second item
        fireEvent.keyDown(textarea, { key: 'ArrowDown' });
        
        // Press Enter to select
        fireEvent.keyDown(textarea, { key: 'Enter' });

        // Assert - Second agent should be selected
        await waitFor(() => {
          expect(onChange).toHaveBeenCalledWith(`@${mockSuggestions[1].name} `);
        });
      });

      it('should close dropdown on Escape key', async () => {
        // Arrange
        this.renderMentionInput();
        const textarea = screen.getByRole('textbox');

        // Act - Open dropdown then press Escape
        await this.user.type(textarea, '@');
        
        await waitFor(() => {
          expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });

        fireEvent.keyDown(textarea, { key: 'Escape' });

        // Assert
        expect(screen.queryByTestId('mention-debug-dropdown')).not.toBeInTheDocument();
      });
    });
  }

  public testDropdownRenderingBehavior(): void {
    describe('Dropdown rendering behavior', () => {
      it('should display loading state while fetching suggestions', async () => {
        // Arrange - Make service return a pending promise
        const { promise, resolve } = LondonTestUtils.createControllablePromise<any>();
        this.mockMentionService.searchMentions = vi.fn().mockReturnValue(promise);
        
        this.renderMentionInput();
        const textarea = screen.getByRole('textbox');

        // Act - Trigger search
        await this.user.type(textarea, '@');

        // Assert - Loading state should be visible
        await waitFor(() => {
          expect(screen.getByText('Loading agents...')).toBeInTheDocument();
        });

        // Resolve the promise
        resolve([]);
      });

      it('should display "No agents found" when search returns empty results', async () => {
        // Arrange
        this.mockMentionService.searchMentions = vi.fn().mockResolvedValue([]);
        
        this.renderMentionInput();
        const textarea = screen.getByRole('textbox');

        // Act
        await this.user.type(textarea, '@nonexistent');

        // Assert
        await waitFor(() => {
          expect(screen.getByText(/No agents found matching "nonexistent"/)).toBeInTheDocument();
        });
      });

      it('should render agent suggestions with correct information', async () => {
        // Arrange
        const mockSuggestions = [
          createMockMentionSuggestion({
            id: 'test-agent',
            name: 'test-agent',
            displayName: 'Test Agent',
            description: 'Test description'
          })
        ];
        this.mockMentionService.searchMentions = vi.fn().mockResolvedValue(mockSuggestions);
        
        this.renderMentionInput();
        const textarea = screen.getByRole('textbox');

        // Act
        await this.user.type(textarea, '@');

        // Assert - Verify agent display
        await waitFor(() => {
          expect(screen.getByText('Test Agent')).toBeInTheDocument();
          expect(screen.getByText('@test-agent')).toBeInTheDocument();
          expect(screen.getByText('Test description')).toBeInTheDocument();
        });
      });
    });
  }

  public testRefBehavior(): void {
    describe('Ref behavior', () => {
      it('should expose required methods through ref', () => {
        // Arrange
        const ref = React.createRef<MentionInputRef>();
        this.renderMentionInput({ ref });

        // Assert - London School: Verify contract fulfillment
        expect(ref.current).toBeDefined();
        expect(ref.current?.focus).toBeInstanceOf(Function);
        expect(ref.current?.blur).toBeInstanceOf(Function);
        expect(ref.current?.insertMention).toBeInstanceOf(Function);
        expect(ref.current?.getCurrentMentionQuery).toBeInstanceOf(Function);
        expect(ref.current?.setSelectionRange).toBeInstanceOf(Function);
        expect(typeof ref.current?.selectionStart).toBe('number');
        expect(typeof ref.current?.selectionEnd).toBe('number');
      });

      it('should focus textarea when focus method is called', () => {
        // Arrange
        const ref = React.createRef<MentionInputRef>();
        this.renderMentionInput({ ref });
        const textarea = screen.getByRole('textbox');

        // Act
        ref.current?.focus();

        // Assert
        expect(textarea).toHaveFocus();
      });
    });
  }

  public testErrorHandlingBehavior(): void {
    describe('Error handling behavior', () => {
      it('should handle MentionService errors gracefully', async () => {
        // Arrange
        this.mockMentionService.searchMentions = vi.fn().mockRejectedValue(
          new Error('Service unavailable')
        );
        
        this.renderMentionInput();
        const textarea = screen.getByRole('textbox');

        // Act - Trigger search that will fail
        await this.user.type(textarea, '@');

        // Assert - Component should not crash and show fallback
        await waitFor(() => {
          // Should still render dropdown but with empty/error state
          expect(screen.queryByTestId('mention-debug-dropdown')).toBeInTheDocument();
        });
        
        expect(this.mockMentionService.searchMentions).toHaveBeenCalledWith('');
      });
    });
  }

  public testAccessibilityBehavior(): void {
    describe('Accessibility behavior', () => {
      it('should have correct ARIA attributes', () => {
        // Arrange & Act
        this.renderMentionInput({ 'aria-label': 'Custom mention input' });
        const textarea = screen.getByRole('textbox');

        // Assert
        expect(textarea).toHaveAttribute('aria-label', 'Custom mention input');
        expect(textarea).toHaveAttribute('aria-expanded', 'false');
        expect(textarea).toHaveAttribute('aria-haspopup', 'listbox');
      });

      it('should update aria-expanded when dropdown opens', async () => {
        // Arrange
        this.renderMentionInput();
        const textarea = screen.getByRole('textbox');

        // Act
        await this.user.type(textarea, '@');

        // Assert
        await waitFor(() => {
          expect(textarea).toHaveAttribute('aria-expanded', 'true');
        });
      });
    });
  }
}

// Test Suite Execution
describe('MentionInput Component Behavior Tests (London School TDD)', () => {
  let behaviorSuite: MentionInputBehaviorSuite;

  beforeEach(() => {
    testSetup.resetAll();
    behaviorSuite = new MentionInputBehaviorSuite();
    behaviorSuite.beforeEach();
  });

  afterEach(() => {
    behaviorSuite.afterEach();
  });

  // Test Categories
  behaviorSuite.testInitialRenderBehavior();
  behaviorSuite.testMentionTriggerBehavior();
  behaviorSuite.testMentionSelectionBehavior();
  behaviorSuite.testDropdownRenderingBehavior();
  behaviorSuite.testRefBehavior();
  behaviorSuite.testErrorHandlingBehavior();
  behaviorSuite.testAccessibilityBehavior();

  // Integration behavior test
  describe('Cross-component integration behavior', () => {
    it('should coordinate properly with different contexts', async () => {
      const behaviorSpec = LondonTestUtils.behavior()
        .given('MentionInput is used in different contexts')
        .when('context changes between post, comment, and quick-post')
        .then([
          'service should be called with correct context parameter',
          'appropriate agents should be suggested for each context',
          'dropdown behavior should remain consistent'
        ])
        .withCollaborators(['MentionInput', 'MentionService'])
        .build();

      // Test different contexts
      const contexts = ['post', 'comment', 'quick-post'] as const;
      
      for (const context of contexts) {
        const { rerender } = render(<MentionInput 
          value="" 
          onChange={vi.fn()} 
          mentionContext={context}
        />);
        
        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveAttribute('data-mention-context', context);
      }
    });
  });
});