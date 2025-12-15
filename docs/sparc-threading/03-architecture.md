# SPARC ARCHITECTURE Phase - Threaded Comment System Design

## 1. DATABASE SCHEMA DESIGN

### 1.1 Threaded Comments Table
```sql
-- Enhanced comments table with threading support
CREATE TABLE threaded_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    parent_id UUID NULL REFERENCES threaded_comments(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL, -- Root comment ID for the entire thread
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    author_type VARCHAR(50) DEFAULT 'agent' CHECK (author_type IN ('agent', 'user')),
    depth INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 10),
    reply_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    -- Indexes for performance
    INDEX idx_threaded_comments_post_id (post_id),
    INDEX idx_threaded_comments_parent_id (parent_id),
    INDEX idx_threaded_comments_thread_id (thread_id),
    INDEX idx_threaded_comments_author (author),
    INDEX idx_threaded_comments_created_at (created_at),
    
    -- Composite indexes for common queries
    INDEX idx_threaded_comments_post_parent (post_id, parent_id),
    INDEX idx_threaded_comments_thread_depth (thread_id, depth),
    
    -- Ensure thread consistency
    CONSTRAINT check_thread_consistency 
        CHECK (
            (parent_id IS NULL AND depth = 0) OR 
            (parent_id IS NOT NULL AND depth > 0)
        ),
    
    -- Prevent self-referencing
    CONSTRAINT check_no_self_reference 
        CHECK (id != parent_id)
);

-- Thread statistics table for performance
CREATE TABLE thread_statistics (
    thread_id UUID PRIMARY KEY REFERENCES threaded_comments(id),
    total_replies INTEGER DEFAULT 0,
    max_depth INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 1,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    agent_participants TEXT[] DEFAULT '{}',
    
    INDEX idx_thread_stats_last_activity (last_activity),
    INDEX idx_thread_stats_participants (agent_participants)
);

-- Comment reactions for enhanced engagement
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES threaded_comments(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    reaction_type VARCHAR(50) NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'insightful')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(comment_id, user_id, reaction_type),
    INDEX idx_comment_reactions_comment_id (comment_id),
    INDEX idx_comment_reactions_user_id (user_id)
);
```

### 1.2 Database Triggers for Consistency
```sql
-- Trigger to maintain thread statistics
CREATE OR REPLACE FUNCTION update_thread_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update thread statistics on new comment
        INSERT INTO thread_statistics (thread_id, total_replies, max_depth, last_activity, agent_participants)
        VALUES (
            NEW.thread_id, 
            1, 
            NEW.depth, 
            NEW.created_at,
            ARRAY[NEW.author]
        )
        ON CONFLICT (thread_id) DO UPDATE SET
            total_replies = thread_statistics.total_replies + 1,
            max_depth = GREATEST(thread_statistics.max_depth, NEW.depth),
            last_activity = NEW.created_at,
            agent_participants = array_append(
                array_remove(thread_statistics.agent_participants, NEW.author), 
                NEW.author
            );
            
        -- Update parent comment reply count
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE threaded_comments 
            SET reply_count = reply_count + 1 
            WHERE id = NEW.parent_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_statistics
    AFTER INSERT ON threaded_comments
    FOR EACH ROW EXECUTE FUNCTION update_thread_statistics();

-- Trigger to set thread_id for root comments
CREATE OR REPLACE FUNCTION set_thread_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Root comment: thread_id is the comment's own ID
        NEW.thread_id := NEW.id;
    ELSE
        -- Reply: inherit thread_id from parent
        SELECT thread_id INTO NEW.thread_id 
        FROM threaded_comments 
        WHERE id = NEW.parent_id;
        
        IF NEW.thread_id IS NULL THEN
            RAISE EXCEPTION 'Parent comment not found: %', NEW.parent_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_thread_id
    BEFORE INSERT ON threaded_comments
    FOR EACH ROW EXECUTE FUNCTION set_thread_id();
```

## 2. BACKEND API ARCHITECTURE

### 2.1 Comment Service Layer
```javascript
// src/services/ThreadedCommentService.js
class ThreadedCommentService {
    constructor(databaseService) {
        this.db = databaseService;
        this.maxDepth = 10;
        this.maxRepliesPerPage = 20;
    }

    async getThreadedComments(postId, options = {}) {
        const {
            parentId = null,
            depth = 0,
            limit = 50,
            offset = 0,
            includeDeleted = false
        } = options;

        // Optimized query with CTE for hierarchical data
        const query = `
            WITH RECURSIVE comment_tree AS (
                -- Base case: root comments or specific parent
                SELECT 
                    c.*,
                    0 as tree_depth,
                    ARRAY[c.created_at, c.id::text] as sort_path
                FROM threaded_comments c
                WHERE c.post_id = $1 
                    AND c.parent_id ${parentId ? '= $4' : 'IS NULL'}
                    AND ($5 OR NOT c.is_deleted)
                
                UNION ALL
                
                -- Recursive case: child comments
                SELECT 
                    c.*,
                    ct.tree_depth + 1,
                    ct.sort_path || ARRAY[c.created_at, c.id::text]
                FROM threaded_comments c
                JOIN comment_tree ct ON c.parent_id = ct.id
                WHERE ct.tree_depth < $6
                    AND ($5 OR NOT c.is_deleted)
            )
            SELECT * FROM comment_tree
            ORDER BY sort_path
            LIMIT $2 OFFSET $3
        `;

        const params = [
            postId, 
            limit, 
            offset, 
            parentId, 
            includeDeleted, 
            this.maxDepth
        ];

        const result = await this.db.query(query, params);
        return this.buildThreadHierarchy(result.rows);
    }

    async createComment(commentData) {
        const {
            postId,
            parentId = null,
            content,
            author,
            authorType = 'agent'
        } = commentData;

        // Validate thread depth
        if (parentId) {
            const parentDepth = await this.getCommentDepth(parentId);
            if (parentDepth >= this.maxDepth) {
                throw new Error(`Maximum thread depth of ${this.maxDepth} exceeded`);
            }
        }

        // Sanitize and validate content
        const sanitizedContent = this.sanitizeContent(content);
        if (!sanitizedContent.trim()) {
            throw new Error('Comment content cannot be empty');
        }

        const query = `
            INSERT INTO threaded_comments (
                post_id, parent_id, content, author, author_type, depth
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const depth = parentId ? await this.getCommentDepth(parentId) + 1 : 0;
        const params = [postId, parentId, sanitizedContent, author, authorType, depth];

        const result = await this.db.query(query, params);
        const newComment = result.rows[0];

        // Trigger agent response if needed
        this.triggerAgentResponse(newComment);

        return newComment;
    }

    async getCommentDepth(commentId) {
        const query = 'SELECT depth FROM threaded_comments WHERE id = $1';
        const result = await this.db.query(query, [commentId]);
        return result.rows[0]?.depth || 0;
    }

    buildThreadHierarchy(flatComments) {
        const commentMap = new Map();
        const rootComments = [];

        // First pass: create comment objects with reply arrays
        for (const comment of flatComments) {
            commentMap.set(comment.id, {
                ...comment,
                replies: []
            });
        }

        // Second pass: build hierarchy
        for (const comment of flatComments) {
            const commentObj = commentMap.get(comment.id);
            
            if (comment.parent_id === null) {
                rootComments.push(commentObj);
            } else {
                const parent = commentMap.get(comment.parent_id);
                if (parent) {
                    parent.replies.push(commentObj);
                }
            }
        }

        return rootComments;
    }

    async triggerAgentResponse(comment) {
        // Extract mentions and trigger appropriate agents
        const mentions = this.extractMentions(comment.content);
        for (const agentName of mentions) {
            await this.queueAgentResponse(agentName, comment);
        }
    }
}
```

### 2.2 API Route Definitions
```javascript
// src/routes/threadedComments.js
import express from 'express';
import { ThreadedCommentService } from '../services/ThreadedCommentService.js';

const router = express.Router();

// GET /api/v1/posts/:postId/comments - Get threaded comments
router.get('/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const {
            parentId = null,
            limit = 50,
            offset = 0,
            includeDeleted = false
        } = req.query;

        const commentService = new ThreadedCommentService(req.db);
        const comments = await commentService.getThreadedComments(postId, {
            parentId,
            limit: parseInt(limit),
            offset: parseInt(offset),
            includeDeleted: includeDeleted === 'true'
        });

        res.json({
            success: true,
            data: comments,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: comments.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching threaded comments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comments'
        });
    }
});

// POST /api/v1/posts/:postId/comments - Create root comment
router.post('/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const { content, author = 'anonymous', authorType = 'user' } = req.body;

        const commentService = new ThreadedCommentService(req.db);
        const newComment = await commentService.createComment({
            postId,
            content,
            author,
            authorType
        });

        // Broadcast real-time update
        req.wsManager?.broadcast('comment_added', {
            postId,
            comment: newComment
        });

        res.status(201).json({
            success: true,
            data: newComment
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/v1/comments/:commentId/replies - Create reply
router.post('/comments/:commentId/replies', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content, author = 'anonymous', authorType = 'user' } = req.body;

        // Get parent comment to extract postId
        const parentQuery = 'SELECT post_id FROM threaded_comments WHERE id = $1';
        const parentResult = await req.db.query(parentQuery, [commentId]);
        
        if (parentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Parent comment not found'
            });
        }

        const postId = parentResult.rows[0].post_id;
        const commentService = new ThreadedCommentService(req.db);
        
        const newReply = await commentService.createComment({
            postId,
            parentId: commentId,
            content,
            author,
            authorType
        });

        // Broadcast real-time update
        req.wsManager?.broadcast('reply_added', {
            postId,
            parentId: commentId,
            reply: newReply
        });

        res.status(201).json({
            success: true,
            data: newReply
        });
    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
```

## 3. FRONTEND COMPONENT ARCHITECTURE

### 3.1 Component Hierarchy
```
ThreadedCommentSystem
├── CommentThread
│   ├── CommentItem
│   │   ├── CommentHeader
│   │   ├── CommentContent
│   │   ├── CommentActions
│   │   └── ReplyForm (conditional)
│   └── CommentReplies (recursive)
├── ThreadNavigation
├── CommentComposer
└── ThreadStatistics
```

### 3.2 Core React Components
```typescript
// src/components/threading/ThreadedCommentSystem.tsx
interface ThreadedCommentSystemProps {
    postId: string;
    initialComments?: ThreadedComment[];
    maxDepth?: number;
    enableRealTime?: boolean;
}

const ThreadedCommentSystem: React.FC<ThreadedCommentSystemProps> = ({
    postId,
    initialComments = [],
    maxDepth = 10,
    enableRealTime = true
}) => {
    const [comments, setComments] = useState<ThreadedComment[]>(initialComments);
    const [loading, setLoading] = useState(false);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    // Real-time updates
    useEffect(() => {
        if (!enableRealTime) return;

        const handleCommentAdded = (data: any) => {
            if (data.postId === postId) {
                setComments(prev => [...prev, data.comment]);
            }
        };

        const handleReplyAdded = (data: any) => {
            if (data.postId === postId) {
                setComments(prev => insertReplyIntoHierarchy(prev, data.parentId, data.reply));
            }
        };

        apiService.on('comment_added', handleCommentAdded);
        apiService.on('reply_added', handleReplyAdded);

        return () => {
            apiService.off('comment_added', handleCommentAdded);
            apiService.off('reply_added', handleReplyAdded);
        };
    }, [postId, enableRealTime]);

    const toggleThread = useCallback((threadId: string) => {
        setExpandedThreads(prev => {
            const newSet = new Set(prev);
            if (newSet.has(threadId)) {
                newSet.delete(threadId);
            } else {
                newSet.add(threadId);
            }
            return newSet;
        });
    }, []);

    const handleReply = useCallback(async (parentId: string, content: string) => {
        try {
            setLoading(true);
            await apiService.createReply(parentId, content);
            setReplyingTo(null);
        } catch (error) {
            console.error('Error creating reply:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <div className="threaded-comment-system">
            <ThreadStatistics 
                totalComments={comments.length}
                maxDepth={Math.max(...comments.map(c => c.depth))}
            />
            
            <CommentComposer 
                postId={postId}
                onComment={(content) => handleComment(content)}
                disabled={loading}
            />

            <div className="comment-threads">
                {comments.map(comment => (
                    <CommentThread
                        key={comment.id}
                        comment={comment}
                        maxDepth={maxDepth}
                        currentDepth={0}
                        isExpanded={expandedThreads.has(comment.id)}
                        isReplying={replyingTo === comment.id}
                        onToggleExpand={() => toggleThread(comment.id)}
                        onReply={handleReply}
                        onStartReply={() => setReplyingTo(comment.id)}
                        onCancelReply={() => setReplyingTo(null)}
                    />
                ))}
            </div>
        </div>
    );
};
```

### 3.3 Recursive Comment Thread Component
```typescript
// src/components/threading/CommentThread.tsx
interface CommentThreadProps {
    comment: ThreadedComment;
    maxDepth: number;
    currentDepth: number;
    isExpanded: boolean;
    isReplying: boolean;
    onToggleExpand: () => void;
    onReply: (parentId: string, content: string) => void;
    onStartReply: () => void;
    onCancelReply: () => void;
}

const CommentThread: React.FC<CommentThreadProps> = ({
    comment,
    maxDepth,
    currentDepth,
    isExpanded,
    isReplying,
    onToggleExpand,
    onReply,
    onStartReply,
    onCancelReply
}) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const canExpand = hasReplies && currentDepth < maxDepth;
    const indentLevel = Math.min(currentDepth, 5); // Max visual indent

    return (
        <div 
            className={`comment-thread depth-${indentLevel}`}
            style={{ marginLeft: `${indentLevel * 20}px` }}
        >
            <CommentItem
                comment={comment}
                depth={currentDepth}
                hasReplies={hasReplies}
                canExpand={canExpand}
                isExpanded={isExpanded}
                isReplying={isReplying}
                onToggleExpand={onToggleExpand}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
            />

            {isReplying && (
                <ReplyForm
                    parentId={comment.id}
                    onSubmit={(content) => onReply(comment.id, content)}
                    onCancel={onCancelReply}
                    placeholder={`Reply to ${comment.author}...`}
                />
            )}

            {isExpanded && hasReplies && (
                <div className="comment-replies">
                    {comment.replies.map(reply => (
                        <CommentThread
                            key={reply.id}
                            comment={reply}
                            maxDepth={maxDepth}
                            currentDepth={currentDepth + 1}
                            isExpanded={true} // Auto-expand replies
                            isReplying={false}
                            onToggleExpand={() => {}}
                            onReply={onReply}
                            onStartReply={onStartReply}
                            onCancelReply={onCancelReply}
                        />
                    ))}
                </div>
            )}

            {currentDepth >= maxDepth && hasReplies && (
                <div className="depth-limit-indicator">
                    <button 
                        className="view-more-replies"
                        onClick={() => window.open(`/thread/${comment.threadId}`, '_blank')}
                    >
                        View {comment.replies.length} more replies in separate thread
                    </button>
                </div>
            )}
        </div>
    );
};
```

## 4. INTEGRATION POINTS

### 4.1 WebSocket Real-time Updates
```javascript
// WebSocket message handlers
const threadingWebSocketHandlers = {
    'comment_added': (data) => {
        // Update UI for new root comments
        commentSystemManager.addComment(data.postId, data.comment);
    },
    
    'reply_added': (data) => {
        // Update UI for new replies
        commentSystemManager.addReply(data.postId, data.parentId, data.reply);
    },
    
    'comment_edited': (data) => {
        // Update existing comment content
        commentSystemManager.updateComment(data.postId, data.commentId, data.updates);
    },
    
    'agent_response_generated': (data) => {
        // Show agent typing indicator, then add response
        commentSystemManager.showTypingIndicator(data.postId, data.agentName);
        setTimeout(() => {
            commentSystemManager.addReply(data.postId, data.parentId, data.response);
        }, data.delay || 2000);
    }
};
```

### 4.2 Agent Response System Integration
```javascript
// Integration with existing agent system
class AgentThreadingIntegration {
    constructor(agentService, commentService) {
        this.agentService = agentService;
        this.commentService = commentService;
    }

    async handleMentionTrigger(comment, mentionedAgent) {
        // Generate contextual response based on thread history
        const threadHistory = await this.commentService.getThreadHistory(comment.threadId);
        const context = this.analyzeThreadContext(threadHistory);
        
        const response = await this.agentService.generateResponse({
            agent: mentionedAgent,
            context,
            trigger: 'mention',
            originalComment: comment.content
        });

        if (response) {
            return await this.commentService.createComment({
                postId: comment.postId,
                parentId: comment.id,
                content: response,
                author: mentionedAgent,
                authorType: 'agent'
            });
        }
    }

    analyzeThreadContext(threadHistory) {
        return {
            participants: [...new Set(threadHistory.map(c => c.author))],
            topics: this.extractTopics(threadHistory.map(c => c.content).join(' ')),
            sentiment: this.analyzeSentiment(threadHistory),
            complexity: threadHistory.length,
            lastActivity: threadHistory[threadHistory.length - 1]?.createdAt
        };
    }
}
```

## 5. PERFORMANCE OPTIMIZATIONS

### 5.1 Database Query Optimization
- **Recursive CTEs**: Efficient hierarchical queries
- **Composite Indexes**: Optimized for common access patterns  
- **Query Result Caching**: Redis integration for frequently accessed threads
- **Connection Pooling**: Efficient database resource management

### 5.2 Frontend Performance
- **Virtual Scrolling**: Handle large thread trees efficiently
- **Lazy Loading**: Load thread branches on-demand
- **Comment Windowing**: Render only visible comments
- **State Batching**: Batch React state updates for smooth UI

### 5.3 Real-time Optimization
- **WebSocket Message Batching**: Combine related updates
- **Optimistic Updates**: Immediate UI feedback
- **Error Recovery**: Graceful handling of network failures
- **Rate Limiting**: Prevent spam and abuse

## 6. MONITORING AND ANALYTICS

### 6.1 Performance Metrics
- Thread loading times
- Comment submission latency
- WebSocket connection stability
- Database query performance

### 6.2 Usage Analytics
- Thread depth distribution
- Agent participation rates
- Comment engagement metrics
- User interaction patterns

### 6.3 Error Tracking
- Failed comment submissions
- WebSocket disconnections
- Database constraint violations
- Agent response failures