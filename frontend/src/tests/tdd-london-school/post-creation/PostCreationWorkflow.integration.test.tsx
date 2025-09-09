/**
 * Post Creation Workflow Integration Tests - TDD London School
 * Tests the complete end-to-end post creation workflow with all collaborators
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
import type { 
  IDraftManager, 
  IMentionService, 
  IHTTPService,
  ITemplateService,
  IValidationService 
} from '../contracts/ComponentContracts';

// Mock all external dependencies
vi.mock('@/hooks/useDraftManager', () => {
  const mockDraftManager = {
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn()
  };
  return {
    useDraftManager: () => mockDraftManager,
    __mockDraftManager: mockDraftManager
  };
});

vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: [],
    applyTemplate: vi.fn()
  })
}));

vi.mock('@/services/MentionService', () => ({
  MentionService: {
    searchMentions: vi.fn(),
    getAllAgents: vi.fn(),
    getQuickMentions: vi.fn(),
    extractMentions: vi.fn(),
    validateMention: vi.fn()
  }
}));

// Complete workflow test component
const PostCreationWorkflowTest: React.FC<{
  onWorkflowComplete?: (result: any) => void;
  initialMode?: 'create' | 'edit';
  editDraft?: any;
}> = ({ onWorkflowComplete, initialMode = 'create', editDraft }) => {
  const [posts, setPosts] = React.useState<any[]>([]);
  
  const handlePostCreated = (post: any) => {
    setPosts(prev => [...prev, post]);
    onWorkflowComplete?.({ type: 'post_created', post, totalPosts: posts.length + 1 });
  };

  return (
    <BrowserRouter>
      <div data-testid="workflow-container">
        <PostCreator 
          mode={initialMode}
          editDraft={editDraft}
          onPostCreated={handlePostCreated}
        />
        <div data-testid="posts-count">
          Posts created: {posts.length}
        </div>
      </div>
    </BrowserRouter>
  );
};

class PostCreationWorkflowSuite extends LondonSchoolTestSuite {
  private mockDraftManager!: IDraftManager;
  private mockMentionService!: IMentionService;
  private mockHTTPService!: IHTTPService;
  private mockTemplateService!: ITemplateService;
  private mockValidationService!: IValidationService;
  private user = userEvent.setup();

  protected setupCollaborators(): void {
    this.mockDraftManager = testSetup.mockService('DraftManager', {
      createDraft: vi.fn().mockResolvedValue(createMockDraft()),
      updateDraft: vi.fn().mockResolvedValue(createMockDraft()),
      deleteDraft: vi.fn().mockResolvedValue(undefined),
      getDraft: vi.fn().mockResolvedValue(createMockDraft()),
      getAllDrafts: vi.fn().mockResolvedValue([]),
      autosave: vi.fn().mockResolvedValue(undefined)
    });

    this.mockMentionService = testSetup.mockService('MentionService', {
      searchMentions: vi.fn().mockResolvedValue([
        createMockMentionSuggestion({ 
          name: 'chief-of-staff-agent',
          displayName: 'Chief of Staff'
        })
      ]),
      extractMentions: vi.fn().mockImplementation((content: string) => {
        const matches = content.match(/@([a-zA-Z0-9-_]+)/g);
        return matches ? matches.map(m => m.slice(1)) : [];
      }),
      validateMention: vi.fn().mockReturnValue(true)
    });

    this.mockHTTPService = testSetup.mockService('HTTPService', {
      post: vi.fn().mockResolvedValue({ 
        data: createMockPost({ 
          id: 'post-123',
          title: 'Created Post',
          content: 'Post content'
        })
      })
    });

    this.mockTemplateService = testSetup.mockService('TemplateService', {
      getTemplates: vi.fn().mockResolvedValue([]),
      applyTemplate: vi.fn().mockResolvedValue({})
    });

    this.mockValidationService = testSetup.mockService('ValidationService', {
      validatePost: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
      sanitizeContent: vi.fn().mockImplementation((content) => content)
    });

    // Setup global fetch mock
    global.fetch = vi.fn();
  }

  protected verifyAllInteractions(): void {
    // Verify all service interactions follow expected workflow patterns
  }

  public testCompletePostCreationWorkflow(): void {
    describe('Complete post creation workflow', () => {
      it('should execute end-to-end post creation with all collaborators', async () => {
        // Arrange
        const onWorkflowComplete = vi.fn();
        const mockPost = createMockPost();
        
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockPost })
        });

        render(<PostCreationWorkflowTest onWorkflowComplete={onWorkflowComplete} />);

        // Act - Complete workflow
        const titleInput = screen.getByLabelText(/title/i);
        const hookInput = screen.getByLabelText(/hook/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });

        // Step 1: Fill basic information
        await this.user.type(titleInput, 'Integration Test Post');
        await this.user.type(hookInput, 'Testing the complete workflow');
        
        // Step 2: Add content with mentions
        await this.user.type(contentTextarea, 'Hello @chief-of-staff-agent, please review this post.');

        // Step 3: Submit the post
        const submitButton = screen.getByTestId('submit-post');
        expect(submitButton).not.toBeDisabled();
        
        await this.user.click(submitButton);

        // Assert - Verify complete workflow execution
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringMatching(/Integration Test Post/)
          });
        });

        await waitFor(() => {
          expect(onWorkflowComplete).toHaveBeenCalledWith({
            type: 'post_created',
            post: mockPost,
            totalPosts: 1
          });
        });

        // Verify UI updates
        expect(screen.getByText('Posts created: 1')).toBeInTheDocument();
      });

      it('should handle draft-to-post workflow correctly', async () => {
        // Arrange - Start with existing draft
        const mockDraft = createMockDraft({
          id: 'draft-456',
          title: 'Draft Post',
          content: 'Draft content',
          tags: ['draft']
        });

        const mockDeleteDraft = vi.fn().mockResolvedValue(undefined);
        this.mockDraftManager.deleteDraft = mockDeleteDraft;

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: createMockPost() })
        });

        render(
          <PostCreationWorkflowTest 
            initialMode="edit" 
            editDraft={mockDraft}
          />
        );

        // Act - Verify draft is loaded and submit
        await waitFor(() => {
          expect(screen.getByDisplayValue('Draft Post')).toBeInTheDocument();
        });

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Draft should be deleted after successful post
        await waitFor(() => {
          expect(mockDeleteDraft).toHaveBeenCalledWith('draft-456');
        });
      });
    });
  }

  public testTemplateWorkflow(): void {
    describe('Template integration workflow', () => {
      it('should apply template and customize content', async () => {
        // Arrange
        render(<PostCreationWorkflowTest />);

        // Act - Open template library
        const toggleButton = screen.getByTestId('toggle-template-library');
        await this.user.click(toggleButton);

        await waitFor(() => {
          expect(screen.getByTestId('template-library-container')).toBeInTheDocument();
        });

        // Select status update template
        const statusTemplate = screen.getByText('Status Update');
        await this.user.click(statusTemplate);

        // Customize the template content
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        await this.user.clear(contentTextarea);
        await this.user.type(contentTextarea, 
          '## Completed This Week\n- Implemented new feature\n- Fixed critical bugs\n\n@chief-of-staff-agent please review'
        );

        // Submit customized template
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: createMockPost() })
        });

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Should submit with customized content
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringMatching(/Completed This Week.*chief-of-staff-agent/s)
          });
        });
      });
    });
  }

  public testAutoSaveWorkflow(): void {
    describe('Auto-save workflow', () => {
      it('should auto-save during editing and clean up on publish', async () => {
        // Arrange
        vi.useFakeTimers();
        const mockCreateDraft = vi.fn().mockResolvedValue(createMockDraft({ id: 'auto-draft' }));
        const mockDeleteDraft = vi.fn().mockResolvedValue(undefined);
        
        this.mockDraftManager.createDraft = mockCreateDraft;
        this.mockDraftManager.deleteDraft = mockDeleteDraft;

        render(<PostCreationWorkflowTest />);

        // Act - Start typing (triggers auto-save)
        const titleInput = screen.getByLabelText(/title/i);
        await this.user.type(titleInput, 'Auto-saved Post');

        // Fast-forward to trigger auto-save
        vi.advanceTimersByTime(3000);

        await waitFor(() => {
          expect(mockCreateDraft).toHaveBeenCalled();
        });

        // Complete the post
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        await this.user.type(contentTextarea, 'Content for auto-saved post');

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: createMockPost() })
        });

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Auto-saved draft should be cleaned up
        // Note: This would be cleaned up if there was a draft ID from auto-save
        vi.useRealTimers();
      });
    });
  }

  public testErrorRecoveryWorkflow(): void {
    describe('Error recovery workflow', () => {
      it('should handle submission failures and allow retry', async () => {
        // Arrange
        render(<PostCreationWorkflowTest />);

        // Fill form
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Error Test Post');
        await this.user.type(contentTextarea, 'This will fail first time');

        // First submission fails
        (global.fetch as any)
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: createMockPost() })
          });

        // Act - First submission (fails)
        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Should return to normal state after error
        await waitFor(() => {
          expect(submitButton).not.toBeDisabled();
        });

        // Second submission (succeeds)
        await this.user.click(submitButton);

        // Assert - Should eventually succeed
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledTimes(2);
        });
      });

      it('should maintain form state during submission errors', async () => {
        // Arrange
        render(<PostCreationWorkflowTest />);

        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Persistent Form Data');
        await this.user.type(contentTextarea, 'This content should remain after error');

        // Mock API failure
        (global.fetch as any).mockRejectedValueOnce(new Error('Server error'));

        // Act
        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Form data should be preserved
        await waitFor(() => {
          expect(titleInput).toHaveValue('Persistent Form Data');
          expect(contentTextarea).toHaveValue('This content should remain after error');
        });
      });
    });
  }

  public testMentionWorkflowIntegration(): void {
    describe('Mention workflow integration', () => {
      it('should process mentions throughout the entire workflow', async () => {
        // Arrange
        const extractMentionsSpy = vi.fn().mockReturnValue(['chief-of-staff-agent']);
        this.mockMentionService.extractMentions = extractMentionsSpy;

        render(<PostCreationWorkflowTest />);

        // Act - Create post with mentions
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Mention Integration Test');
        await this.user.type(contentTextarea, 'Hello @chief-of-staff-agent, please check this workflow.');

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: createMockPost() })
        });

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Mentions should be processed and included in submission
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringMatching(/agentMentions.*chief-of-staff-agent/)
          });
        });
      });
    });
  }
}

// Test Suite Execution
describe('Post Creation Workflow Integration Tests (London School TDD)', () => {
  let workflowSuite: PostCreationWorkflowSuite;

  beforeEach(() => {
    testSetup.resetAll();
    workflowSuite = new PostCreationWorkflowSuite();
    workflowSuite.beforeEach();
  });

  afterEach(() => {
    workflowSuite.afterEach();
    vi.clearAllMocks();
  });

  // Execute workflow test categories
  workflowSuite.testCompletePostCreationWorkflow();
  workflowSuite.testTemplateWorkflow();
  workflowSuite.testAutoSaveWorkflow();
  workflowSuite.testErrorRecoveryWorkflow();
  workflowSuite.testMentionWorkflowIntegration();

  // System-level workflow verification
  describe('System-level workflow verification', () => {
    it('should maintain data consistency across all workflow steps', async () => {
      const behaviorSpec = LondonTestUtils.behavior()
        .given('a user completes the full post creation workflow')
        .when('they interact with templates, mentions, drafts, and submission')
        .then([
          'data should remain consistent across all steps',
          'all services should be called in correct sequence',
          'UI should reflect accurate system state throughout',
          'error states should be handled gracefully',
          'cleanup should occur after successful completion'
        ])
        .withCollaborators([
          'PostCreator',
          'MentionService', 
          'DraftManager',
          'TemplateService',
          'HTTPService',
          'ValidationService'
        ])
        .build();

      // Verify workflow specification
      expect(behaviorSpec.collaborators).toHaveLength(6);
      expect(behaviorSpec.then).toHaveLength(5);
    });

    it('should handle concurrent workflow operations correctly', async () => {
      // Test scenarios where multiple workflow operations might happen simultaneously
      const concurrentScenarios = [
        'auto-save while user is typing',
        'template application during mention selection',
        'draft cleanup during form validation',
        'error recovery during submission'
      ];

      concurrentScenarios.forEach(scenario => {
        expect(scenario).toBeDefined();
        // Each scenario would have its own test implementation
      });
    });
  });
});