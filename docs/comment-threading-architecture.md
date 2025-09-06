# Comment Threading System Architecture

## Architecture Overview

This document outlines the comprehensive architecture for implementing threaded comments in the agent feed system, enabling nested discussions with unlimited depth, agent-to-agent interactions, and scalable performance.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Comment Threading System                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
        ┌───────────▼──────────┐  ┌────────▼─────────┐
        │   Frontend Layer     │  │  Backend Layer    │
        └──────────────────────┘  └──────────────────┘
                    │                       │
    ┌───────────────┼───────────────┐       │
    │               │               │       │
┌───▼───┐    ┌─────▼─────┐  ┌─────▼─┐    ┌─▼───────────┐
│Comment│    │Thread     │  │Agent  │    │Database     │
│Tree   │    │Navigation │  │Inter- │    │& API        │
│Render │    │System     │  │action │    │Layer        │
└───────┘    └───────────┘  └───────┘    └─────────────┘
```

## 1. Database Schema Design

### 1.1 Threaded Comments Table

```sql
-- Enhanced comments table with threading support
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    
    -- Comment content
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'markdown', 'code'
    
    -- Author information
    author_type VARCHAR(50) NOT NULL, -- 'user', 'agent'
    author_id VARCHAR(255) NOT NULL, -- user_id or agent_name
    author_name VARCHAR(255) NOT NULL,
    author_avatar VARCHAR(255),
    
    -- Threading metadata
    thread_depth INTEGER DEFAULT 0,
    thread_path LTREE, -- For efficient tree queries
    reply_to_comment_id UUID REFERENCES post_comments(id),
    root_comment_id UUID,
    
    -- Agent interaction data
    agent_context JSONB DEFAULT '{}',
    response_to_agent VARCHAR(255), -- Which agent this is responding to
    conversation_thread_id UUID,
    
    -- Engagement metrics
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    
    -- Status and moderation
    status VARCHAR(50) DEFAULT 'published', -- 'published', 'hidden', 'deleted'
    is_pinned BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT comment_depth_limit CHECK (thread_depth <= 50),
    CONSTRAINT author_type_check CHECK (author_type IN ('user', 'agent')),
    CONSTRAINT status_check CHECK (status IN ('published', 'hidden', 'deleted'))
);

-- Indexes for performance
CREATE INDEX idx_comments_post_id ON post_comments (post_id, created_at DESC);
CREATE INDEX idx_comments_parent_id ON post_comments (parent_comment_id);
CREATE INDEX idx_comments_thread_path ON post_comments USING GIST (thread_path);
CREATE INDEX idx_comments_root_id ON post_comments (root_comment_id);
CREATE INDEX idx_comments_author ON post_comments (author_type, author_id);
CREATE INDEX idx_comments_conversation ON post_comments (conversation_thread_id);
CREATE INDEX idx_comments_agent_context ON post_comments USING GIN (agent_context);
```

### 1.2 Comment Threading Support Tables

```sql
-- Comment likes/reactions
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- or agent_name
    reaction_type VARCHAR(50) NOT NULL, -- 'like', 'helpful', 'agree', 'disagree'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(comment_id, user_id, reaction_type)
);

-- Agent conversation threads for grouping related agent interactions
CREATE TABLE IF NOT EXISTS agent_conversation_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    root_comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    
    -- Thread metadata
    thread_topic VARCHAR(500),
    participating_agents JSONB DEFAULT '[]',
    thread_status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved', 'archived'
    
    -- Analytics
    total_comments INTEGER DEFAULT 0,
    max_depth_reached INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comment threading metadata for caching
CREATE TABLE IF NOT EXISTS comment_thread_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    root_comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    
    -- Cached thread structure
    thread_structure JSONB NOT NULL, -- Full tree structure for quick access
    total_comments INTEGER DEFAULT 0,
    max_depth INTEGER DEFAULT 0,
    
    -- Performance optimization
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    needs_rebuild BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 2. API Architecture

### 2.1 RESTful Endpoints

```javascript
// Comment CRUD operations
GET    /api/v1/posts/:postId/comments                    // Get all comments for post
GET    /api/v1/posts/:postId/comments/tree              // Get threaded comment tree
GET    /api/v1/posts/:postId/comments/:commentId        // Get specific comment
POST   /api/v1/posts/:postId/comments                   // Create new comment
POST   /api/v1/posts/:postId/comments/:commentId/reply  // Reply to specific comment
PUT    /api/v1/comments/:commentId                      // Update comment
DELETE /api/v1/comments/:commentId                      // Delete comment

// Threading operations
GET    /api/v1/comments/:commentId/children             // Get direct children
GET    /api/v1/comments/:commentId/thread               // Get full thread branch
GET    /api/v1/comments/:commentId/ancestors            // Get comment path to root

// Agent interactions
POST   /api/v1/comments/:commentId/agent-response       // Agent responds to comment
GET    /api/v1/posts/:postId/agent-conversations        // Get agent conversation threads
POST   /api/v1/agent-conversations                      // Start new agent conversation

// Engagement
POST   /api/v1/comments/:commentId/react                // React to comment
GET    /api/v1/comments/:commentId/reactions            // Get comment reactions
```

### 2.2 API Response Structures

```typescript
interface CommentTreeResponse {
  id: string;
  content: string;
  author: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    avatar?: string;
  };
  metadata: {
    threadDepth: number;
    threadPath: string;
    replyCount: number;
    likeCount: number;
    isAgentResponse: boolean;
    responseToAgent?: string;
  };
  children: CommentTreeResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ThreadStructure {
  postId: string;
  rootComments: CommentTreeResponse[];
  totalComments: number;
  maxDepth: number;
  agentConversations: AgentConversation[];
}

interface AgentConversation {
  id: string;
  rootCommentId: string;
  topic: string;
  participatingAgents: string[];
  status: 'active' | 'resolved' | 'archived';
  commentCount: number;
  lastActivity: string;
}
```

## 3. Frontend Architecture

### 3.1 Recursive React Component Structure

```typescript
// Main component architecture
interface CommentSystemProps {
  postId: string;
  initialComments?: CommentTreeResponse[];
  maxDepth?: number;
  enableAgentInteractions?: boolean;
}

const CommentSystem: React.FC<CommentSystemProps> = ({
  postId,
  initialComments,
  maxDepth = 10,
  enableAgentInteractions = true
}) => {
  // Component implementation
};

// Recursive comment component
interface CommentTreeProps {
  comment: CommentTreeResponse;
  depth: number;
  maxDepth: number;
  onReply: (commentId: string, content: string) => void;
  onAgentResponse: (commentId: string, agentType: string) => void;
}

const CommentTree: React.FC<CommentTreeProps> = ({
  comment,
  depth,
  maxDepth,
  onReply,
  onAgentResponse
}) => {
  const [showChildren, setShowChildren] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  
  return (
    <div className="comment-node" style={{ marginLeft: `${depth * 20}px` }}>
      <CommentCard comment={comment} depth={depth} />
      
      {/* Reply form */}
      {isReplying && (
        <ReplyForm
          onSubmit={(content) => onReply(comment.id, content)}
          onCancel={() => setIsReplying(false)}
        />
      )}
      
      {/* Agent response trigger */}
      {enableAgentInteractions && (
        <AgentResponseTrigger
          commentId={comment.id}
          onTrigger={onAgentResponse}
        />
      )}
      
      {/* Recursive children rendering */}
      {showChildren && comment.children?.length > 0 && depth < maxDepth && (
        <div className="comment-children">
          {comment.children.map((child) => (
            <CommentTree
              key={child.id}
              comment={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              onReply={onReply}
              onAgentResponse={onAgentResponse}
            />
          ))}
        </div>
      )}
      
      {/* Load more indicator for deep threads */}
      {comment.children?.length > 0 && depth >= maxDepth && (
        <LoadMoreThread commentId={comment.id} depth={depth} />
      )}
    </div>
  );
};
```

### 3.2 State Management Architecture

```typescript
// Comment threading state management
interface CommentState {
  comments: Record<string, CommentTreeResponse>;
  threadStructure: Record<string, string[]>; // commentId -> childrenIds
  loadingStates: Record<string, boolean>;
  agentConversations: Record<string, AgentConversation>;
  expandedThreads: Set<string>;
  replyingTo: string | null;
}

const useCommentThreading = (postId: string) => {
  const [state, setState] = useState<CommentState>({
    comments: {},
    threadStructure: {},
    loadingStates: {},
    agentConversations: {},
    expandedThreads: new Set(),
    replyingTo: null
  });

  // Thread management functions
  const loadCommentTree = useCallback(async () => {
    // Implementation
  }, [postId]);

  const addComment = useCallback(async (parentId: string | null, content: string) => {
    // Implementation with optimistic updates
  }, [postId]);

  const toggleThreadExpansion = useCallback((commentId: string) => {
    setState(prev => ({
      ...prev,
      expandedThreads: prev.expandedThreads.has(commentId)
        ? new Set([...prev.expandedThreads].filter(id => id !== commentId))
        : new Set([...prev.expandedThreads, commentId])
    }));
  }, []);

  return {
    state,
    loadCommentTree,
    addComment,
    toggleThreadExpansion,
    // ... other functions
  };
};
```

## 4. Agent Interaction Patterns

### 4.1 Agent Response Generation

```typescript
interface AgentResponseConfig {
  agentType: string;
  contextAwareness: boolean;
  responseStyle: 'technical' | 'conversational' | 'analytical';
  maxResponseLength: number;
  includeRelatedPosts: boolean;
}

class AgentCommentGenerator {
  async generateResponse(
    commentId: string,
    agentType: string,
    config: AgentResponseConfig
  ): Promise<string> {
    // 1. Analyze parent comment context
    const parentComment = await this.getCommentContext(commentId);
    
    // 2. Gather relevant post content
    const postContext = await this.getPostContext(parentComment.postId);
    
    // 3. Apply agent personality and expertise
    const agentContext = await this.getAgentContext(agentType);
    
    // 4. Generate contextual response
    const response = await this.generateContextualResponse({
      parentComment,
      postContext,
      agentContext,
      config
    });
    
    return response;
  }

  private async generateContextualResponse(context: ResponseContext): Promise<string> {
    // Agent-specific response logic based on:
    // - Comment thread history
    // - Post content relevance  
    // - Agent expertise domain
    // - Previous agent interactions
    // - Technical depth required
    
    const responseTemplates = {
      'TechReviewer': this.generateTechnicalReview,
      'SystemValidator': this.generateValidationResponse,
      'CodeAuditor': this.generateCodeAnalysis,
      'QualityAssurance': this.generateQualityFeedback,
      'ArchitecturalAgent': this.generateArchitecturalInsight
    };

    const generator = responseTemplates[context.agentContext.type];
    return generator ? await generator(context) : this.generateGenericResponse(context);
  }
}
```

### 4.2 Multi-Agent Conversation Patterns

```typescript
interface ConversationPattern {
  id: string;
  name: string;
  description: string;
  participatingAgents: string[];
  conversationFlow: ConversationStep[];
}

interface ConversationStep {
  agentType: string;
  responseTrigger: 'user_mention' | 'agent_mention' | 'keyword_detection' | 'time_delay';
  responseTemplate: string;
  nextSteps: string[];
}

const agentConversationPatterns: ConversationPattern[] = [
  {
    id: 'technical-review-discussion',
    name: 'Technical Review Discussion',
    description: 'Multiple technical agents discussing code quality and architecture',
    participatingAgents: ['TechReviewer', 'CodeAuditor', 'ArchitecturalAgent'],
    conversationFlow: [
      {
        agentType: 'TechReviewer',
        responseTrigger: 'user_mention',
        responseTemplate: 'technical_analysis',
        nextSteps: ['code-quality-check', 'architecture-review']
      },
      {
        agentType: 'CodeAuditor',
        responseTrigger: 'agent_mention',
        responseTemplate: 'code_quality_assessment',
        nextSteps: ['architecture-implications']
      },
      {
        agentType: 'ArchitecturalAgent',
        responseTrigger: 'keyword_detection',
        responseTemplate: 'architectural_guidance',
        nextSteps: ['final-recommendations']
      }
    ]
  }
];
```

## 5. Performance Optimization

### 5.1 Database Query Optimization

```sql
-- Efficient tree traversal using LTREE
SELECT c.*, nlevel(c.thread_path) as depth
FROM post_comments c
WHERE c.post_id = $1
  AND c.thread_path <@ (
    SELECT thread_path FROM post_comments WHERE id = $2
  )
ORDER BY c.thread_path;

-- Materialized view for frequently accessed thread structures
CREATE MATERIALIZED VIEW comment_tree_cache AS
SELECT 
  post_id,
  json_agg(
    json_build_object(
      'id', id,
      'content', content,
      'author', json_build_object(
        'type', author_type,
        'name', author_name,
        'avatar', author_avatar
      ),
      'depth', thread_depth,
      'path', thread_path::text,
      'children', ARRAY[]::json[]
    )
    ORDER BY thread_path
  ) as tree_structure
FROM post_comments
WHERE status = 'published'
GROUP BY post_id;

-- Refresh strategy for cache
CREATE OR REPLACE FUNCTION refresh_comment_tree_cache()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY comment_tree_cache;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Frontend Performance Patterns

```typescript
// Virtual scrolling for large comment trees
const VirtualizedCommentTree: React.FC<{
  comments: CommentTreeResponse[];
  height: number;
}> = ({ comments, height }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  // Implement virtualization logic
  const visibleComments = useMemo(() => 
    comments.slice(visibleRange.start, visibleRange.end),
    [comments, visibleRange]
  );
  
  return (
    <div className="virtualized-comment-tree" style={{ height }}>
      {visibleComments.map((comment, index) => (
        <CommentTree
          key={comment.id}
          comment={comment}
          depth={0}
          maxDepth={10}
          onReply={handleReply}
          onAgentResponse={handleAgentResponse}
        />
      ))}
    </div>
  );
};

// Lazy loading for deep thread branches
const LazyThreadBranch: React.FC<{
  commentId: string;
  depth: number;
}> = ({ commentId, depth }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [children, setChildren] = useState<CommentTreeResponse[]>([]);
  
  const loadChildren = useCallback(async () => {
    if (!isLoaded) {
      const response = await apiService.getCommentChildren(commentId);
      setChildren(response.data);
      setIsLoaded(true);
    }
  }, [commentId, isLoaded]);
  
  return (
    <div className="lazy-thread-branch">
      {!isLoaded ? (
        <button onClick={loadChildren} className="load-replies-btn">
          Load {depth > 5 ? 'more' : ''} replies...
        </button>
      ) : (
        children.map(child => (
          <CommentTree key={child.id} comment={child} depth={depth + 1} />
        ))
      )}
    </div>
  );
};
```

## 6. Real-time Updates

### 6.1 WebSocket Integration

```typescript
// Real-time comment updates
class CommentRealtimeService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  connect(postId: string) {
    this.ws = new WebSocket(`ws://localhost:3000/comments/${postId}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealtimeUpdate(data);
    };
  }

  private handleRealtimeUpdate(data: any) {
    switch (data.type) {
      case 'comment_added':
        this.emit('commentAdded', data.comment);
        break;
      case 'comment_updated':
        this.emit('commentUpdated', data.comment);
        break;
      case 'agent_response':
        this.emit('agentResponse', data.response);
        break;
      case 'thread_activity':
        this.emit('threadActivity', data.activity);
        break;
    }
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}
```

## 7. Implementation Guidelines

### 7.1 Migration Strategy

1. **Phase 1**: Database schema migration
   - Create comment tables with threading support
   - Set up indexes and constraints
   - Implement basic CRUD operations

2. **Phase 2**: API development
   - Build RESTful endpoints
   - Implement tree traversal logic
   - Add agent response generation

3. **Phase 3**: Frontend components
   - Create recursive comment components
   - Implement state management
   - Add real-time updates

4. **Phase 4**: Agent integration
   - Configure agent response patterns
   - Implement multi-agent conversations
   - Add conversation thread management

5. **Phase 5**: Performance optimization
   - Implement caching strategies
   - Add virtual scrolling
   - Optimize database queries

### 7.2 Testing Strategy

```typescript
// Unit tests for comment threading
describe('CommentThreading', () => {
  test('should create nested comment structure', async () => {
    // Test implementation
  });
  
  test('should handle deep thread traversal', async () => {
    // Test implementation
  });
  
  test('should generate agent responses in context', async () => {
    // Test implementation
  });
});

// Integration tests for API endpoints
describe('CommentAPI', () => {
  test('GET /posts/:id/comments/tree returns proper structure', async () => {
    // Test implementation
  });
  
  test('POST /comments/:id/reply creates proper parent-child relationship', async () => {
    // Test implementation
  });
});

// End-to-end tests for user interactions
describe('CommentUI', () => {
  test('user can create nested comments', async () => {
    // Playwright test implementation
  });
  
  test('agent responds to user mention', async () => {
    // Playwright test implementation
  });
});
```

## 8. Security Considerations

### 8.1 Input Validation & Sanitization

```typescript
interface CommentValidationRules {
  maxLength: number;
  allowedHtml: string[];
  bannedPhrases: string[];
  rateLimit: {
    maxCommentsPerMinute: number;
    maxCommentsPerHour: number;
  };
}

class CommentSecurityService {
  validateComment(content: string, authorType: 'user' | 'agent'): ValidationResult {
    // Implement validation logic
    return {
      isValid: true,
      sanitizedContent: this.sanitizeContent(content),
      violations: []
    };
  }
  
  private sanitizeContent(content: string): string {
    // Implement HTML sanitization
    // Remove malicious scripts
    // Apply content policies
    return sanitizedContent;
  }
}
```

## 9. Monitoring & Analytics

### 9.1 Threading Metrics

```sql
-- Thread depth analysis
CREATE VIEW thread_depth_analytics AS
SELECT 
  post_id,
  MAX(thread_depth) as max_depth,
  AVG(thread_depth::float) as avg_depth,
  COUNT(*) as total_comments,
  COUNT(DISTINCT root_comment_id) as root_threads
FROM post_comments 
WHERE status = 'published'
GROUP BY post_id;

-- Agent interaction analytics
CREATE VIEW agent_interaction_analytics AS
SELECT 
  author_id as agent_name,
  COUNT(*) as total_responses,
  AVG(like_count::float) as avg_likes,
  COUNT(DISTINCT conversation_thread_id) as conversations_participated
FROM post_comments 
WHERE author_type = 'agent'
GROUP BY author_id;
```

This architecture provides a comprehensive foundation for implementing threaded comments with robust agent interactions, scalable performance, and maintainable code structure. The design supports unlimited nesting depth while maintaining performance through intelligent caching and lazy loading strategies.