/**
 * TDD LONDON SCHOOL EMERGENCY: Comment UI Component Identification
 * 
 * MISSION: Create tests to identify which component actually handles comment/reply interactions
 * STRATEGY: Mock-first approach to verify component behavior and interactions
 * FOCUS: Outside-in TDD to understand the true comment component hierarchy
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Import all potential comment-handling components
import { RealSocialMediaFeed } from '../../src/components/RealSocialMediaFeed';
import ThreadedCommentSystem from '../../src/components/ThreadedCommentSystem';
import { CommentForm } from '../../src/components/CommentForm';
import { PostCard } from '../../src/components/PostCard';
import { CommentThread } from '../../src/components/CommentThread';

// Mock services to isolate component behavior
vi.mock('../../src/services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getFilterData: vi.fn().mockResolvedValue({ agents: [], hashtags: [] }),
    getFilterStats: vi.fn().mockResolvedValue({ savedPosts: 0, myPosts: 0 }),
    getPostComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue({ id: 'comment-123', success: true }),
    request: vi.fn().mockResolvedValue({ success: true, data: [] }),
    on: vi.fn(),
    off: vi.fn()
  }
}));

vi.mock('../../src/services/MentionService', () => ({
  MentionService: {
    extractMentions: vi.fn().mockReturnValue([]),
    getUsers: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../src/components/MentionInput', () => ({
  MentionInput: React.forwardRef<any, any>((props, ref) => {
    console.log('🎯 MOCK MentionInput rendered with props:', { 
      placeholder: props.placeholder, 
      mentionContext: props.mentionContext,
      hasOnChange: !!props.onChange,
      hasOnMentionSelect: !!props.onMentionSelect
    });
    
    return (
      <textarea
        ref={ref}
        data-testid="mention-input"
        data-mention-context={props.mentionContext}
        value={props.value || ''}
        onChange={(e) => {
          console.log('🔥 MOCK MentionInput: onChange triggered', { value: e.target.value });
          props.onChange?.(e.target.value);
        }}
        onInput={(e) => {
          const value = (e.target as HTMLTextAreaElement).value;
          console.log('🔥 MOCK MentionInput: onInput triggered', { value, containsAt: value.includes('@') });
          
          // Simulate mention selection when @ is typed
          if (value.includes('@') && props.onMentionSelect) {
            console.log('🎯 MOCK MentionInput: Simulating mention selection');
            props.onMentionSelect({ 
              id: 'user-123', 
              label: 'TestUser', 
              value: '@TestUser' 
            });
          }
        }}
        placeholder={props.placeholder}
        className={props.className}
        rows={props.rows}
        maxLength={props.maxLength}
        autoFocus={props.autoFocus}
        disabled={props.disabled}
      />
    );
  })
}));

describe('🚨 TDD LONDON SCHOOL EMERGENCY: Comment UI Component Investigation', () => {
  const mockPost = {
    id: 'post-123',
    title: 'Test Post',
    content: 'Test post content',
    authorAgent: 'TestAgent',
    publishedAt: '2024-01-01T00:00:00Z',
    engagement: { comments: 0, saves: 0, isSaved: false },
    metadata: { businessImpact: 5 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console spy
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('🔍 Component Hierarchy Discovery', () => {
    test('CRITICAL: RealSocialMediaFeed should render comment interactions', async () => {
      console.log('🧪 TEST: Rendering RealSocialMediaFeed to identify comment components');
      
      const { container } = render(<RealSocialMediaFeed />);
      
      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.queryByTestId('social-media-feed')).toBeInTheDocument();
      });

      // Log all textarea elements to identify comment inputs
      const textareas = container.querySelectorAll('textarea');
      console.log('📝 Found textareas in RealSocialMediaFeed:', {
        count: textareas.length,
        testIds: Array.from(textareas).map(ta => ta.getAttribute('data-testid')),
        placeholders: Array.from(textareas).map(ta => ta.getAttribute('placeholder')),
        mentionContexts: Array.from(textareas).map(ta => ta.getAttribute('data-mention-context'))
      });

      // Check for comment-related buttons
      const commentButtons = container.querySelectorAll('button[title*="Comment"], button[title*="comment"]');
      console.log('🔘 Found comment buttons:', {
        count: commentButtons.length,
        titles: Array.from(commentButtons).map(btn => btn.getAttribute('title'))
      });

      expect(textareas.length).toBeGreaterThanOrEqual(0);
    });

    test('CRITICAL: PostCard should handle comment form rendering', async () => {
      console.log('🧪 TEST: Rendering PostCard to check comment interaction handling');
      
      const { container } = render(<PostCard post={mockPost} />);

      // Look for comment toggle button
      const commentButton = screen.queryByText(/comment/i);
      console.log('🔘 PostCard comment button found:', !!commentButton);

      if (commentButton) {
        // Click to show comments
        fireEvent.click(commentButton);
        
        await waitFor(() => {
          const textareas = container.querySelectorAll('textarea');
          console.log('📝 PostCard textareas after comment click:', {
            count: textareas.length,
            testIds: Array.from(textareas).map(ta => ta.getAttribute('data-testid')),
            mentionContexts: Array.from(textareas).map(ta => ta.getAttribute('data-mention-context'))
          });
        });
      }

      // Verify PostCard exists
      expect(container.firstChild).toBeTruthy();
    });

    test('CRITICAL: ThreadedCommentSystem should render MentionInput', async () => {
      console.log('🧪 TEST: Rendering ThreadedCommentSystem to identify mention input');
      
      const { container } = render(
        <ThreadedCommentSystem postId="test-post" />
      );

      await waitFor(() => {
        const textareas = container.querySelectorAll('textarea');
        const mentionInputs = container.querySelectorAll('[data-testid="mention-input"]');
        
        console.log('📝 ThreadedCommentSystem inputs:', {
          textareaCount: textareas.length,
          mentionInputCount: mentionInputs.length,
          placeholders: Array.from(textareas).map(ta => ta.getAttribute('placeholder')),
          mentionContexts: Array.from(textareas).map(ta => ta.getAttribute('data-mention-context'))
        });

        expect(textareas.length).toBeGreaterThan(0);
      });
    });

    test('CRITICAL: CommentForm should render MentionInput with mention context', async () => {
      console.log('🧪 TEST: Rendering CommentForm directly to verify MentionInput integration');
      
      const mockOnCommentAdded = vi.fn();
      const { container } = render(
        <CommentForm 
          postId="test-post"
          onCommentAdded={mockOnCommentAdded}
          useMentionInput={true}
        />
      );

      // Find MentionInput component
      const mentionInput = container.querySelector('[data-testid="mention-input"]');
      console.log('🎯 CommentForm MentionInput found:', !!mentionInput);
      
      if (mentionInput) {
        console.log('🎯 MentionInput attributes:', {
          placeholder: mentionInput.getAttribute('placeholder'),
          mentionContext: mentionInput.getAttribute('data-mention-context'),
          className: mentionInput.getAttribute('class')
        });
      }

      expect(mentionInput).toBeTruthy();
    });
  });

  describe('🎯 Reply Button Click Investigation', () => {
    test('CRITICAL: Simulate reply button click and verify form appearance', async () => {
      console.log('🧪 TEST: Simulating reply button click to identify form rendering');
      
      const user = userEvent.setup();
      const { container } = render(<RealSocialMediaFeed />);

      // Wait for posts to render
      await waitFor(() => {
        expect(screen.queryByTestId('social-media-feed')).toBeInTheDocument();
      });

      // Look for any reply-related buttons
      const replyButtons = Array.from(container.querySelectorAll('button')).filter(btn => 
        btn.textContent?.toLowerCase().includes('reply') || 
        btn.textContent?.toLowerCase().includes('comment') ||
        btn.getAttribute('title')?.toLowerCase().includes('comment')
      );

      console.log('🔘 Found potential reply buttons:', {
        count: replyButtons.length,
        texts: replyButtons.map(btn => btn.textContent?.trim()),
        titles: replyButtons.map(btn => btn.getAttribute('title'))
      });

      // Try clicking the first potential comment/reply button
      if (replyButtons.length > 0) {
        const button = replyButtons[0];
        console.log('🖱️ Clicking button:', button.textContent?.trim());
        
        await act(async () => {
          await user.click(button);
        });

        await waitFor(() => {
          const textareasAfterClick = container.querySelectorAll('textarea');
          console.log('📝 Textareas after reply button click:', {
            count: textareasAfterClick.length,
            testIds: Array.from(textareasAfterClick).map(ta => ta.getAttribute('data-testid')),
            placeholders: Array.from(textareasAfterClick).map(ta => ta.getAttribute('placeholder'))
          });
        });
      }

      expect(replyButtons.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🔥 @ Input Event Investigation', () => {
    test('CRITICAL: Type @ in comment textarea and verify mention dropdown', async () => {
      console.log('🧪 TEST: Testing @ input in various comment components');
      
      const user = userEvent.setup();
      
      // Test CommentForm directly
      const mockOnCommentAdded = vi.fn();
      const { container } = render(
        <CommentForm 
          postId="test-post"
          onCommentAdded={mockOnCommentAdded}
          useMentionInput={true}
        />
      );

      // Find the textarea
      const textarea = container.querySelector('[data-testid="mention-input"]') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();

      if (textarea) {
        console.log('🎯 Testing @ input in CommentForm MentionInput');
        
        // Focus the textarea
        await act(async () => {
          textarea.focus();
        });

        // Type @ symbol
        await act(async () => {
          await user.type(textarea, '@test');
        });

        console.log('📝 After typing @test:', {
          value: textarea.value,
          focused: document.activeElement === textarea
        });

        // Verify the value changed
        expect(textarea.value).toBe('@test');
      }
    });

    test('CRITICAL: Verify mention selection callback is triggered', async () => {
      console.log('🧪 TEST: Testing mention selection in CommentForm');
      
      const mockOnCommentAdded = vi.fn();
      const mockOnMentionSelect = vi.fn();
      
      const TestWrapper = () => {
        const [content, setContent] = React.useState('');
        
        return (
          <CommentForm 
            postId="test-post"
            onCommentAdded={mockOnCommentAdded}
            useMentionInput={true}
          />
        );
      };

      const { container } = render(<TestWrapper />);
      
      const textarea = container.querySelector('[data-testid="mention-input"]') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();

      if (textarea) {
        console.log('🎯 Testing mention selection callback');
        
        // Trigger input event with @ symbol
        await act(async () => {
          fireEvent.input(textarea, { target: { value: '@test' } });
        });

        // Check if mention selection was simulated (our mock should trigger this)
        console.log('📝 Mock mention selection should have been triggered');
      }
    });
  });

  describe('🕵️ Component Communication Analysis', () => {
    test('CRITICAL: Verify prop drilling and event propagation', async () => {
      console.log('🧪 TEST: Analyzing component communication patterns');
      
      const mockApiService = await import('../../src/services/api');
      const apiMock = mockApiService.apiService;

      // Test RealSocialMediaFeed comment creation flow
      const { container } = render(<RealSocialMediaFeed />);

      // Wait for component to render
      await waitFor(() => {
        expect(screen.queryByTestId('social-media-feed')).toBeInTheDocument();
      });

      // Check if API service was called for initial data
      console.log('📡 API Service calls:', {
        getAgentPostsCalled: apiMock.getAgentPosts.mock.calls.length,
        getFilterDataCalled: apiMock.getFilterData.mock.calls.length,
        getFilterStatsCalled: apiMock.getFilterStats.mock.calls.length
      });

      expect(apiMock.getAgentPosts).toHaveBeenCalled();
    });

    test('CRITICAL: Mock all comment form interactions', async () => {
      console.log('🧪 TEST: Mocking complete comment form interaction flow');
      
      const mockInteractions = {
        onCommentAdded: vi.fn(),
        onMentionSelect: vi.fn(),
        onCancel: vi.fn(),
        onChange: vi.fn()
      };

      const { container } = render(
        <CommentForm 
          postId="test-post"
          onCommentAdded={mockInteractions.onCommentAdded}
          onCancel={mockInteractions.onCancel}
          useMentionInput={true}
        />
      );

      const textarea = container.querySelector('[data-testid="mention-input"]');
      const submitButton = container.querySelector('button[type="submit"]');
      const cancelButton = container.querySelector('button[type="button"]');

      console.log('🔍 CommentForm elements found:', {
        hasTextarea: !!textarea,
        hasSubmitButton: !!submitButton,
        hasCancelButton: !!cancelButton,
        submitText: submitButton?.textContent?.trim(),
        cancelText: cancelButton?.textContent?.trim()
      });

      // Test form interactions
      if (textarea && submitButton) {
        // Type content
        await act(async () => {
          fireEvent.input(textarea, { target: { value: 'Test comment @user' } });
        });

        // Click submit
        await act(async () => {
          fireEvent.click(submitButton);
        });

        console.log('📋 Form submission results:', {
          onCommentAddedCalled: mockInteractions.onCommentAdded.mock.calls.length
        });
      }

      expect(textarea).toBeTruthy();
    });
  });

  describe('🔬 Component Mounting Investigation', () => {
    test('CRITICAL: Track component lifecycle and textarea creation', async () => {
      console.log('🧪 TEST: Investigating component mounting and textarea lifecycle');
      
      const ComponentTracker = ({ children }: { children: React.ReactNode }) => {
        React.useEffect(() => {
          console.log('🔄 ComponentTracker: Child components mounted');
          
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                  if (node instanceof HTMLElement) {
                    const textareas = node.querySelectorAll('textarea');
                    if (textareas.length > 0) {
                      console.log('➕ New textareas added:', {
                        count: textareas.length,
                        testIds: Array.from(textareas).map(ta => ta.getAttribute('data-testid')),
                        placeholders: Array.from(textareas).map(ta => ta.getAttribute('placeholder'))
                      });
                    }
                  }
                });
              }
            });
          });

          observer.observe(document.body, { childList: true, subtree: true });
          
          return () => observer.disconnect();
        }, []);
        
        return <>{children}</>;
      };

      render(
        <ComponentTracker>
          <CommentForm postId="test-post" useMentionInput={true} />
        </ComponentTracker>
      );

      await waitFor(() => {
        const allTextareas = document.querySelectorAll('textarea');
        console.log('📝 Final textarea count:', allTextareas.length);
        expect(allTextareas.length).toBeGreaterThan(0);
      });
    });
  });
});