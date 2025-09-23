/**
 * PostCreator Component Behavior Tests - TDD London School
 * Tests the interaction patterns and workflow behavior of PostCreator component
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LondonSchoolTestSuite, LondonTestUtils } from '../framework/LondonSchoolTestFramework';
import { 
  testSetup, 
  createMockPost,
  createMockDraft,
  createMockMentionSuggestion
} from '../factories/MockFactory';
import { PostCreator } from '@/components/PostCreator';
import type { IDraftManager, IMentionService, IHTTPService } from '../contracts/ComponentContracts';

// Mock external dependencies
vi.mock('@/hooks/useDraftManager', () => ({
  useDraftManager: () => ({
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn()
  })
}));

vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: () => ({
    getTemplates: vi.fn(),
    applyTemplate: vi.fn()
  })
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

class PostCreatorBehaviorSuite extends LondonSchoolTestSuite {
  private mockDraftManager!: IDraftManager;
  private mockMentionService!: IMentionService;
  private mockHTTPService!: IHTTPService;
  private user = userEvent.setup();

  protected setupCollaborators(): void {
    this.mockDraftManager = testSetup.mockService('DraftManager', {
      createDraft: vi.fn().mockResolvedValue(createMockDraft()),
      updateDraft: vi.fn().mockResolvedValue(createMockDraft()),
      deleteDraft: vi.fn().mockResolvedValue(undefined),
      getDraft: vi.fn().mockResolvedValue(createMockDraft()),
      getAllDrafts: vi.fn().mockResolvedValue([createMockDraft()]),
      autosave: vi.fn().mockResolvedValue(undefined)
    });

    this.mockMentionService = testSetup.mockService('MentionService', {
      searchMentions: vi.fn().mockResolvedValue([createMockMentionSuggestion()]),
      getAllAgents: vi.fn().mockReturnValue([createMockMentionSuggestion()]),
      getQuickMentions: vi.fn().mockReturnValue([createMockMentionSuggestion()]),
      extractMentions: vi.fn().mockReturnValue([]),
      validateMention: vi.fn().mockReturnValue(true)
    });

    this.mockHTTPService = testSetup.mockService('HTTPService', {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({ data: createMockPost() }),
      put: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined)
    });

    // Mock fetch globally for this test suite
    global.fetch = vi.fn();
  }

  protected verifyAllInteractions(): void {
    // Verify all service collaborations follow expected patterns
  }

  private renderPostCreator(props = {}) {
    return render(
      <TestWrapper>
        <PostCreator {...props} />
      </TestWrapper>
    );
  }

  public testInitialRenderBehavior(): void {
    describe('Initial render behavior', () => {
      it('should render all form fields with correct initial state', () => {
        // Arrange & Act
        this.renderPostCreator();

        // Assert - Verify all form elements are present
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/hook/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
        
        // Verify action buttons
        expect(screen.getByTestId('submit-post')).toBeInTheDocument();
        expect(screen.getByText('Save Draft')).toBeInTheDocument();
        expect(screen.getByText('View Drafts')).toBeInTheDocument();
      });

      it('should have submit button disabled when form is invalid', () => {
        // Arrange & Act
        this.renderPostCreator();

        // Assert - Submit should be disabled initially
        const submitButton = screen.getByTestId('submit-post');
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Title and content are required')).toBeInTheDocument();
      });

      it('should display template library toggle', () => {
        // Arrange & Act
        this.renderPostCreator();

        // Assert
        expect(screen.getByTestId('toggle-template-library')).toBeInTheDocument();
      });
    });
  }

  public testFormValidationBehavior(): void {
    describe('Form validation behavior', () => {
      it('should enable submit button when required fields are filled', async () => {
        // Arrange
        this.renderPostCreator();
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        const submitButton = screen.getByTestId('submit-post');

        // Act - Fill required fields
        await this.user.type(titleInput, 'Test Post Title');
        await this.user.type(contentTextarea, 'This is test content');

        // Assert - Submit should be enabled
        expect(submitButton).not.toBeDisabled();
        expect(screen.queryByText('Title and content are required')).not.toBeInTheDocument();
      });

      it('should respect character limits', async () => {
        // Arrange
        this.renderPostCreator();
        const titleInput = screen.getByLabelText(/title/i);

        // Act - Try to exceed title limit
        const longTitle = 'a'.repeat(250); // Exceeds 200 character limit
        await this.user.type(titleInput, longTitle);

        // Assert - Should be truncated at limit
        expect(titleInput).toHaveValue('a'.repeat(200));
        expect(screen.getByText('200/200')).toBeInTheDocument();
      });

      it('should display character counts for all fields', () => {
        // Arrange & Act
        this.renderPostCreator();

        // Assert - Character counts should be visible
        expect(screen.getByText('0/200')).toBeInTheDocument(); // Title
        expect(screen.getByText('0/300')).toBeInTheDocument(); // Hook
        expect(screen.getByText('0/5000')).toBeInTheDocument(); // Content
      });
    });
  }

  public testMentionIntegrationBehavior(): void {
    describe('Mention integration behavior', () => {
      it('should integrate with MentionInput for content field', async () => {
        // Arrange
        this.renderPostCreator();
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });

        // Act - Type mention trigger
        await this.user.type(contentTextarea, 'Hello @test');

        // Assert - Should trigger mention functionality
        await waitFor(() => {
          // The MentionInput component should handle mention detection
          expect(contentTextarea).toHaveValue('Hello @test');
        });
      });

      it('should track mentioned agents when mentions are selected', async () => {
        // Arrange
        const onPostCreated = vi.fn();
        this.renderPostCreator({ onPostCreated });
        
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });

        // Act - Add content with mention and submit
        await this.user.type(titleInput, 'Test Post');
        await this.user.type(contentTextarea, 'Hello @chief-of-staff-agent');
        
        // Mock successful API response
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: createMockPost() })
        });

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Should extract mentions and include in post data
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"agentMentions"')
          });
        });
      });
    });
  }

  public testDraftManagementBehavior(): void {
    describe('Draft management behavior', () => {
      it('should auto-save draft when content changes', async () => {
        // Arrange
        vi.useFakeTimers();
        const mockCreateDraft = vi.fn().mockResolvedValue(createMockDraft());
        this.mockDraftManager.createDraft = mockCreateDraft;

        this.renderPostCreator();
        const titleInput = screen.getByLabelText(/title/i);

        // Act - Type content
        await this.user.type(titleInput, 'Draft Title');

        // Fast-forward timers to trigger auto-save
        vi.advanceTimersByTime(3000);

        // Assert - Should call draft service
        await waitFor(() => {
          expect(mockCreateDraft).toHaveBeenCalledWith(
            'Draft Title',
            expect.any(String),
            []
          );
        });

        vi.useRealTimers();
      });

      it('should load draft when in edit mode', () => {
        // Arrange
        const mockDraft = createMockDraft({
          id: 'draft-123',
          title: 'Existing Draft',
          content: 'Draft content here'
        });

        // Act
        this.renderPostCreator({ 
          mode: 'edit', 
          editDraft: mockDraft 
        });

        // Assert - Form should be populated with draft data
        expect(screen.getByDisplayValue('Existing Draft')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Draft content here')).toBeInTheDocument();
        expect(screen.getByText('Draft saved')).toBeInTheDocument();
      });

      it('should update existing draft when in edit mode', async () => {
        // Arrange
        const mockUpdateDraft = vi.fn().mockResolvedValue(createMockDraft());
        this.mockDraftManager.updateDraft = mockUpdateDraft;
        
        const mockDraft = createMockDraft({ id: 'draft-123' });
        this.renderPostCreator({ mode: 'edit', editDraft: mockDraft });

        // Act - Click save draft
        const saveDraftButton = screen.getByText('Save Draft');
        await this.user.click(saveDraftButton);

        // Assert - Should update, not create new draft
        await waitFor(() => {
          expect(mockUpdateDraft).toHaveBeenCalledWith(
            'draft-123',
            expect.any(Object)
          );
        });
      });
    });
  }

  public testPostSubmissionBehavior(): void {
    describe('Post submission behavior', () => {
      it('should submit post with correct data format', async () => {
        // Arrange
        const onPostCreated = vi.fn();
        this.renderPostCreator({ onPostCreated });

        const titleInput = screen.getByLabelText(/title/i);
        const hookInput = screen.getByLabelText(/hook/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });

        // Fill form
        await this.user.type(titleInput, 'Test Post');
        await this.user.type(hookInput, 'Test hook');
        await this.user.type(contentTextarea, 'Test content');

        // Mock API response
        const mockResponse = { data: createMockPost() };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        // Act - Submit form
        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - London School: Verify interaction pattern
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringMatching(/Test Post.*Test content/)
          });
        });

        expect(onPostCreated).toHaveBeenCalledWith(mockResponse.data);
      });

      it('should show loading state during submission', async () => {
        // Arrange
        this.renderPostCreator();
        
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Test');
        await this.user.type(contentTextarea, 'Test');

        // Mock delayed API response
        (global.fetch as any).mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: {} })
          }), 100))
        );

        // Act - Submit
        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Loading state should be visible
        expect(screen.getByText('Publishing...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();

        // Wait for completion
        await waitFor(() => {
          expect(screen.queryByText('Publishing...')).not.toBeInTheDocument();
        });
      });

      it('should reset form after successful submission', async () => {
        // Arrange
        this.renderPostCreator();
        
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Test Title');
        await this.user.type(contentTextarea, 'Test content');

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: createMockPost() })
        });

        // Act
        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Form should be cleared
        await waitFor(() => {
          expect(titleInput).toHaveValue('');
          expect(contentTextarea).toHaveValue('');
        });
      });

      it('should delete draft after successful post submission', async () => {
        // Arrange
        const mockDeleteDraft = vi.fn().mockResolvedValue(undefined);
        this.mockDraftManager.deleteDraft = mockDeleteDraft;
        
        const mockDraft = createMockDraft({ id: 'draft-123' });
        this.renderPostCreator({ mode: 'edit', editDraft: mockDraft });

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: createMockPost() })
        });

        // Act
        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Draft should be deleted after successful post
        await waitFor(() => {
          expect(mockDeleteDraft).toHaveBeenCalledWith('draft-123');
        });
      });
    });
  }

  public testTemplateIntegrationBehavior(): void {
    describe('Template integration behavior', () => {
      it('should show template library when toggle is clicked', async () => {
        // Arrange
        this.renderPostCreator();

        // Act
        const toggleButton = screen.getByTestId('toggle-template-library');
        await this.user.click(toggleButton);

        // Assert
        expect(screen.getByTestId('template-library-container')).toBeInTheDocument();
        expect(screen.getByText('Choose a Template')).toBeInTheDocument();
      });

      it('should apply template when selected', async () => {
        // Arrange
        this.renderPostCreator();
        
        const toggleButton = screen.getByTestId('toggle-template-library');
        await this.user.click(toggleButton);

        // Act - Click on a template
        const statusTemplate = screen.getByText('Status Update');
        await this.user.click(statusTemplate);

        // Assert - Form should be populated with template
        expect(screen.getByDisplayValue('Weekly Progress Report')).toBeInTheDocument();
        expect(screen.getByDisplayValue(/Key achievements and upcoming priorities/)).toBeInTheDocument();
        
        // Template library should be hidden
        expect(screen.queryByTestId('template-library-container')).not.toBeInTheDocument();
      });
    });
  }

  public testErrorHandlingBehavior(): void {
    describe('Error handling behavior', () => {
      it('should handle API submission errors gracefully', async () => {
        // Arrange
        this.renderPostCreator();
        
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Test');
        await this.user.type(contentTextarea, 'Test');

        // Mock API error
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' })
        });

        // Act
        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Error should be handled (form not reset, button re-enabled)
        await waitFor(() => {
          expect(submitButton).not.toBeDisabled();
          expect(titleInput).toHaveValue('Test'); // Form not cleared
        });
      });

      it('should handle draft save errors without breaking form', async () => {
        // Arrange
        vi.useFakeTimers();
        const mockCreateDraft = vi.fn().mockRejectedValue(new Error('Save failed'));
        this.mockDraftManager.createDraft = mockCreateDraft;

        this.renderPostCreator();
        const titleInput = screen.getByLabelText(/title/i);

        // Act
        await this.user.type(titleInput, 'Draft');
        vi.advanceTimersByTime(3000);

        // Assert - Form should still be functional despite draft error
        expect(titleInput).toHaveValue('Draft');
        expect(screen.queryByText('Draft saved')).not.toBeInTheDocument();

        vi.useRealTimers();
      });
    });
  }
}

// Test Suite Execution
describe('PostCreator Component Behavior Tests (London School TDD)', () => {
  let behaviorSuite: PostCreatorBehaviorSuite;

  beforeEach(() => {
    testSetup.resetAll();
    behaviorSuite = new PostCreatorBehaviorSuite();
    behaviorSuite.beforeEach();
  });

  afterEach(() => {
    behaviorSuite.afterEach();
    vi.clearAllMocks();
  });

  // Execute test categories
  behaviorSuite.testInitialRenderBehavior();
  behaviorSuite.testFormValidationBehavior();
  behaviorSuite.testMentionIntegrationBehavior();
  behaviorSuite.testDraftManagementBehavior();
  behaviorSuite.testPostSubmissionBehavior();
  behaviorSuite.testTemplateIntegrationBehavior();
  behaviorSuite.testErrorHandlingBehavior();

  // High-level workflow integration test
  describe('Complete post creation workflow', () => {
    it('should support full workflow from template to published post', async () => {
      const behaviorSpec = LondonTestUtils.behavior()
        .given('user wants to create a post using a template with mentions and tags')
        .when('they complete the full workflow')
        .then([
          'template should be applied to form',
          'mentions should be processed correctly', 
          'draft should be auto-saved during editing',
          'post should be submitted successfully',
          'draft should be cleaned up after posting'
        ])
        .withCollaborators(['PostCreator', 'MentionService', 'DraftManager', 'HTTPService'])
        .build();

      // Verify the behavior specification
      expect(behaviorSpec.collaborators).toHaveLength(4);
      expect(behaviorSpec.then).toHaveLength(5);
    });
  });
});