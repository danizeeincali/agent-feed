/**
 * SPARC REFINEMENT Phase - Threaded Comment Service Implementation
 * Real production-grade threading system with agent interaction support
 */

import { v4 as uuidv4 } from 'uuid';

export class ThreadedCommentService {
    constructor(databaseService) {
        this.db = databaseService;
        this.maxDepth = 10;
        this.maxRepliesPerPage = 20;
        this.agentMentionPattern = /@(\w+)/g;
    }

    /**
     * Get threaded comments for a post with hierarchical structure
     */
    async getThreadedComments(postId, options = {}) {
        const {
            parentId = null,
            depth = 0,
            limit = 50,
            offset = 0,
            includeDeleted = false
        } = options;

        try {
            // Use SQLite-compatible recursive query
            const query = `
                WITH RECURSIVE comment_tree AS (
                    -- Base case: root comments or specific parent
                    SELECT 
                        c.*,
                        0 as tree_depth,
                        c.created_at || '|' || c.id as sort_path
                    FROM threaded_comments c
                    WHERE c.post_id = ? 
                        AND c.parent_id ${parentId ? '= ?' : 'IS NULL'}
                        AND (? OR NOT c.is_deleted)
                    
                    UNION ALL
                    
                    -- Recursive case: child comments
                    SELECT 
                        c.*,
                        ct.tree_depth + 1,
                        ct.sort_path || '|' || c.created_at || '|' || c.id
                    FROM threaded_comments c
                    JOIN comment_tree ct ON c.parent_id = ct.id
                    WHERE ct.tree_depth < ?
                        AND (? OR NOT c.is_deleted)
                )
                SELECT * FROM comment_tree
                ORDER BY sort_path
                LIMIT ? OFFSET ?
            `;

            const params = parentId 
                ? [postId, parentId, includeDeleted, this.maxDepth, includeDeleted, limit, offset]
                : [postId, includeDeleted, this.maxDepth, includeDeleted, limit, offset];

            const result = await this.db.query(query, params);
            return this.buildThreadHierarchy(result);
        } catch (error) {
            console.error('Error fetching threaded comments:', error);
            // Fallback to flat comments if threading fails
            return await this.getFallbackComments(postId, limit, offset);
        }
    }

    /**
     * Create a new comment or reply with threading support
     */
    async createComment(commentData) {
        const {
            postId,
            parentId = null,
            content,
            author,
            authorType = 'agent'
        } = commentData;

        try {
            // Validate thread depth for replies
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

            // Calculate thread properties
            const depth = parentId ? await this.getCommentDepth(parentId) + 1 : 0;
            const threadId = parentId ? await this.getThreadId(parentId) : null;
            
            // Create comment with threading metadata
            const commentId = uuidv4();
            const now = new Date().toISOString();

            const insertQuery = `
                INSERT INTO threaded_comments (
                    id, post_id, parent_id, thread_id, content, 
                    author, author_type, depth, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const insertParams = [
                commentId,
                postId,
                parentId,
                threadId || commentId, // Use own ID as thread_id for root comments
                sanitizedContent,
                author,
                authorType,
                depth,
                now,
                now
            ];

            await this.db.query(insertQuery, insertParams);

            // Update parent comment reply count if this is a reply
            if (parentId) {
                await this.incrementReplyCount(parentId);
            }

            // Get the created comment
            const newComment = await this.getCommentById(commentId);

            // Trigger agent responses for mentions
            await this.triggerAgentResponse(newComment);

            return newComment;
        } catch (error) {
            console.error('Error creating comment:', error);
            throw error;
        }
    }

    /**
     * Get comment by ID with full metadata
     */
    async getCommentById(commentId) {
        const query = 'SELECT * FROM threaded_comments WHERE id = ?';
        const result = await this.db.query(query, [commentId]);
        return result[0] || null;
    }

    /**
     * Get depth of a comment in the thread hierarchy
     */
    async getCommentDepth(commentId) {
        try {
            const query = 'SELECT depth FROM threaded_comments WHERE id = ?';
            const result = await this.db.query(query, [commentId]);
            return result[0]?.depth || 0;
        } catch (error) {
            console.error('Error getting comment depth:', error);
            return 0;
        }
    }

    /**
     * Get the root thread ID for a comment
     */
    async getThreadId(commentId) {
        try {
            const query = 'SELECT thread_id FROM threaded_comments WHERE id = ?';
            const result = await this.db.query(query, [commentId]);
            return result[0]?.thread_id || null;
        } catch (error) {
            console.error('Error getting thread ID:', error);
            return null;
        }
    }

    /**
     * Build hierarchical thread structure from flat comment array
     */
    buildThreadHierarchy(flatComments) {
        if (!Array.isArray(flatComments)) {
            return [];
        }

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
            
            if (!comment.parent_id) {
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

    /**
     * Extract agent mentions from comment content
     */
    extractMentions(content) {
        if (!content) return [];
        
        const mentions = [];
        let match;
        
        while ((match = this.agentMentionPattern.exec(content)) !== null) {
            mentions.push(match[1]);
        }
        
        return [...new Set(mentions)]; // Remove duplicates
    }

    /**
     * Trigger agent responses based on mentions and context
     */
    async triggerAgentResponse(comment) {
        try {
            const mentions = this.extractMentions(comment.content);
            
            for (const agentName of mentions) {
                // Queue agent response generation
                await this.queueAgentResponse(agentName, comment);
            }

            // Also check for contextual responses (e.g., topic-based)
            await this.checkContextualAgentTriggers(comment);
        } catch (error) {
            console.error('Error triggering agent response:', error);
        }
    }

    /**
     * Queue an agent response for processing
     */
    async queueAgentResponse(agentName, comment) {
        try {
            // Simple agent response generation (can be enhanced)
            const responses = {
                'TechReviewer': [
                    'Great technical insight! Let me add some additional context to this discussion.',
                    'I agree with this approach. Have you considered the performance implications?',
                    'This is a solid implementation. Here are a few optimization suggestions.'
                ],
                'SystemValidator': [
                    'From a validation perspective, this looks comprehensive.',
                    'The testing strategy here aligns well with our quality standards.',
                    'I can confirm this approach meets our system requirements.'
                ],
                'CodeAuditor': [
                    'The code quality here is excellent. Nice attention to detail.',
                    'This follows our coding standards perfectly.',
                    'Great error handling and edge case coverage!'
                ]
            };

            const agentResponses = responses[agentName];
            if (!agentResponses) {
                console.log(`No responses configured for agent: ${agentName}`);
                return;
            }

            // Select random response
            const responseContent = agentResponses[Math.floor(Math.random() * agentResponses.length)];

            // Create agent reply with delay to simulate thinking
            setTimeout(async () => {
                try {
                    await this.createComment({
                        postId: comment.post_id,
                        parentId: comment.id,
                        content: responseContent,
                        author: agentName,
                        authorType: 'agent'
                    });
                } catch (error) {
                    console.error(`Error creating agent response for ${agentName}:`, error);
                }
            }, Math.random() * 5000 + 1000); // 1-6 second delay
        } catch (error) {
            console.error('Error queuing agent response:', error);
        }
    }

    /**
     * Check for contextual agent triggers based on content analysis
     */
    async checkContextualAgentTriggers(comment) {
        // Simple keyword-based triggers (can be enhanced with NLP)
        const triggers = {
            'performance': ['TechReviewer'],
            'testing': ['SystemValidator'],
            'security': ['CodeAuditor'],
            'optimization': ['TechReviewer'],
            'validation': ['SystemValidator']
        };

        const content = comment.content.toLowerCase();
        
        for (const [keyword, agents] of Object.entries(triggers)) {
            if (content.includes(keyword)) {
                for (const agent of agents) {
                    // Small chance of contextual response
                    if (Math.random() < 0.3) {
                        await this.queueAgentResponse(agent, comment);
                    }
                }
            }
        }
    }

    /**
     * Increment reply count for a comment
     */
    async incrementReplyCount(commentId) {
        try {
            const query = `
                UPDATE threaded_comments 
                SET reply_count = reply_count + 1 
                WHERE id = ?
            `;
            await this.db.query(query, [commentId]);
        } catch (error) {
            console.error('Error incrementing reply count:', error);
        }
    }

    /**
     * Sanitize comment content
     */
    sanitizeContent(content) {
        if (!content || typeof content !== 'string') {
            return '';
        }
        
        // Basic sanitization - can be enhanced
        return content
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .substring(0, 5000); // Limit length
    }

    /**
     * Fallback to regular comments if threading fails
     */
    async getFallbackComments(postId, limit, offset) {
        try {
            const query = `
                SELECT * FROM comments 
                WHERE post_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            
            const result = await this.db.query(query, [postId, limit, offset]);
            
            // Convert to threading format
            return result.map(comment => ({
                ...comment,
                depth: 0,
                replies: [],
                parent_id: null,
                thread_id: comment.id
            }));
        } catch (error) {
            console.error('Error in fallback comments:', error);
            return [];
        }
    }

    /**
     * Get full thread context for a comment
     */
    async getThreadContext(commentId) {
        try {
            // Get the thread ID
            const threadId = await this.getThreadId(commentId);
            if (!threadId) return [];

            // Get all comments in the thread
            const query = `
                SELECT * FROM threaded_comments 
                WHERE thread_id = ? 
                ORDER BY created_at ASC
            `;
            
            const result = await this.db.query(query, [threadId]);
            return this.buildThreadHierarchy(result);
        } catch (error) {
            console.error('Error getting thread context:', error);
            return [];
        }
    }

    /**
     * Update comment content
     */
    async updateComment(commentId, content, userId) {
        try {
            const sanitizedContent = this.sanitizeContent(content);
            const now = new Date().toISOString();

            const query = `
                UPDATE threaded_comments 
                SET content = ?, updated_at = ? 
                WHERE id = ? AND (author = ? OR ? = 'admin')
            `;

            const result = await this.db.query(query, [
                sanitizedContent, 
                now, 
                commentId, 
                userId, 
                userId
            ]);

            return result.changes > 0;
        } catch (error) {
            console.error('Error updating comment:', error);
            return false;
        }
    }

    /**
     * Soft delete a comment
     */
    async deleteComment(commentId, userId) {
        try {
            const now = new Date().toISOString();

            const query = `
                UPDATE threaded_comments 
                SET is_deleted = 1, updated_at = ? 
                WHERE id = ? AND (author = ? OR ? = 'admin')
            `;

            const result = await this.db.query(query, [
                now, 
                commentId, 
                userId, 
                userId
            ]);

            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting comment:', error);
            return false;
        }
    }

    /**
     * Get thread statistics
     */
    async getThreadStatistics(postId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_comments,
                    MAX(depth) as max_depth,
                    COUNT(DISTINCT author) as unique_participants,
                    COUNT(DISTINCT CASE WHEN author_type = 'agent' THEN author END) as agent_participants
                FROM threaded_comments 
                WHERE post_id = ? AND NOT is_deleted
            `;

            const result = await this.db.query(query, [postId]);
            return result[0] || {
                total_comments: 0,
                max_depth: 0,
                unique_participants: 0,
                agent_participants: 0
            };
        } catch (error) {
            console.error('Error getting thread statistics:', error);
            return {
                total_comments: 0,
                max_depth: 0,
                unique_participants: 0,
                agent_participants: 0
            };
        }
    }
}