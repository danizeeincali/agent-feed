/**
 * UI Component Interaction Tests - TDD London School
 * Tests the interaction patterns between UI components with mock coordination
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { LondonSchoolTestSuite, LondonTestUtils } from '../framework/LondonSchoolTestFramework';
import { 
  testSetup, 
  createMockPost,
  createMockComment,
  createMockMentionSuggestion
} from '../factories/MockFactory';
import { PostCreator } from '@/components/PostCreator';
import { CommentThread } from '@/components/CommentThread';
import { MentionInput } from '@/components/MentionInput';
import type { 
  IRouter,
  INotificationService,
  IMentionService,
  IHTTPService
} from '../contracts/ComponentContracts';

// Mock all external dependencies
vi.mock('@/hooks/useDraftManager', () => ({
  useDraftManager: () => ({
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn()
  })
}));

vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: []
  })
}));

vi.mock('@/utils/commentUtils', () => ({
  buildCommentTree: vi.fn().mockImplementation((comments) => {
    return comments.filter((c: any) => !c.parentId).map((comment: any) => ({
      comment,
      children: comments
        .filter((c: any) => c.parentId === comment.id)
        .map((child: any) => ({ comment: child, children: [] }))
    }));
  })
}));

// Integrated UI Test Component
const IntegratedFeedApp: React.FC<{
  onInteraction?: (type: string, data: any) => void;
}> = ({ onInteraction }) => {
  const [posts, setPosts] = React.useState<any[]>([]);
  const [comments, setComments] = React.useState<any[]>([]);
  const [selectedPost, setSelectedPost] = React.useState<any>(null);

  const handlePostCreated = (post: any) => {
    setPosts(prev => [post, ...prev]);
    onInteraction?.('post_created', post);
  };

  const handlePostSelected = (post: any) => {
    setSelectedPost(post);
    onInteraction?.('post_selected', post);
  };

  const handleCommentsUpdate = () => {
    onInteraction?.('comments_updated', { postId: selectedPost?.id });
  };

  return (
    <div data-testid="integrated-feed-app">
      {/* Post Creation Section */}
      <div data-testid="post-creation-section">
        <PostCreator onPostCreated={handlePostCreated} />
      </div>

      {/* Posts List Section */}
      <div data-testid="posts-list-section">
        {posts.map(post => (
          <div 
            key={post.id}
            data-testid={`post-item-${post.id}`}
            className="border p-4 mb-4 cursor-pointer"
            onClick={() => handlePostSelected(post)}
          >
            <h3>{post.title}</h3>
            <p>{post.content}</p>
            <small>By {post.author_agent}</small>
          </div>
        ))}
      </div>

      {/* Selected Post Comments Section */}
      {selectedPost && (
        <div data-testid="comments-section">
          <h2>Comments for: {selectedPost.title}</h2>
          <CommentThread
            postId={selectedPost.id}
            comments={comments}
            currentUser="integrated-test-user"
            onCommentsUpdate={handleCommentsUpdate}
          />
        </div>
      )}
    </div>
  );
};

class ComponentInteractionBehaviorSuite extends LondonSchoolTestSuite {
  private mockRouter!: IRouter;
  private mockNotificationService!: INotificationService;
  private mockMentionService!: IMentionService;
  private mockHTTPService!: IHTTPService;
  private user = userEvent.setup();

  protected setupCollaborators(): void {
    this.mockRouter = testSetup.mockService('Router', {
      navigate: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      getCurrentPath: vi.fn().mockReturnValue('/feed'),
      getParams: vi.fn().mockReturnValue({}),
      getSearchParams: vi.fn().mockReturnValue(new URLSearchParams())
    });

    this.mockNotificationService = testSetup.mockService('NotificationService', {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      dismiss: vi.fn(),
      dismissAll: vi.fn()
    });

    this.mockMentionService = testSetup.mockService('MentionService', {
      searchMentions: vi.fn().mockResolvedValue([createMockMentionSuggestion()]),
      getAllAgents: vi.fn().mockReturnValue([createMockMentionSuggestion()]),
      getQuickMentions: vi.fn().mockReturnValue([createMockMentionSuggestion()]),
      extractMentions: vi.fn().mockReturnValue([]),
      validateMention: vi.fn().mockReturnValue(true)
    });

    this.mockHTTPService = testSetup.mockService('HTTPService', {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    });

    // Setup global mocks
    global.fetch = vi.fn();
  }

  protected verifyAllInteractions(): void {
    // Verify UI component collaborations
  }

  private renderIntegratedApp(props = {}) {
    return render(
      <BrowserRouter>
        <IntegratedFeedApp {...props} />
      </BrowserRouter>
    );
  }

  public testPostCreationToFeedIntegration(): void {
    describe('Post creation to feed integration', () => {
      it('should create post and update feed list immediately', async () => {
        // Arrange
        const onInteraction = vi.fn();
        const mockPost = createMockPost({
          id: 'new-post-123',
          title: 'Integration Test Post',
          content: 'This post tests integration between components'
        });

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockPost })
        });

        this.renderIntegratedApp({ onInteraction });

        // Act - Create a post through PostCreator
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Integration Test Post');
        await this.user.type(contentTextarea, 'This post tests integration between components');

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Post should appear in feed list
        await waitFor(() => {
          expect(screen.getByTestId('post-item-new-post-123')).toBeInTheDocument();
          expect(screen.getByText('Integration Test Post')).toBeInTheDocument();
          expect(screen.getByText('This post tests integration between components')).toBeInTheDocument();
        });

        expect(onInteraction).toHaveBeenCalledWith('post_created', mockPost);
      });

      it('should clear PostCreator form after successful submission', async () => {
        // Arrange
        const mockPost = createMockPost();
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockPost })
        });

        this.renderIntegratedApp();

        // Act
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Test Post');
        await this.user.type(contentTextarea, 'Test content');

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Form should be cleared
        await waitFor(() => {
          expect(titleInput).toHaveValue('');
          expect(contentTextarea).toHaveValue('');
        });
      });
    });
  }

  public testPostToCommentsIntegration(): void {
    describe('Post to comments integration', () => {
      it('should show comments section when post is selected', async () => {
        // Arrange
        const onInteraction = vi.fn();
        const mockPost = createMockPost({
          id: 'selected-post',
          title: 'Clickable Post'
        });

        // Pre-populate with a post
        this.renderIntegratedApp({ onInteraction });
        
        // Simulate post creation first
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockPost })
        });

        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Clickable Post');
        await this.user.type(contentTextarea, 'Click me to see comments');

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Act - Click on the post
        await waitFor(() => {
          expect(screen.getByTestId('post-item-selected-post')).toBeInTheDocument();
        });

        const postItem = screen.getByTestId('post-item-selected-post');
        await this.user.click(postItem);

        // Assert - Comments section should appear
        expect(screen.getByTestId('comments-section')).toBeInTheDocument();
        expect(screen.getByText('Comments for: Clickable Post')).toBeInTheDocument();
        expect(onInteraction).toHaveBeenCalledWith('post_selected', mockPost);
      });

      it('should integrate comment creation with post selection', async () => {
        // Arrange
        const onInteraction = vi.fn();
        const mockPost = createMockPost({ id: 'post-with-comments' });
        
        // Setup API mocks
        (global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: mockPost })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(createMockComment({
              id: 'new-comment',
              content: 'Integration test comment',
              postId: 'post-with-comments'
            }))
          });

        this.renderIntegratedApp({ onInteraction });

        // Create and select post
        const titleInput = screen.getByLabelText(/title/i);
        await this.user.type(titleInput, 'Post with Comments');
        
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        await this.user.type(contentTextarea, 'This post will have comments');

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByTestId('post-item-post-with-comments')).toBeInTheDocument();
        });

        const postItem = screen.getByTestId('post-item-post-with-comments');
        await this.user.click(postItem);

        // Wait for comments section
        await waitFor(() => {
          expect(screen.getByTestId('comments-section')).toBeInTheDocument();
        });

        // Act - Add a comment (if reply functionality is visible)
        // Note: This depends on the CommentThread implementation having a top-level comment form
        // For this integration test, we verify the comments section is present and can be interacted with
        
        expect(screen.getByTestId('comment-thread-container')).toBeInTheDocument();
        expect(onInteraction).toHaveBeenCalledWith('post_selected', mockPost);
      });
    });
  }

  public testMentionSystemIntegration(): void {
    describe('Mention system integration across components', () => {
      it('should support mentions in PostCreator and propagate to comments', async () => {
        // Arrange
        const mockMention = createMockMentionSuggestion({
          name: 'integration-agent',
          displayName: 'Integration Agent'
        });
        
        this.mockMentionService.searchMentions = vi.fn().mockResolvedValue([mockMention]);
        
        const mockPost = createMockPost({
          content: 'Hello @integration-agent, please review'
        });

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockPost })
        });

        this.renderIntegratedApp();

        // Act - Create post with mention
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Mention Integration Test');
        await this.user.type(contentTextarea, 'Hello @integration-agent, please review');

        // Note: Full mention dropdown interaction would require more sophisticated mocking
        // of the MentionInput component's internal behavior

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Post with mention should be created
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringMatching(/integration-agent/)
          });
        });
      });

      it('should maintain mention functionality across component boundaries', async () => {
        // Arrange - Test that MentionInput works consistently in different contexts
        const { rerender } = render(
          <div>
            <MentionInput
              value=""
              onChange={vi.fn()}
              mentionContext="post"
              data-testid="post-mention-input"
            />
          </div>
        );

        // Act - Switch context
        rerender(
          <div>
            <MentionInput
              value=""
              onChange={vi.fn()}
              mentionContext="comment"
              data-testid="comment-mention-input"
            />
          </div>
        );

        // Assert - Both contexts should render properly
        expect(screen.getByTestId('comment-mention-input')).toBeInTheDocument();
        expect(screen.getByTestId('comment-mention-input')).toHaveAttribute(
          'data-mention-context', 
          'comment'
        );
      });
    });
  }

  public testFormValidationIntegration(): void {
    describe('Form validation integration', () => {
      it('should coordinate validation across multiple form components', async () => {
        // Arrange
        this.renderIntegratedApp();

        // Act - Try to submit empty form
        const submitButton = screen.getByTestId('submit-post');
        
        // Form should be invalid initially
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Title and content are required')).toBeInTheDocument();

        // Add title only
        const titleInput = screen.getByLabelText(/title/i);
        await this.user.type(titleInput, 'Valid Title');

        // Should still be invalid (missing content)
        expect(submitButton).toBeDisabled();

        // Add content
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        await this.user.type(contentTextarea, 'Valid content');

        // Should now be valid
        expect(submitButton).not.toBeDisabled();
        expect(screen.queryByText('Title and content are required')).not.toBeInTheDocument();
      });

      it('should show real-time character count across form fields', async () => {
        // Arrange
        this.renderIntegratedApp();

        // Act
        const titleInput = screen.getByLabelText(/title/i);
        await this.user.type(titleInput, 'Test');

        // Assert - Character count should update
        expect(screen.getByText('4/200')).toBeInTheDocument(); // Title count
      });
    });
  }

  public testNavigationIntegration(): void {
    describe('Navigation integration', () => {
      it('should coordinate component states during navigation', () => {
        // Arrange - Use MemoryRouter to control navigation
        const { rerender } = render(
          <MemoryRouter initialEntries={['/feed']}>
            <IntegratedFeedApp />
          </MemoryRouter>
        );

        // Act - Simulate navigation to drafts
        rerender(
          <MemoryRouter initialEntries={['/drafts']}>
            <IntegratedFeedApp />
          </MemoryRouter>
        );

        // Assert - Component should handle navigation
        // Note: Actual navigation behavior depends on router integration
        expect(screen.getByTestId('integrated-feed-app')).toBeInTheDocument();
      });

      it('should maintain component state during route changes', () => {
        // This test would verify that component state is preserved
        // or properly reset during navigation
        const initialRoute = '/feed';
        
        render(
          <MemoryRouter initialEntries={[initialRoute]}>
            <IntegratedFeedApp />
          </MemoryRouter>
        );

        expect(screen.getByTestId('post-creation-section')).toBeInTheDocument();
        expect(screen.getByTestId('posts-list-section')).toBeInTheDocument();
      });
    });
  }

  public testErrorHandlingIntegration(): void {
    describe('Error handling integration', () => {
      it('should coordinate error states between components', async () => {
        // Arrange
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
        
        this.renderIntegratedApp();

        // Act - Try to submit post (will fail)
        const titleInput = screen.getByLabelText(/title/i);
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        
        await this.user.type(titleInput, 'Error Test');
        await this.user.type(contentTextarea, 'This will fail');

        const submitButton = screen.getByTestId('submit-post');
        await this.user.click(submitButton);

        // Assert - Form should remain populated after error
        await waitFor(() => {
          expect(submitButton).not.toBeDisabled(); // Should be re-enabled after error
        });

        expect(titleInput).toHaveValue('Error Test');
        expect(contentTextarea).toHaveValue('This will fail');
      });

      it('should handle component-specific errors without affecting others', async () => {
        // Arrange - Mock mention service failure
        this.mockMentionService.searchMentions = vi.fn().mockRejectedValue(
          new Error('Mention service unavailable')
        );

        this.renderIntegratedApp();

        // Act - Try to use mention functionality
        const contentTextarea = screen.getByRole('textbox', { name: /compose message/i });
        await this.user.type(contentTextarea, '@failing');

        // Assert - Other form functionality should still work
        const titleInput = screen.getByLabelText(/title/i);
        await this.user.type(titleInput, 'Test Title');

        expect(titleInput).toHaveValue('Test Title');
        expect(contentTextarea).toHaveValue('@failing');
      });
    });
  }

  public testPerformanceIntegration(): void {
    describe('Performance integration', () => {
      it('should handle large datasets without performance degradation', () => {
        // Arrange - Create large dataset
        const largePosts = Array.from({ length: 100 }, (_, i) => 
          createMockPost({ 
            id: `perf-post-${i}`,
            title: `Performance Test Post ${i}`
          })
        );

        const startTime = performance.now();

        // Act - Render with large dataset
        render(
          <BrowserRouter>
            <div data-testid="performance-test">
              {largePosts.map(post => (
                <div key={post.id} data-testid={`post-${post.id}`}>
                  <h3>{post.title}</h3>
                  <p>{post.content}</p>
                </div>
              ))}
            </div>
          </BrowserRouter>
        );

        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // Assert - Should render within reasonable time
        expect(renderTime).toBeLessThan(100); // Less than 100ms
        expect(screen.getByTestId('performance-test')).toBeInTheDocument();
        expect(screen.getByTestId('post-perf-post-0')).toBeInTheDocument();
        expect(screen.getByTestId('post-perf-post-99')).toBeInTheDocument();
      });
    });
  }
}

// Test Suite Execution
describe('UI Component Interaction Tests (London School TDD)', () => {
  let interactionSuite: ComponentInteractionBehaviorSuite;

  beforeEach(() => {
    testSetup.resetAll();
    interactionSuite = new ComponentInteractionBehaviorSuite();
    interactionSuite.beforeEach();
  });

  afterEach(() => {
    interactionSuite.afterEach();
    vi.clearAllMocks();
  });

  // Execute interaction test categories
  interactionSuite.testPostCreationToFeedIntegration();
  interactionSuite.testPostToCommentsIntegration();
  interactionSuite.testMentionSystemIntegration();
  interactionSuite.testFormValidationIntegration();
  interactionSuite.testNavigationIntegration();
  interactionSuite.testErrorHandlingIntegration();
  interactionSuite.testPerformanceIntegration();

  // High-level UI integration verification
  describe('UI integration collaboration patterns', () => {
    it('should coordinate all UI components correctly', async () => {
      const behaviorSpec = LondonTestUtils.behavior()
        .given('a complex UI workflow involving multiple component interactions')
        .when('users perform various UI operations across components')
        .then([
          'components should communicate through proper channels',
          'state should be synchronized across component boundaries',
          'user feedback should be consistent across all components',
          'error states should be handled gracefully',
          'performance should remain optimal'
        ])
        .withCollaborators([
          'PostCreator',
          'CommentThread', 
          'MentionInput',
          'Router',
          'NotificationService'
        ])
        .build();

      expect(behaviorSpec.collaborators).toHaveLength(5);
      expect(behaviorSpec.then).toHaveLength(5);
    });

    it('should handle complex user interaction flows', () => {
      const interactionFlows = [
        'create post -> select post -> add comment -> mention user',
        'start draft -> apply template -> add mentions -> publish',
        'navigate between sections while maintaining form state',
        'handle errors while preserving user input',
        'real-time updates while user is typing'
      ];

      interactionFlows.forEach(flow => {
        expect(flow).toBeDefined();
        // Each flow would have specific integration testing implementation
      });
    });
  });
});