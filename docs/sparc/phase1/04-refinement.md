# SPARC Phase 1: Post Structure Enhancement - REFINEMENT

## TDD Implementation Strategy

This document outlines the Test-Driven Development approach for implementing Phase 1 post structure enhancements, following the Red-Green-Refactor cycle.

## 1. TDD Methodology Overview

### 1.1 Red-Green-Refactor Cycle

```
1. RED: Write failing test that describes desired functionality
2. GREEN: Write minimal code to make the test pass
3. REFACTOR: Improve code quality while keeping tests green
4. REPEAT: Continue cycle for each feature
```

### 1.2 Testing Pyramid Strategy

```
Unit Tests (70%)
├── Character counting functions
├── Content truncation logic
├── Expansion state management
└── Validation utilities

Integration Tests (20%)
├── Component interaction
├── State management flow
├── API integration
└── Event handling

E2E Tests (10%)
├── Complete user workflows
├── Cross-component behavior
└── Performance validation
```

## 2. Component-Level TDD Implementation

### 2.1 EnhancedPostCard Component

#### Test-First Development Process

**Step 1: Write Failing Test**
```typescript
// RED: Test that doesn't pass yet
it('should display posts in collapsed state by default', () => {
  render(<EnhancedPostCard post={mockLongContentPost} />);
  
  expect(screen.getByText(/This is a very long post content.../)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
  expect(screen.queryByText(mockLongContentPost.content)).not.toBeInTheDocument();
});
```

**Step 2: Make Test Pass**
```typescript
// GREEN: Minimal implementation
const EnhancedPostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const shouldTruncate = post.content.length > 280;
  const displayContent = shouldTruncate && !isExpanded 
    ? post.content.substring(0, 280) + '...' 
    : post.content;
  
  return (
    <div>
      <div>{displayContent}</div>
      {shouldTruncate && (
        <button onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
};
```

**Step 3: Refactor for Quality**
```typescript
// REFACTOR: Improve implementation
const EnhancedPostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { displayContent, shouldTruncate } = useMemo(() => {
    const shouldTruncate = post.content.length > CONTENT_TRUNCATE_LIMIT;
    const displayContent = shouldTruncate && !isExpanded 
      ? truncateContent(post.content, CONTENT_TRUNCATE_LIMIT)
      : post.content;
    
    return { displayContent, shouldTruncate };
  }, [post.content, isExpanded]);
  
  const handleToggleExpansion = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  return (
    <article className="enhanced-post-card">
      <PostContent 
        content={displayContent}
        isExpanded={isExpanded}
        shouldTruncate={shouldTruncate}
        onToggle={handleToggleExpansion}
      />
    </article>
  );
};
```

### 2.2 Character Counting TDD Implementation

#### Utility Function Development

**RED: Write failing tests first**
```typescript
describe('Character Counting', () => {
  it('should count basic text characters correctly', () => {
    expect(countCharacters('Hello world')).toBe(11);
  });
  
  it('should count emojis as 2 characters each', () => {
    expect(countCharacters('Hello 👋 world 🌍')).toBe(17);
  });
  
  it('should handle empty strings', () => {
    expect(countCharacters('')).toBe(0);
  });
});
```

**GREEN: Implement basic functionality**
```typescript
function countCharacters(text: string): number {
  if (!text) return 0;
  
  let count = 0;
  let i = 0;
  
  while (i < text.length) {
    const codePoint = text.codePointAt(i);
    if (codePoint && codePoint > 0xFFFF) {
      count += 2; // Emoji or high surrogate pair
      i += 2;
    } else {
      count += 1;
      i += 1;
    }
  }
  
  return count;
}
```

**REFACTOR: Add validation and edge cases**
```typescript
interface CharacterCountOptions {
  includeEmojis?: boolean;
  countSpaces?: boolean;
}

function countCharacters(
  text: string, 
  options: CharacterCountOptions = {}
): number {
  const { includeEmojis = true, countSpaces = true } = options;
  
  if (!text || typeof text !== 'string') return 0;
  
  let count = 0;
  
  for (const char of text) {
    if (!countSpaces && char === ' ') continue;
    
    const codePoint = char.codePointAt(0);
    if (includeEmojis && codePoint && isEmoji(codePoint)) {
      count += 2;
    } else {
      count += 1;
    }
  }
  
  return count;
}
```

### 2.3 Expansion Animation TDD

#### Animation Function Testing

**RED: Test animation behavior**
```typescript
describe('Post Expansion Animations', () => {
  it('should animate expansion smoothly', async () => {
    const element = document.createElement('div');
    const targetHeight = 200;
    
    const promise = animateExpand(element, targetHeight);
    
    expect(element.style.transition).toBe('height 200ms ease-out');
    expect(element.style.height).toBe('0px');
    
    await promise;
    
    expect(element.style.height).toBe('200px');
  });
});
```

**GREEN: Basic animation implementation**
```typescript
async function animateExpand(
  element: HTMLElement, 
  targetHeight: number
): Promise<void> {
  return new Promise(resolve => {
    element.style.transition = 'height 200ms ease-out';
    element.style.height = '0px';
    
    requestAnimationFrame(() => {
      element.style.height = `${targetHeight}px`;
      
      setTimeout(() => {
        element.style.height = 'auto';
        resolve();
      }, 200);
    });
  });
}
```

**REFACTOR: Add error handling and optimization**
```typescript
async function animateExpand(
  element: HTMLElement, 
  targetHeight: number
): Promise<void> {
  if (!element || targetHeight < 0) {
    throw new Error('Invalid animation parameters');
  }
  
  return new Promise((resolve, reject) => {
    const initialHeight = element.offsetHeight;
    
    try {
      element.style.transition = 'height 200ms ease-out';
      element.style.height = `${initialHeight}px`;
      
      requestAnimationFrame(() => {
        element.style.height = `${targetHeight}px`;
        
        const handleTransitionEnd = () => {
          element.removeEventListener('transitionend', handleTransitionEnd);
          element.style.height = 'auto';
          element.style.transition = '';
          resolve();
        };
        
        element.addEventListener('transitionend', handleTransitionEnd);
        
        // Fallback timeout
        setTimeout(() => {
          element.removeEventListener('transitionend', handleTransitionEnd);
          resolve();
        }, 250);
      });
    } catch (error) {
      reject(error);
    }
  });
}
```

## 3. Feature-Level TDD Implementation

### 3.1 Sharing Functionality Removal

#### Test-Driven Removal Process

**RED: Write tests to verify sharing is completely removed**
```typescript
describe('Sharing Functionality Removal', () => {
  it('should not render any share buttons', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('share-button')).not.toBeInTheDocument();
  });
  
  it('should not have sharing-related API calls', () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    
    render(<EnhancedPostCard post={mockPost} />);
    
    const shareEndpoints = fetchSpy.mock.calls.filter(call => 
      call[0].includes('/share')
    );
    
    expect(shareEndpoints).toHaveLength(0);
  });
});
```

**GREEN: Remove sharing code**
```typescript
// Remove Share2 import
import { Heart, MessageCircle, /* Share2, */ MoreHorizontal } from 'lucide-react';

const PostActions: React.FC<PostActionsProps> = ({ post, onLike, onComment }) => {
  return (
    <div className="post-actions">
      <LikeButton onClick={onLike} likes={post.likes} />
      <CommentButton onClick={onComment} comments={post.comments} />
      {/* Remove ShareButton component */}
    </div>
  );
};
```

**REFACTOR: Clean up unused imports and handlers**
```typescript
// Clean up interfaces
interface PostActionsProps {
  post: AgentPost;
  onLike: () => void;
  onComment: () => void;
  // Remove onShare: () => void;
}

// Remove sharing-related state and effects
const PostActions: React.FC<PostActionsProps> = ({ post, onLike, onComment }) => {
  // Remove sharing state
  // const [shareCount, setShareCount] = useState(post.shares || 0);
  
  return (
    <div className="flex items-center space-x-6">
      <ActionButton
        icon={Heart}
        label={`${post.likes || 0} Likes`}
        onClick={onLike}
        variant="like"
      />
      <ActionButton
        icon={MessageCircle}
        label={`${post.comments || 0} Comments`}
        onClick={onComment}
        variant="comment"
      />
    </div>
  );
};
```

### 3.2 Post Hierarchy Implementation

#### TDD for Component Structure

**RED: Test proper hierarchy rendering**
```typescript
describe('Post Hierarchy', () => {
  it('should render title as h3 with proper styling', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveTextContent(mockPost.title);
    expect(title).toHaveClass('text-lg', 'font-semibold');
  });
  
  it('should display hook prominently when present', () => {
    const postWithHook = { ...mockPost, metadata: { ...mockPost.metadata, hook: 'Test hook' } };
    render(<EnhancedPostCard post={postWithHook} />);
    
    const hook = screen.getByTestId('post-hook');
    expect(hook).toHaveTextContent('Test hook');
    expect(hook).toHaveClass('post-hook-highlight');
  });
});
```

**GREEN: Implement basic hierarchy**
```typescript
const PostContent: React.FC<PostContentProps> = ({ post, isExpanded, onToggle }) => {
  return (
    <div className="post-content">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {post.title}
      </h3>
      
      {post.metadata.hook && (
        <div className="post-hook-highlight mb-3" data-testid="post-hook">
          {post.metadata.hook}
        </div>
      )}
      
      <div className="post-body">
        {isExpanded ? post.content : truncateContent(post.content)}
        {post.content.length > TRUNCATE_LIMIT && (
          <button onClick={onToggle}>
            {isExpanded ? 'Read less' : 'Read more'}
          </button>
        )}
      </div>
    </div>
  );
};
```

**REFACTOR: Enhance styling and accessibility**
```typescript
const PostContent: React.FC<PostContentProps> = ({ post, isExpanded, onToggle }) => {
  const contentId = `post-content-${post.id}`;
  const shouldTruncate = post.content.length > TRUNCATE_LIMIT;
  
  return (
    <div className="post-content" data-testid="post-content">
      <header className="post-header">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
          {post.title}
        </h3>
        
        {post.metadata.hook && (
          <div 
            className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r mb-3"
            data-testid="post-hook"
          >
            <p className="text-blue-700 font-medium text-sm">
              {post.metadata.hook}
            </p>
          </div>
        )}
      </header>
      
      <main className="post-body">
        <div 
          id={contentId}
          className="text-gray-700 whitespace-pre-wrap"
        >
          {isExpanded ? post.content : truncateContent(post.content)}
        </div>
        
        {shouldTruncate && (
          <ExpansionToggle
            isExpanded={isExpanded}
            onToggle={onToggle}
            contentId={contentId}
          />
        )}
      </main>
    </div>
  );
};
```

## 4. Integration Testing TDD

### 4.1 Component Integration Tests

#### Test Component Interaction

**RED: Test multi-component behavior**
```typescript
describe('Post Feed Integration', () => {
  it('should maintain expansion state across components', async () => {
    const posts = [mockLongContentPost, mockAgentPost];
    render(
      <PostExpansionProvider>
        <SocialMediaFeed posts={posts} />
      </PostExpansionProvider>
    );
    
    // Expand first post
    const expandButton = screen.getAllByRole('button', { name: /read more/i })[0];
    await userEvent.click(expandButton);
    
    // Verify expansion state is maintained
    expect(screen.getByText(mockLongContentPost.content)).toBeInTheDocument();
    
    // Scroll and verify state persistence
    fireEvent.scroll(window, { target: { scrollY: 500 } });
    
    expect(screen.getByText(mockLongContentPost.content)).toBeInTheDocument();
  });
});
```

**GREEN: Implement state management**
```typescript
const PostExpansionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  
  const togglePost = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);
  
  const contextValue = useMemo(() => ({
    expandedPosts,
    togglePost,
    isExpanded: (postId: string) => expandedPosts.has(postId)
  }), [expandedPosts, togglePost]);
  
  return (
    <PostExpansionContext.Provider value={contextValue}>
      {children}
    </PostExpansionContext.Provider>
  );
};
```

**REFACTOR: Add persistence and optimization**
```typescript
const PostExpansionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(() => {
    // Restore from localStorage
    const saved = localStorage.getItem('expanded-posts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('expanded-posts', JSON.stringify([...expandedPosts]));
  }, [expandedPosts]);
  
  const togglePost = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
        
        // Limit expanded posts to prevent memory issues
        if (newSet.size > MAX_EXPANDED_POSTS) {
          const oldest = newSet.values().next().value;
          newSet.delete(oldest);
        }
      }
      return newSet;
    });
  }, []);
  
  const contextValue = useMemo(() => ({
    expandedPosts,
    togglePost,
    isExpanded: (postId: string) => expandedPosts.has(postId),
    expandPost: (postId: string) => {
      if (!expandedPosts.has(postId)) {
        togglePost(postId);
      }
    },
    collapsePost: (postId: string) => {
      if (expandedPosts.has(postId)) {
        togglePost(postId);
      }
    }
  }), [expandedPosts, togglePost]);
  
  return (
    <PostExpansionContext.Provider value={contextValue}>
      {children}
    </PostExpansionContext.Provider>
  );
};
```

## 5. Performance-Driven TDD

### 5.1 Optimization Testing

#### Performance Benchmarks

**RED: Write performance tests**
```typescript
describe('Performance Requirements', () => {
  it('should expand post within 100ms', async () => {
    const startTime = performance.now();
    
    render(<EnhancedPostCard post={mockLongContentPost} />);
    const expandButton = screen.getByRole('button', { name: /read more/i });
    
    await userEvent.click(expandButton);
    
    await waitFor(() => {
      expect(screen.getByText(mockLongContentPost.content)).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100);
  });
  
  it('should not cause memory leaks with rapid expansion', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    const { unmount } = render(<EnhancedPostCard post={mockLongContentPost} />);
    
    // Simulate rapid expansion/collapse
    for (let i = 0; i < 100; i++) {
      const expandButton = screen.getByRole('button', { name: /read more/i });
      await userEvent.click(expandButton);
      
      const collapseButton = screen.getByRole('button', { name: /read less/i });
      await userEvent.click(collapseButton);
    }
    
    unmount();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
  });
});
```

**GREEN: Basic optimization**
```typescript
const EnhancedPostCard = React.memo<PostCardProps>(({ post, ...props }) => {
  // Implementation
}, (prevProps, nextProps) => {
  // Shallow comparison for performance
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.comments === nextProps.post.comments
  );
});
```

**REFACTOR: Advanced optimization**
```typescript
const EnhancedPostCard = React.memo<PostCardProps>(({ post, ...props }) => {
  const { isExpanded, togglePost } = usePostExpansion();
  
  // Memoize expensive computations
  const { displayContent, shouldTruncate } = useMemo(() => {
    const shouldTruncate = post.content.length > CONTENT_TRUNCATE_LIMIT;
    const displayContent = shouldTruncate && !isExpanded 
      ? truncateContent(post.content, CONTENT_TRUNCATE_LIMIT)
      : post.content;
    
    return { displayContent, shouldTruncate };
  }, [post.content, isExpanded]);
  
  // Debounce rapid toggles
  const debouncedToggle = useMemo(
    () => debounce(() => togglePost(post.id), 100),
    [post.id, togglePost]
  );
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedToggle.cancel();
    };
  }, [debouncedToggle]);
  
  return (
    <article className="enhanced-post-card">
      {/* Optimized rendering */}
    </article>
  );
}, arePostsEqual);

function arePostsEqual(prevProps: PostCardProps, nextProps: PostCardProps) {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.comments === nextProps.post.comments &&
    prevProps.post.publishedAt === nextProps.post.publishedAt
  );
}
```

## 6. Error Handling TDD

### 6.1 Resilient Component Design

#### Error Scenario Testing

**RED: Test error conditions**
```typescript
describe('Error Handling', () => {
  it('should handle animation failures gracefully', async () => {
    // Mock animation failure
    const animateExpand = jest.fn().mockRejectedValue(new Error('Animation failed'));
    
    render(<EnhancedPostCard post={mockLongContentPost} />);
    
    const expandButton = screen.getByRole('button', { name: /read more/i });
    await userEvent.click(expandButton);
    
    // Should show error message
    expect(screen.getByText(/unable to expand post/i)).toBeInTheDocument();
    
    // Should reset to collapsed state
    expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
  });
});
```

**GREEN: Basic error handling**
```typescript
const PostContent: React.FC<PostContentProps> = ({ post, isExpanded, onToggle }) => {
  const [error, setError] = useState<string | null>(null);
  
  const handleToggle = async () => {
    try {
      setError(null);
      await onToggle();
    } catch (err) {
      setError('Unable to expand post. Please try again.');
    }
  };
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  return (
    // Component JSX
  );
};
```

**REFACTOR: Comprehensive error handling**
```typescript
const PostContent: React.FC<PostContentProps> = ({ post, isExpanded, onToggle }) => {
  const [error, setError] = useState<PostError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const handleToggle = useCallback(async () => {
    try {
      setError(null);
      await onToggle();
      setRetryCount(0); // Reset on success
    } catch (err) {
      const postError = createPostError(err, 'EXPANSION_FAILED');
      setError(postError);
      
      // Track error for monitoring
      trackError('post_expansion_error', {
        postId: post.id,
        error: postError.message,
        retryCount
      });
    }
  }, [onToggle, post.id, retryCount]);
  
  const handleRetry = useCallback(() => {
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      setRetryCount(prev => prev + 1);
      handleToggle();
    }
  }, [retryCount, handleToggle]);
  
  if (error) {
    return (
      <ErrorBoundary
        error={error}
        onRetry={handleRetry}
        canRetry={retryCount < MAX_RETRY_ATTEMPTS}
      />
    );
  }
  
  return (
    <div className="post-content">
      {/* Component content */}
    </div>
  );
};
```

## 7. Accessibility TDD

### 7.1 A11y-First Development

#### Accessibility Testing

**RED: Test accessibility requirements**
```typescript
describe('Accessibility', () => {
  it('should have proper ARIA attributes', () => {
    render(<EnhancedPostCard post={mockLongContentPost} />);
    
    const expandButton = screen.getByRole('button', { name: /read more/i });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(expandButton).toHaveAttribute('aria-controls', expect.stringMatching(/post-content-/));
  });
  
  it('should announce state changes', async () => {
    render(<EnhancedPostCard post={mockLongContentPost} />);
    
    const expandButton = screen.getByRole('button', { name: /read more/i });
    await userEvent.click(expandButton);
    
    const announcement = screen.getByRole('status');
    expect(announcement).toHaveTextContent('Post expanded');
  });
});
```

**GREEN: Basic accessibility**
```typescript
const ExpansionToggle: React.FC<ExpansionToggleProps> = ({ isExpanded, onToggle, contentId }) => {
  return (
    <button
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={contentId}
      className="expansion-toggle"
    >
      {isExpanded ? 'Read less' : 'Read more'}
    </button>
  );
};
```

**REFACTOR: Enhanced accessibility**
```typescript
const ExpansionToggle: React.FC<ExpansionToggleProps> = ({ 
  isExpanded, 
  onToggle, 
  contentId,
  announceChange 
}) => {
  const handleClick = useCallback(async () => {
    await onToggle();
    
    // Announce change to screen readers
    const message = isExpanded ? 'Post collapsed' : 'Post expanded';
    announceToScreenReader(message);
    
    if (announceChange) {
      announceChange(message);
    }
  }, [onToggle, isExpanded, announceChange]);
  
  return (
    <button
      onClick={handleClick}
      aria-expanded={isExpanded}
      aria-controls={contentId}
      aria-describedby={`${contentId}-description`}
      className="expansion-toggle focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <span className="flex items-center space-x-1">
        <span>{isExpanded ? 'Read less' : 'Read more'}</span>
        <ChevronDown 
          className={cn(
            'w-4 h-4 transition-transform',
            isExpanded && 'transform rotate-180'
          )}
          aria-hidden="true"
        />
      </span>
    </button>
  );
};
```

## 8. Continuous Integration TDD

### 8.1 Automated Testing Pipeline

#### CI/CD Integration Tests

```yaml
# .github/workflows/sparc-phase1-tests.yml
name: SPARC Phase 1 TDD Pipeline

on: [push, pull_request]

jobs:
  tdd-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

This comprehensive TDD refinement strategy ensures that all Phase 1 features are implemented with high quality, maintainability, and reliability while following strict test-driven development principles.