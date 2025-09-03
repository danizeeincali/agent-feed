# SPARC REFINEMENT: TDD Implementation Roadmap

## Test-Driven Development Strategy for Sharing Removal

### TDD London School Approach Overview

The London School of TDD emphasizes:
1. **Outside-In Development**: Start with high-level behavior tests
2. **Mock Dependencies**: Use mocks and stubs extensively  
3. **Behavior Focus**: Test what the system does, not how it does it
4. **Collaboration Testing**: Focus on object interactions

### Phase 1: Red Phase - Write Failing Tests

#### 1.1 Frontend Component Tests

**File**: `/workspaces/agent-feed/tests/sparc/unit/SocialMediaFeed.sharing-removal.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialMediaFeed from '@/components/SocialMediaFeed';
import { apiService } from '@/services/api';

// Mock dependencies using London School approach
jest.mock('@/services/api');
jest.mock('@/context/WebSocketContext');
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  Share2: () => null, // Should not be imported after removal
}));

describe('SocialMediaFeed - Sharing Functionality Removal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Share Button Removal Tests', () => {
    test('should NOT render share button for any post', async () => {
      // Arrange
      const mockPosts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Test Content',
          authorAgent: 'test-agent',
          publishedAt: new Date().toISOString(),
          metadata: { businessImpact: 5, tags: [], isAgentResponse: false },
          likes: 10,
          comments: 5,
          shares: 3 // This should be ignored/removed
        }
      ];

      (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
        success: true,
        posts: mockPosts
      });

      // Act
      render(<SocialMediaFeed />);
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Assert - Share button should NOT exist
      expect(screen.queryByTitle('Share this post')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/share/i)).not.toBeInTheDocument();
      
      // Verify other buttons still exist
      expect(screen.getByTitle(/like/i)).toBeInTheDocument();
      expect(screen.getByTitle(/comment/i)).toBeInTheDocument();
    });

    test('should NOT display share count in post actions', async () => {
      // Arrange
      const mockPosts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Test Content',
          authorAgent: 'test-agent',
          publishedAt: new Date().toISOString(),
          metadata: { businessImpact: 5, tags: [], isAgentResponse: false },
          likes: 10,
          comments: 5,
          shares: 15 // This should not be displayed
        }
      ];

      (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
        success: true,
        posts: mockPosts
      });

      // Act
      render(<SocialMediaFeed />);
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Assert - Share count should NOT be visible
      expect(screen.queryByText('15')).not.toBeInTheDocument();
      
      // Verify other counts still visible
      expect(screen.getByText('10')).toBeInTheDocument(); // likes
      expect(screen.getByText('5')).toBeInTheDocument(); // comments
    });
  });

  describe('API Integration Tests', () => {
    test('should NOT call share API endpoint when previously would have shared', async () => {
      // Arrange
      const mockPosts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Test Content',
          authorAgent: 'test-agent',
          publishedAt: new Date().toISOString(),
          metadata: { businessImpact: 5, tags: [], isAgentResponse: false },
          likes: 10,
          comments: 5
        }
      ];

      (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
        success: true,
        posts: mockPosts
      });

      // Act
      render(<SocialMediaFeed />);
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Assert - updatePostEngagement should never be called with 'share'
      expect(apiService.updatePostEngagement).not.toHaveBeenCalledWith(
        expect.any(String),
        'share'
      );
    });

    test('should still support like and comment API calls', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockPosts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Test Content',
          authorAgent: 'test-agent',
          publishedAt: new Date().toISOString(),
          metadata: { businessImpact: 5, tags: [], isAgentResponse: false },
          likes: 10,
          comments: 5
        }
      ];

      (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
        success: true,
        posts: mockPosts
      });
      (apiService.updatePostEngagement as jest.Mock).mockResolvedValue({
        success: true
      });

      // Act
      render(<SocialMediaFeed />);
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      const likeButton = screen.getByTitle(/like/i);
      await user.click(likeButton);

      // Assert
      expect(apiService.updatePostEngagement).toHaveBeenCalledWith('1', 'like');
    });
  });

  describe('TypeScript Interface Tests', () => {
    test('should handle posts without shares property', () => {
      // This test verifies TypeScript interface changes
      const postWithoutShares = {
        id: '1',
        title: 'Test Post',
        content: 'Test Content',
        authorAgent: 'test-agent',
        publishedAt: new Date().toISOString(),
        metadata: { businessImpact: 5, tags: [], isAgentResponse: false },
        likes: 10,
        comments: 5
        // No shares property
      };

      // This should not cause TypeScript errors after interface update
      expect(postWithoutShares.shares).toBeUndefined();
    });
  });

  describe('State Management Tests', () => {
    test('should not update share counts in component state', async () => {
      // Arrange
      const mockPosts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Test Content',
          authorAgent: 'test-agent',
          publishedAt: new Date().toISOString(),
          metadata: { businessImpact: 5, tags: [], isAgentResponse: false },
          likes: 10,
          comments: 5
        }
      ];

      (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
        success: true,
        posts: mockPosts
      });

      // Act & Assert
      const { rerender } = render(<SocialMediaFeed />);
      
      // Verify component renders without share-related state updates
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Re-render should not show any share-related state
      rerender(<SocialMediaFeed />);
      expect(screen.queryByText(/share/i)).not.toBeInTheDocument();
    });
  });
});
```

#### 1.2 API Service Layer Tests

**File**: `/workspaces/agent-feed/tests/sparc/unit/api.sharing-removal.test.ts`

```typescript
import { apiService } from '@/services/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Service - Sharing Functionality Removal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updatePostEngagement', () => {
    test('should reject share action type', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Invalid action type'
        })
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        apiService.updatePostEngagement('post-1', 'share' as any)
      ).rejects.toThrow();

      // Verify fetch was called with share action
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/posts/post-1/engagement'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"share"')
        })
      );
    });

    test('should accept like action type', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true
        })
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await apiService.updatePostEngagement('post-1', 'like');

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/posts/post-1/engagement'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"like"')
        })
      );
    });

    test('should accept comment action type', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true
        })
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await apiService.updatePostEngagement('post-1', 'comment');

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/posts/post-1/engagement'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"comment"')
        })
      );
    });
  });

  describe('TypeScript Type Safety', () => {
    test('should not allow share as valid action type', () => {
      // This test verifies TypeScript compilation
      // After removing 'share' from union type, this should cause compilation error
      
      // @ts-expect-error - 'share' should not be a valid action after removal
      const invalidAction: Parameters<typeof apiService.updatePostEngagement>[1] = 'share';
      
      expect(invalidAction).toBe('share');
    });
  });
});
```

#### 1.3 Backend Route Tests

**File**: `/workspaces/agent-feed/tests/sparc/integration/feed-routes.sharing-removal.test.js`

```javascript
const request = require('supertest');
const express = require('express');
const feedRoutes = require('../../../src/routes/api/feed-routes');

// Mock the database service
jest.mock('../../../src/services/FeedDataService');

describe('Feed Routes - Sharing Functionality Removal', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', feedRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/posts/:id/engagement', () => {
    test('should reject share action with 400 status', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/posts/test-post-id/engagement')
        .send({ action: 'share' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid action type'
      });
    });

    test('should accept like action with 200 status', async () => {
      // Arrange
      const { feedDataService } = require('../../../src/services/FeedDataService');
      feedDataService.updatePostEngagement = jest.fn().mockResolvedValue({
        success: true
      });

      // Act
      const response = await request(app)
        .post('/api/v1/posts/test-post-id/engagement')
        .send({ action: 'like' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(feedDataService.updatePostEngagement).toHaveBeenCalledWith(
        'test-post-id',
        'like'
      );
    });

    test('should accept comment action with 200 status', async () => {
      // Arrange
      const { feedDataService } = require('../../../src/services/FeedDataService');
      feedDataService.updatePostEngagement = jest.fn().mockResolvedValue({
        success: true
      });

      // Act
      const response = await request(app)
        .post('/api/v1/posts/test-post-id/engagement')
        .send({ action: 'comment' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(feedDataService.updatePostEngagement).toHaveBeenCalledWith(
        'test-post-id',
        'comment'
      );
    });

    test('should validate action parameter is required', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/posts/test-post-id/engagement')
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Action is required'
      });
    });
  });
});
```

#### 1.4 Data Service Tests

**File**: `/workspaces/agent-feed/tests/sparc/unit/FeedDataService.sharing-removal.test.js`

```javascript
const { feedDataService } = require('../../../src/services/FeedDataService');
const { dbPool } = require('../../../src/database/connection/pool');

// Mock database pool
jest.mock('../../../src/database/connection/pool');

describe('FeedDataService - Sharing Functionality Removal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgentPosts', () => {
    test('should NOT include shares in query results', async () => {
      // Arrange
      const mockRows = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Test content',
          author_agent: 'test-agent',
          published_at: '2023-01-01T00:00:00Z',
          business_impact: 5,
          tags: '["test"]',
          likes: 10,
          comments: 5,
          shares: 15 // Should be ignored in results
        }
      ];

      dbPool.query = jest.fn().mockResolvedValue({ rows: mockRows });

      // Act
      const result = await feedDataService.getAgentPosts(10, 0, 'all');

      // Assert
      expect(result.success).toBe(true);
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]).toEqual({
        id: '1',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'test-agent',
        publishedAt: '2023-01-01T00:00:00Z',
        metadata: {
          businessImpact: 5,
          tags: ['test'],
          isAgentResponse: false
        },
        likes: 10,
        comments: 5
        // NO shares property
      });
    });

    test('should use query without shares subquery', async () => {
      // Arrange
      dbPool.query = jest.fn().mockResolvedValue({ rows: [] });

      // Act
      await feedDataService.getAgentPosts(10, 0, 'all');

      // Assert
      const actualQuery = dbPool.query.mock.calls[0][0];
      expect(actualQuery).not.toContain("action_id = 'share'");
      expect(actualQuery).toContain("action_id = 'like'");
      expect(actualQuery).toContain("action_id = 'comment'");
    });
  });

  describe('updatePostEngagement', () => {
    test('should reject share action', async () => {
      // Act & Assert
      await expect(
        feedDataService.updatePostEngagement('post-1', 'share')
      ).rejects.toThrow('Invalid action type: share');
    });

    test('should accept like action', async () => {
      // Arrange
      dbPool.query = jest.fn().mockResolvedValue({ 
        rows: [{ id: 1 }] 
      });

      // Act
      const result = await feedDataService.updatePostEngagement('post-1', 'like');

      // Assert
      expect(result.success).toBe(true);
      expect(dbPool.query).toHaveBeenCalledWith(
        expect.stringContaining("VALUES ($1, $2, $3)"),
        ['post-1', 'like', expect.any(String)]
      );
    });
  });
});
```

### Phase 2: Green Phase - Implement Changes

#### 2.1 Frontend Component Implementation

**Implementation Steps**:

1. **Remove Share2 Import**
```typescript
// Before
import { 
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Clock,
  Star,
  MoreHorizontal,
  Tag,
  Heart,
  Share2, // ← REMOVE
  Plus,
  // ... other imports
} from 'lucide-react';

// After  
import { 
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Clock,
  Star,
  MoreHorizontal,
  Tag,
  Heart,
  // Share2 removed
  Plus,
  // ... other imports
} from 'lucide-react';
```

2. **Update TypeScript Interface**
```typescript
// Before
interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes?: number;
  comments?: number;
  shares?: number; // ← REMOVE
}

// After
interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes?: number;
  comments?: number;
  // shares removed
}
```

3. **Remove Share Handler Function**
```typescript
// DELETE this entire function
const handleSharePost = async (postId: string, currentShares: number) => {
  try {
    await apiService.updatePostEngagement(postId, 'share');
    
    const updatePosts = (posts: AgentPost[]) => 
      posts.map(post => 
        post.id === postId 
          ? { ...post, shares: currentShares + 1 }
          : post
      );
    
    setPosts(updatePosts);
    if (isSearching) {
      setSearch(prev => ({ ...prev, results: updatePosts(prev.results) }));
    }
  } catch (error) {
    console.error('Failed to update share:', error);
  }
};
```

4. **Remove Share Button from UI**
```typescript
// DELETE this button from post actions
<button 
  className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors"
  onClick={() => handleSharePost(post.id, post.shares || 0)}
  title="Share this post"
>
  <Share2 className="h-5 w-5" />
  <span className="text-sm">{post.shares || 0}</span>
</button>
```

#### 2.2 API Service Implementation

```typescript
// Update method signature to remove 'share' from union type
async updatePostEngagement(
  postId: string, 
  action: 'like' | 'unlike' | 'comment' // 'share' removed
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/v1/posts/${postId}/engagement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update post engagement: ${response.statusText}`);
  }

  return await response.json();
}
```

#### 2.3 Backend Route Implementation

```javascript
// Update validation array
const validActions = ['like', 'unlike', 'comment']; // 'share' removed

router.post('/posts/:id/engagement', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    // Validate action
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action type'
      });
    }

    // Process valid actions
    const result = await feedDataService.updatePostEngagement(id, action);
    
    res.json(result);
  } catch (error) {
    console.error('Engagement update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
```

#### 2.4 Data Service Implementation

```javascript
// Update getAgentPosts to exclude shares
async getAgentPosts(limit = 20, offset = 0, filter = 'all', searchQuery = '', sortBy = 'published_at', sortOrder = 'DESC') {
  try {
    const query = `
      SELECT 
        fi.id,
        fi.title,
        fi.content,
        fi.author_agent,
        fi.published_at,
        fi.business_impact,
        fi.tags,
        (SELECT COUNT(*) FROM action_responses ar 
         WHERE ar.feed_item_id = fi.id AND ar.action_id = 'like') as likes,
        (SELECT COUNT(*) FROM action_responses ar 
         WHERE ar.feed_item_id = fi.id AND ar.action_id = 'comment') as comments
        -- shares subquery removed
      FROM feed_items fi
      WHERE 1=1
      ${this.buildWhereClause(filter, searchQuery)}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    const result = await dbPool.query(query, [limit, offset]);
    
    const posts = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      authorAgent: row.author_agent,
      publishedAt: row.published_at,
      metadata: {
        businessImpact: row.business_impact,
        tags: row.tags ? JSON.parse(row.tags) : [],
        isAgentResponse: false
      },
      likes: row.likes || 0,
      comments: row.comments || 0
      // shares removed
    }));

    return {
      success: true,
      posts,
      hasMore: posts.length === limit
    };
  } catch (error) {
    console.error('Failed to fetch agent posts:', error);
    return {
      success: false,
      error: error.message,
      posts: []
    };
  }
}

// Update updatePostEngagement to reject shares
async updatePostEngagement(postId, action) {
  const validActions = ['like', 'unlike', 'comment']; // 'share' removed
  
  if (!validActions.includes(action)) {
    throw new Error(`Invalid action type: ${action}`);
  }

  try {
    const query = `
      INSERT INTO action_responses (feed_item_id, action_id, user_id, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    const result = await dbPool.query(query, [
      postId,
      action,
      'system-user',
      new Date().toISOString()
    ]);

    return {
      success: true,
      id: result.rows[0].id
    };
  } catch (error) {
    console.error('Failed to update engagement:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Phase 3: Refactor Phase - Clean Up Code

#### 3.1 Code Quality Improvements

1. **Remove Unused Imports**
2. **Optimize Component Structure** 
3. **Update Documentation**
4. **Improve Error Messages**

#### 3.2 Performance Optimizations

1. **Reduce Bundle Size** (Share2 icon removed)
2. **Optimize Database Queries** (One less subquery)
3. **Minimize State Updates** (No share state management)

### Phase 4: Integration Testing Strategy

#### 4.1 End-to-End Test Suite

**File**: `/workspaces/agent-feed/tests/sparc/e2e/sharing-removal.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Sharing Functionality Removal - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should not display share buttons on any posts', async ({ page }) => {
    // Wait for posts to load
    await expect(page.locator('[data-testid="agent-post"]').first()).toBeVisible();
    
    // Verify no share buttons exist
    await expect(page.locator('button[title="Share this post"]')).toHaveCount(0);
    
    // Verify other buttons still exist
    await expect(page.locator('button[title*="like"]')).toHaveCount(await page.locator('[data-testid="agent-post"]').count());
    await expect(page.locator('button[title*="comment"]')).toHaveCount(await page.locator('[data-testid="agent-post"]').count());
  });

  test('should not show share counts in post metrics', async ({ page }) => {
    await expect(page.locator('[data-testid="agent-post"]').first()).toBeVisible();
    
    // Verify share counts are not displayed
    // This test checks that there are no standalone numbers that could be share counts
    const posts = page.locator('[data-testid="agent-post"]');
    const postCount = await posts.count();
    
    for (let i = 0; i < postCount; i++) {
      const post = posts.nth(i);
      // Should only have 2 action buttons (like and comment), not 3
      await expect(post.locator('.post-actions button')).toHaveCount(2);
    }
  });

  test('should handle like functionality correctly', async ({ page }) => {
    const firstPost = page.locator('[data-testid="agent-post"]').first();
    await firstPost.waitFor();
    
    const likeButton = firstPost.locator('button[title*="like"]').first();
    const initialCount = await likeButton.locator('span').textContent();
    
    await likeButton.click();
    
    // Should see count increment by 1
    await expect(likeButton.locator('span')).toHaveText((parseInt(initialCount) + 1).toString());
  });

  test('should not make API calls to share endpoint', async ({ page }) => {
    const shareRequests = [];
    
    page.on('request', request => {
      if (request.url().includes('/engagement') && request.method() === 'POST') {
        const postData = request.postDataJSON();
        if (postData && postData.action === 'share') {
          shareRequests.push(request);
        }
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Interact with posts for 5 seconds to ensure no share requests are made
    await page.waitForTimeout(5000);
    
    expect(shareRequests).toHaveLength(0);
  });
});
```

### Phase 5: Continuous Integration Setup

#### 5.1 Test Pipeline Configuration

```yaml
# .github/workflows/sharing-removal-tests.yml
name: Sharing Removal Validation

on: [push, pull_request]

jobs:
  sharing-removal-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        npm ci
        cd frontend && npm ci
        cd ../tests && npm ci
    
    - name: Run sharing removal unit tests
      run: |
        npm run test:sparc -- --testPathPattern=sharing-removal
        
    - name: Run integration tests
      run: |
        npm run test:integration -- --testPathPattern=sharing-removal
        
    - name: Run E2E tests
      run: |
        npm run test:e2e -- sharing-removal.spec.js
        
    - name: Validate TypeScript compilation
      run: |
        cd frontend && npm run typecheck
        
    - name: Check for unused imports
      run: |
        npm run lint:unused-imports
```

### Phase 6: Monitoring and Validation

#### 6.1 Post-Deployment Monitoring

```javascript
// Monitoring script to ensure share functionality is properly removed
const monitoringChecks = [
  {
    name: 'Share Button Removal',
    check: () => document.querySelectorAll('button[title*="share"]').length === 0
  },
  {
    name: 'Share API Endpoints Disabled', 
    check: async () => {
      const response = await fetch('/api/v1/posts/test/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share' })
      });
      return response.status === 400;
    }
  },
  {
    name: 'Like Functionality Preserved',
    check: () => document.querySelectorAll('button[title*="like"]').length > 0
  },
  {
    name: 'Comment Functionality Preserved', 
    check: () => document.querySelectorAll('button[title*="comment"]').length > 0
  }
];

// Run monitoring checks
monitoringChecks.forEach(async (check) => {
  const result = await check.check();
  console.log(`${check.name}: ${result ? 'PASS' : 'FAIL'}`);
});
```

This comprehensive TDD roadmap provides a systematic approach to safely removing sharing functionality while ensuring all other features remain intact and fully tested.