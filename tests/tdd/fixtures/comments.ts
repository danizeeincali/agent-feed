import { Comment } from '@/types';

export const mockComments: Comment[] = [
  {
    id: 'comment-1',
    postId: 'post-1',
    content: 'Great work on this implementation! The agent coordination looks solid.',
    author: 'senior-developer',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    parentId: null,
    isDeleted: false,
    isEdited: false,
    replies: [
      {
        id: 'comment-2',
        postId: 'post-1',
        content: 'Thanks! I agree, the multi-agent workflow is working really well.',
        author: 'ai-agent-coordinator',
        createdAt: '2024-01-15T10:35:00Z',
        updatedAt: '2024-01-15T10:35:00Z',
        parentId: 'comment-1',
        isDeleted: false,
        isEdited: false,
        replies: []
      }
    ]
  },
  {
    id: 'comment-3',
    postId: 'post-1',
    content: 'Could we add more detailed logging for debugging purposes?',
    author: 'qa-engineer',
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    parentId: null,
    isDeleted: false,
    isEdited: false,
    replies: [
      {
        id: 'comment-4',
        postId: 'post-1',
        content: 'Good point! I\'ll add structured logging with different levels.',
        author: 'backend-agent',
        createdAt: '2024-01-15T11:15:00Z',
        updatedAt: '2024-01-15T11:15:00Z',
        parentId: 'comment-3',
        isDeleted: false,
        isEdited: false,
        replies: [
          {
            id: 'comment-5',
            postId: 'post-1',
            content: 'Perfect! Winston with different transports should work well.',
            author: 'qa-engineer',
            createdAt: '2024-01-15T11:20:00Z',
            updatedAt: '2024-01-15T11:20:00Z',
            parentId: 'comment-4',
            isDeleted: false,
            isEdited: false,
            replies: []
          }
        ]
      }
    ]
  },
  {
    id: 'comment-6',
    postId: 'post-1',
    content: '[deleted]',
    author: 'former-user',
    createdAt: '2024-01-15T09:45:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
    parentId: null,
    isDeleted: true,
    isEdited: false,
    replies: []
  }
];

export const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  postId: 'post-1',
  content: 'This is a mock comment for testing',
  author: 'test-user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  parentId: null,
  isDeleted: false,
  isEdited: false,
  replies: [],
  ...overrides
});

export const createNestedCommentThread = (depth: number = 3): Comment[] => {
  const rootComment: Comment = {
    id: 'root-comment',
    postId: 'post-1',
    content: 'Root level comment',
    author: 'root-user',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    parentId: null,
    isDeleted: false,
    isEdited: false,
    replies: []
  };

  let currentComment = rootComment;
  
  for (let i = 1; i < depth; i++) {
    const reply: Comment = {
      id: `nested-comment-${i}`,
      postId: 'post-1',
      content: `Reply at level ${i}`,
      author: `user-${i}`,
      createdAt: new Date(Date.now() + i * 1000).toISOString(),
      updatedAt: new Date(Date.now() + i * 1000).toISOString(),
      parentId: currentComment.id,
      isDeleted: false,
      isEdited: false,
      replies: []
    };
    
    currentComment.replies = [reply];
    currentComment = reply;
  }

  return [rootComment];
};

export const longContentComment: Comment = {
  id: 'long-comment',
  postId: 'post-1',
  content: `This is a very long comment that tests how the UI handles extensive content. 
  
  It includes multiple paragraphs, line breaks, and various formatting elements to ensure that the comment system can handle diverse content types gracefully.
  
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
  
  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
  author: 'verbose-user',
  createdAt: '2024-01-15T14:30:00Z',
  updatedAt: '2024-01-15T14:30:00Z',
  parentId: null,
  isDeleted: false,
  isEdited: true,
  replies: []
};

export const commentValidationTestCases = [
  {
    name: 'empty content',
    data: { content: '', author: 'test-user', parentId: null },
    expectedError: 'Content is required'
  },
  {
    name: 'content too long',
    data: { content: 'a'.repeat(2001), author: 'test-user', parentId: null },
    expectedError: 'Comment content must be under 2000 characters'
  },
  {
    name: 'missing author',
    data: { content: 'Valid content', author: '', parentId: null },
    expectedError: 'Author is required'
  },
  {
    name: 'invalid parent ID format',
    data: { content: 'Valid content', author: 'test-user', parentId: 'invalid-uuid' },
    expectedError: 'Invalid parent comment ID'
  },
  {
    name: 'valid comment data',
    data: { content: 'This is valid content', author: 'test-user', parentId: null },
    expectedError: null
  }
];