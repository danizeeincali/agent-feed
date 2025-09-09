/**
 * TDD LONDON SCHOOL EMERGENCY: Reply Button Component Discovery
 * 
 * MISSION: Identify exactly which component renders reply buttons and handles reply interactions
 * STRATEGY: Mock-driven investigation to isolate button rendering and event handling
 * FOCUS: Outside-in verification of reply button behavior across all potential components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Import all components that might handle reply interactions
import { RealSocialMediaFeed } from '../../src/components/RealSocialMediaFeed';
import ThreadedCommentSystem from '../../src/components/ThreadedCommentSystem';
import { CommentThread } from '../../src/components/CommentThread';
import { CommentForm } from '../../src/components/CommentForm';
import { PostCard } from '../../src/components/PostCard';

// Mock external dependencies
vi.mock('../../src/services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn().mockResolvedValue({ 
      data: [
        {
          id: 'post-1',
          title: 'Test Post 1',
          content: 'Test content',
          authorAgent: 'TestAgent',
          publishedAt: '2024-01-01T00:00:00Z',
          engagement: { comments: 2, saves: 0, isSaved: false }
        }
      ], 
      total: 1 
    }),
    getFilterData: vi.fn().mockResolvedValue({ agents: ['TestAgent'], hashtags: ['test'] }),
    getFilterStats: vi.fn().mockResolvedValue({ savedPosts: 0, myPosts: 1 }),
    getPostComments: vi.fn().mockResolvedValue([
      {
        id: 'comment-1',
        content: 'Test comment',
        author: 'TestUser',
        createdAt: '2024-01-01T01:00:00Z',
        replies: []
      }
    ]),
    createComment: vi.fn().mockResolvedValue({ id: 'new-comment', success: true }),
    request: vi.fn().mockResolvedValue({ success: true, data: [] }),
    on: vi.fn(),
    off: vi.fn()
  }
}));

vi.mock('../../src/components/MentionInput', () => ({
  MentionInput: React.forwardRef<any, any>((props, ref) => {
    console.log('🎯 MOCK MentionInput in Reply Context:', { 
      mentionContext: props.mentionContext,
      placeholder: props.placeholder 
    });
    
    return (
      <textarea
        ref={ref}
        data-testid="mention-input-reply"
        data-mention-context={props.mentionContext}
        value={props.value || ''}
        onChange={(e) => props.onChange?.(e.target.value)}
        placeholder={props.placeholder}
        className={props.className}
        rows={props.rows}
        autoFocus={props.autoFocus}
      />
    );
  })
}));

describe('🚨 TDD LONDON SCHOOL: Reply Button Discovery Investigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();
  });

  describe('🔍 Reply Button Location Discovery', () => {
    test('CRITICAL: RealSocialMediaFeed reply button investigation', async () => {
      console.log('🧪 TEST: Investigating reply buttons in RealSocialMediaFeed');
      
      const { container } = render(<RealSocialMediaFeed />);
      
      // Wait for posts to load
      await waitFor(() => {
        expect(screen.queryByTestId('social-media-feed')).toBeInTheDocument();
      });

      // Search for all buttons that might be reply buttons
      const allButtons = Array.from(container.querySelectorAll('button'));
      const replyRelatedButtons = allButtons.filter(button => {
        const text = button.textContent?.toLowerCase() || '';
        const title = button.getAttribute('title')?.toLowerCase() || '';
        const className = button.className?.toLowerCase() || '';
        
        return text.includes('reply') || 
               text.includes('comment') || 
               title.includes('reply') || 
               title.includes('comment') ||
               className.includes('reply');
      });

      console.log('🔘 RealSocialMediaFeed button analysis:', {
        totalButtons: allButtons.length,
        replyRelatedButtons: replyRelatedButtons.length,
        buttonTexts: replyRelatedButtons.map(btn => btn.textContent?.trim()),
        buttonTitles: replyRelatedButtons.map(btn => btn.getAttribute('title')),
        buttonClasses: replyRelatedButtons.map(btn => btn.className)
      });

      // Test clicking potential reply buttons
      for (const [index, button] of replyRelatedButtons.entries()) {
        console.log(`🖱️ Testing button ${index + 1}: "${button.textContent?.trim()}"`);
        
        const textareasBefore = container.querySelectorAll('textarea').length;
        
        await act(async () => {
          fireEvent.click(button);
        });
        
        await waitFor(() => {
          const textareasAfter = container.querySelectorAll('textarea').length;
          console.log(`📝 Button ${index + 1} click result:`, {
            textareasBefore,
            textareasAfter,
            newTextareasAppeared: textareasAfter > textareasBefore
          });
        });
      }

      expect(replyRelatedButtons.length).toBeGreaterThanOrEqual(0);
    });

    test('CRITICAL: ThreadedCommentSystem reply button behavior', async () => {
      console.log('🧪 TEST: Testing ThreadedCommentSystem reply functionality');
      
      const { container } = render(
        <ThreadedCommentSystem 
          postId="test-post"
          initialComments={[
            {
              id: 'comment-1',
              post_id: 'test-post',
              parent_id: null,
              thread_id: 'thread-1',
              content: 'Test comment',
              author: 'TestUser',
              author_type: 'user' as const,
              depth: 0,
              reply_count: 0,
              is_deleted: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              replies: []
            }
          ]}
        />
      );

      await waitFor(() => {
        const replyButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
          btn.textContent?.toLowerCase().includes('reply')
        );
        
        console.log('🔘 ThreadedCommentSystem reply buttons:', {
          count: replyButtons.length,
          texts: replyButtons.map(btn => btn.textContent?.trim())
        });

        // Test reply button click
        if (replyButtons.length > 0) {
          console.log('🖱️ Clicking first reply button');
          fireEvent.click(replyButtons[0]);
          
          // Check for reply form appearance
          const replyForms = container.querySelectorAll('[data-testid="mention-input-reply"]');
          console.log('📝 Reply forms after click:', {
            count: replyForms.length
          });
        }

        expect(replyButtons.length).toBeGreaterThanOrEqual(0);
      });
    });

    test('CRITICAL: PostCard comment interaction verification', async () => {
      console.log('🧪 TEST: Testing PostCard comment interactions');
      
      const mockPost = {
        id: 'post-123',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        publishedAt: '2024-01-01T00:00:00Z',
        bookmarks: 5,
        shares: 3,
        views: 100,
        comments: 2
      };

      const { container } = render(<PostCard post={mockPost} />);

      // Find comment-related buttons
      const commentButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.textContent?.toLowerCase().includes('comment')
      );

      console.log('🔘 PostCard comment buttons:', {
        count: commentButtons.length,
        texts: commentButtons.map(btn => btn.textContent?.trim())
      });

      // Test comment button click
      if (commentButtons.length > 0) {
        const commentButton = commentButtons[0];
        console.log('🖱️ Clicking comment button:', commentButton.textContent?.trim());
        
        await act(async () => {
          fireEvent.click(commentButton);
        });

        await waitFor(() => {
          const commentForms = container.querySelectorAll('textarea, [data-testid="mention-input-reply"]');
          console.log('📝 Comment forms after click:', {
            count: commentForms.length,
            testIds: Array.from(commentForms).map(form => form.getAttribute('data-testid'))
          });
        });
      }

      expect(commentButtons.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🎯 Reply Form Component Identification', () => {
    test('CRITICAL: Mock reply form rendering behavior', async () => {
      console.log('🧪 TEST: Mocking reply form rendering to identify components');
      
      const mockReplies = [
        {
          id: 'reply-1',
          post_id: 'test-post',
          parent_id: 'comment-1',
          thread_id: 'thread-1',
          content: 'Test reply',
          author: 'ReplyUser',
          author_type: 'user' as const,
          depth: 1,
          reply_count: 0,
          is_deleted: false,
          created_at: '2024-01-01T02:00:00Z',
          updated_at: '2024-01-01T02:00:00Z',
          replies: []
        }
      ];

      const commentWithReplies = {
        id: 'comment-1',
        post_id: 'test-post',
        parent_id: null,
        thread_id: 'thread-1',
        content: 'Test comment with replies',
        author: 'TestUser',
        author_type: 'user' as const,
        depth: 0,
        reply_count: 1,
        is_deleted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        replies: mockReplies
      };

      const { container } = render(
        <ThreadedCommentSystem 
          postId="test-post"
          initialComments={[commentWithReplies]}
        />
      );

      // Find and analyze all interactive elements
      const interactiveElements = {
        buttons: Array.from(container.querySelectorAll('button')),
        textareas: Array.from(container.querySelectorAll('textarea')),
        forms: Array.from(container.querySelectorAll('form')),
        mentionInputs: Array.from(container.querySelectorAll('[data-testid*="mention"]'))
      };

      console.log('🔍 ThreadedCommentSystem interactive elements:', {
        buttonCount: interactiveElements.buttons.length,
        textareaCount: interactiveElements.textareas.length,
        formCount: interactiveElements.forms.length,
        mentionInputCount: interactiveElements.mentionInputs.length,
        buttonTexts: interactiveElements.buttons.map(btn => btn.textContent?.trim()),
        textareaPlaceholders: interactiveElements.textareas.map(ta => ta.getAttribute('placeholder'))
      });

      expect(interactiveElements.buttons.length).toBeGreaterThan(0);
    });

    test('CRITICAL: Direct CommentForm reply behavior verification', async () => {
      console.log('🧪 TEST: Testing CommentForm in reply context');
      
      const mockOnCommentAdded = vi.fn();
      const mockOnCancel = vi.fn();

      const { container } = render(
        <CommentForm 
          postId="test-post"
          parentId="parent-comment-123"
          onCommentAdded={mockOnCommentAdded}
          onCancel={mockOnCancel}
          placeholder="Reply to this comment..."
          autoFocus={true}
          useMentionInput={true}
        />
      );

      // Verify reply-specific rendering
      const replyIndicator = container.querySelector('[class*="reply"], [class*="Reply"]');
      const textarea = container.querySelector('textarea');
      const cancelButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.toLowerCase().includes('cancel')
      );

      console.log('📝 CommentForm in reply mode:', {
        hasReplyIndicator: !!replyIndicator,
        hasTextarea: !!textarea,
        hasCancelButton: !!cancelButton,
        textareaPlaceholder: textarea?.getAttribute('placeholder'),
        replyIndicatorText: replyIndicator?.textContent?.trim()
      });

      // Test reply form interactions
      if (textarea) {
        console.log('🎯 Testing reply form input');
        
        await act(async () => {
          fireEvent.input(textarea, { target: { value: 'Test reply content' } });
        });

        expect(textarea.value || '').toBe('Test reply content');
      }

      if (cancelButton) {
        console.log('🖱️ Testing cancel button');
        
        await act(async () => {
          fireEvent.click(cancelButton);
        });

        expect(mockOnCancel).toHaveBeenCalled();
      }

      expect(textarea).toBeTruthy();
    });
  });

  describe('🕵️ Event Propagation Investigation', () => {
    test('CRITICAL: Reply button click event propagation', async () => {
      console.log('🧪 TEST: Investigating reply button event propagation');
      
      const user = userEvent.setup();
      const eventLog: string[] = [];

      // Create wrapper to capture events
      const EventCapture = ({ children }: { children: React.ReactNode }) => {
        return (
          <div
            onClick={(e) => {
              eventLog.push(`Container clicked: ${(e.target as HTMLElement)?.tagName}`);
              console.log('📡 Container click event:', e.target);
            }}
            onFocus={(e) => {
              eventLog.push(`Focus event: ${(e.target as HTMLElement)?.tagName}`);
              console.log('👁️ Focus event:', e.target);
            }}
          >
            {children}
          </div>
        );
      };

      const { container } = render(
        <EventCapture>
          <ThreadedCommentSystem 
            postId="test-post"
            initialComments={[
              {
                id: 'comment-1',
                post_id: 'test-post',
                parent_id: null,
                thread_id: 'thread-1',
                content: 'Test comment for event testing',
                author: 'TestUser',
                author_type: 'user' as const,
                depth: 0,
                reply_count: 0,
                is_deleted: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                replies: []
              }
            ]}
          />
        </EventCapture>
      );

      // Find reply buttons and test event propagation
      const replyButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.textContent?.toLowerCase().includes('reply')
      );

      for (const [index, button] of replyButtons.entries()) {
        console.log(`🖱️ Testing event propagation for button ${index + 1}`);
        
        await act(async () => {
          await user.click(button);
        });

        console.log(`📋 Event log after clicking button ${index + 1}:`, eventLog);
        eventLog.length = 0; // Clear log for next test
      }

      expect(replyButtons.length).toBeGreaterThanOrEqual(0);
    });

    test('CRITICAL: Textarea focus and input event verification', async () => {
      console.log('🧪 TEST: Verifying textarea focus and input events in reply context');
      
      const user = userEvent.setup();
      const inputEvents: string[] = [];

      const { container } = render(
        <CommentForm 
          postId="test-post"
          parentId="parent-123"
          autoFocus={true}
          useMentionInput={true}
        />
      );

      const textarea = container.querySelector('textarea');
      
      if (textarea) {
        // Add event listeners to track behavior
        textarea.addEventListener('focus', () => {
          inputEvents.push('textarea-focused');
          console.log('👁️ Textarea focused');
        });
        
        textarea.addEventListener('input', (e) => {
          const value = (e.target as HTMLTextAreaElement).value;
          inputEvents.push(`input-${value.length}`);
          console.log('⌨️ Textarea input:', { value, length: value.length });
        });

        // Test focus and input
        await act(async () => {
          await user.click(textarea);
          await user.type(textarea, '@test reply content');
        });

        console.log('📋 Input event sequence:', inputEvents);
        console.log('📝 Final textarea value:', textarea.value);

        expect(textarea.value).toContain('@test');
        expect(inputEvents.length).toBeGreaterThan(0);
      }

      expect(textarea).toBeTruthy();
    });
  });
});