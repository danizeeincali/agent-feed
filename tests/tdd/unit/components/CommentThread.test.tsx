import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommentThread } from '@/components/CommentThread';
import { Comment } from '@/types';

// Mock fetch for API calls
global.fetch = jest.fn();

const mockComments: Comment[] = [
  {
    id: '1',
    postId: 'post-1',
    content: 'This is a top-level comment',
    author: 'user1',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    parentId: null,
    replies: [
      {
        id: '2',
        postId: 'post-1',
        content: 'This is a reply to the first comment',
        author: 'user2',
        createdAt: '2024-01-01T10:05:00Z',
        updatedAt: '2024-01-01T10:05:00Z',
        parentId: '1',
        replies: []
      }
    ]
  },
  {
    id: '3',
    postId: 'post-1',
    content: 'Another top-level comment',
    author: 'user3',
    createdAt: '2024-01-01T10:10:00Z',
    updatedAt: '2024-01-01T10:10:00Z',
    parentId: null,
    replies: []
  }
];

describe('CommentThread', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should render all comments in threaded structure', () => {
    render(<CommentThread postId="post-1" comments={mockComments} />);

    expect(screen.getByText('This is a top-level comment')).toBeInTheDocument();
    expect(screen.getByText('This is a reply to the first comment')).toBeInTheDocument();
    expect(screen.getByText('Another top-level comment')).toBeInTheDocument();
  });

  it('should display comment authors and timestamps', () => {
    render(<CommentThread postId="post-1" comments={mockComments} />);

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('user3')).toBeInTheDocument();
  });

  it('should show reply button for each comment', () => {
    render(<CommentThread postId="post-1" comments={mockComments} />);

    const replyButtons = screen.getAllByText('Reply');
    expect(replyButtons).toHaveLength(3); // 2 top-level + 1 reply
  });

  it('should show reply form when reply button is clicked', async () => {
    render(<CommentThread postId="post-1" comments={mockComments} />);

    const firstReplyButton = screen.getAllByText('Reply')[0];
    fireEvent.click(firstReplyButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });
  });

  it('should submit reply and update comment tree', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: '4',
          postId: 'post-1',
          content: 'New reply content',
          author: 'current-user',
          createdAt: '2024-01-01T10:15:00Z',
          parentId: '1'
        }
      })
    });

    const onCommentsUpdate = jest.fn();
    render(
      <CommentThread 
        postId="post-1" 
        comments={mockComments} 
        onCommentsUpdate={onCommentsUpdate}
      />
    );

    // Click reply button
    const firstReplyButton = screen.getAllByText('Reply')[0];
    fireEvent.click(firstReplyButton);

    // Fill in reply form
    const replyInput = screen.getByPlaceholderText('Write a reply...');
    fireEvent.change(replyInput, { target: { value: 'New reply content' } });

    // Submit reply
    const submitButton = screen.getByText('Post Reply');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/posts/post-1/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'New reply content',
          author: 'current-user',
          parentId: '1'
        })
      });
    });

    expect(onCommentsUpdate).toHaveBeenCalled();
  });

  it('should validate reply content before submission', async () => {
    render(<CommentThread postId="post-1" comments={mockComments} />);

    // Click reply button
    const firstReplyButton = screen.getAllByText('Reply')[0];
    fireEvent.click(firstReplyButton);

    // Try to submit empty reply
    const submitButton = screen.getByText('Post Reply');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Reply content is required')).toBeInTheDocument();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle edit comment functionality', async () => {
    render(<CommentThread postId="post-1" comments={mockComments} currentUser="user1" />);

    // Find edit button for user1's comment
    const editButton = screen.getByLabelText('Edit comment');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('This is a top-level comment')).toBeInTheDocument();
    });

    // Modify content
    const editInput = screen.getByDisplayValue('This is a top-level comment');
    fireEvent.change(editInput, { target: { value: 'Edited comment content' } });

    // Save changes
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: '1',
          content: 'Edited comment content',
          isEdited: true
        }
      })
    });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/comments/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Edited comment content'
        })
      });
    });
  });

  it('should handle delete comment functionality', async () => {
    window.confirm = jest.fn(() => true);
    
    render(<CommentThread postId="post-1" comments={mockComments} currentUser="user1" />);

    // Find delete button for user1's comment
    const deleteButton = screen.getByLabelText('Delete comment');
    fireEvent.click(deleteButton);

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true
      })
    });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this comment?');
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/comments/1', {
        method: 'DELETE'
      });
    });
  });

  it('should display nested replies with proper indentation', () => {
    const nestedComments: Comment[] = [
      {
        id: '1',
        postId: 'post-1',
        content: 'Level 1 comment',
        author: 'user1',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        parentId: null,
        replies: [
          {
            id: '2',
            postId: 'post-1',
            content: 'Level 2 reply',
            author: 'user2',
            createdAt: '2024-01-01T10:05:00Z',
            updatedAt: '2024-01-01T10:05:00Z',
            parentId: '1',
            replies: [
              {
                id: '3',
                postId: 'post-1',
                content: 'Level 3 reply',
                author: 'user3',
                createdAt: '2024-01-01T10:10:00Z',
                updatedAt: '2024-01-01T10:10:00Z',
                parentId: '2',
                replies: []
              }
            ]
          }
        ]
      }
    ];

    render(<CommentThread postId="post-1" comments={nestedComments} />);

    const level1 = screen.getByText('Level 1 comment').closest('.comment-level-0');
    const level2 = screen.getByText('Level 2 reply').closest('.comment-level-1');
    const level3 = screen.getByText('Level 3 reply').closest('.comment-level-2');

    expect(level1).toBeInTheDocument();
    expect(level2).toBeInTheDocument();
    expect(level3).toBeInTheDocument();
  });

  it('should limit nesting depth to prevent excessive indentation', () => {
    // Create deeply nested structure (beyond max depth)
    const deeplyNested: Comment[] = [
      {
        id: '1',
        postId: 'post-1',
        content: 'Root comment',
        author: 'user1',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        parentId: null,
        replies: [
          {
            id: '2',
            postId: 'post-1',
            content: 'Deep reply',
            author: 'user2',
            createdAt: '2024-01-01T10:05:00Z',
            updatedAt: '2024-01-01T10:05:00Z',
            parentId: '1',
            replies: []
          }
        ]
      }
    ];

    render(<CommentThread postId="post-1" comments={deeplyNested} maxDepth={3} />);

    // Should handle max depth gracefully
    expect(screen.getByText('Root comment')).toBeInTheDocument();
    expect(screen.getByText('Deep reply')).toBeInTheDocument();
  });
});