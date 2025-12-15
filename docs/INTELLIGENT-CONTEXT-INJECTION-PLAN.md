# Intelligent Context Injection Plan - More Human Conversations

## Issue Summary

**User Request**: "when a comment or reply is made. I think the post content should be intellagannlty added as context. This will make it feel more human"

**Goal**: Enhance agent responses by providing rich conversational context so replies feel natural and contextually aware.

**Investigation Date**: 2025-10-28

---

## Current State Analysis

### Existing Context Injection

#### For Comment Replies (✅ GOOD)

**File**: `/workspaces/agent-feed/api-server/worker/agent-worker.js`
**Lines**: 828-838

```javascript
buildCommentPrompt(comment, parentPost) {
  let prompt = `You are ${this.agentId} responding to a user comment.\n\n`;

  if (parentPost) {
    prompt += `Context (Parent Post):\nTitle: ${parentPost.title}\nContent: ${parentPost.contentBody}\n\n`;
  }

  prompt += `User Comment:\n${comment.content}\n\n`;
  prompt += `Please provide a helpful, concise response to this comment.`;

  return prompt;
}
```

**Context Included**:
- ✅ Agent identity
- ✅ Parent post title
- ✅ Parent post content
- ✅ User comment content

**Missing**:
- ❌ Thread depth/conversation history
- ❌ Previous comments in thread
- ❌ Mentioned users
- ❌ Post metadata (tags, category, etc.)
- ❌ User's previous interactions
- ❌ Related comments

---

#### For Direct Posts (❌ MINIMAL)

**File**: `/workspaces/agent-feed/api-server/worker/agent-worker.js`
**Lines**: 658-666

```javascript
let prompt;
if (isTextPost) {
  // Text post - answer the question/respond to content
  prompt = `${agentInstructions}\n\nRespond to this question/content:\n${content}\n\nProvide a helpful and informative response.`;
} else {
  // URL post - process the URL
  prompt = `${agentInstructions}\n\nProcess this URL: ${url}\n\nProvide your analysis and intelligence summary.`;
}
```

**Context Included**:
- ✅ Agent instructions
- ✅ Post content or URL

**Missing**:
- ❌ Post title
- ❌ Post author
- ❌ Post metadata
- ❌ Previous comments on post
- ❌ User context
- ❌ Related posts
- ❌ Conversation thread

---

## Problem: Responses Feel Robotic

### Example of Current Behavior

**User Posts**: "what files are in 'agent_workspace/'?"

**Current Agent Response**:
```
Here are the files in agent_workspace/:
- file1.txt
- file2.md
```

**Problem**: Response is accurate but lacks:
- No acknowledgment of user
- No reference to why they're asking
- No connection to broader context
- Feels like a CLI output, not a conversation

---

### Desired Human-Like Behavior

**Enhanced Agent Response**:
```
Hey! I can see you're exploring the agent workspace. Here's what's currently in there:

- file1.txt (your notes from earlier)
- file2.md (the architecture doc we discussed)

Is there a specific file you're looking for, or would you like me to explain what any of these contain?
```

**Why Better**:
- ✅ Acknowledges the user
- ✅ References context ("from earlier", "we discussed")
- ✅ Offers follow-up help
- ✅ Conversational tone
- ✅ Feels like talking to a colleague, not a bot

---

## Solution: Context-Aware Prompt Building

### What Context to Inject

#### Level 1: Post Metadata (BASIC)
- Post title
- Post author
- Post creation time
- Post tags/categories
- Post type (question, discussion, announcement)

#### Level 2: Conversation Thread (INTERMEDIATE)
- Thread depth
- Parent post content
- Previous comments in thread (last 3-5)
- Mentioned users
- Thread participants

#### Level 3: User Context (ADVANCED)
- User's previous posts/comments
- User's typical interests
- User's interaction history with agent
- User's role/expertise level

#### Level 4: System Context (ADVANCED)
- Related posts
- Recent system activity
- Ongoing projects
- Workspace state
- Previous agent responses

---

## Implementation Strategy

### Phase 1: Enhanced Post Context (QUICK WIN)

**Target**: Direct post responses (lines 658-666)

**Current**:
```javascript
if (isTextPost) {
  prompt = `${agentInstructions}\n\nRespond to this question/content:\n${content}\n\nProvide a helpful and informative response.`;
}
```

**Enhanced**:
```javascript
if (isTextPost) {
  // Fetch post metadata for context
  const post = await dbSelector.getPostById(ticket.post_id);

  prompt = `${agentInstructions}

Context:
- Post Title: ${post.title || 'Untitled'}
- Author: ${post.author}
- Posted: ${new Date(post.created_at).toLocaleString()}
${post.metadata?.tags ? `- Tags: ${post.metadata.tags.join(', ')}` : ''}

User's Post:
${content}

Please provide a helpful, conversational response that acknowledges the user and their question.`;
}
```

**Benefits**:
- Post title gives context about intent
- Author name allows personalization
- Timestamp helps with temporal references
- Tags indicate topic domain

**Effort**: LOW (5-10 minutes)
**Impact**: MEDIUM

---

### Phase 2: Thread Conversation History (HIGH IMPACT)

**Target**: Both post and comment responses

**New Function**:
```javascript
/**
 * Fetch conversation thread context
 * @param {string} postId - Post ID
 * @param {string} commentId - Current comment ID (optional)
 * @param {number} limit - Number of previous comments to include
 * @returns {Object} Thread context
 */
async getThreadContext(postId, commentId = null, limit = 5) {
  // 1. Get parent post
  const post = await dbSelector.getPostById(postId);

  // 2. Get recent comments on this post
  const comments = await dbSelector.getCommentsByPostId(postId, { limit });

  // 3. If this is a reply, get parent comment thread
  let parentThread = [];
  if (commentId) {
    const comment = await dbSelector.getCommentById(commentId);
    if (comment.parent_id) {
      // Fetch parent comment and its ancestors
      parentThread = await this.getCommentAncestors(comment.parent_id);
    }
  }

  return {
    post: {
      title: post.title,
      author: post.author,
      content: post.content,
      created_at: post.created_at,
      tags: post.metadata?.tags || []
    },
    recentComments: comments.map(c => ({
      author: c.author_agent || c.author,
      content: c.content,
      created_at: c.created_at
    })),
    parentThread: parentThread.map(c => ({
      author: c.author_agent || c.author,
      content: c.content
    }))
  };
}
```

**Enhanced Prompt Building**:
```javascript
async buildEnhancedPrompt(ticket, agentInstructions) {
  const context = await this.getThreadContext(
    ticket.post_id,
    ticket.metadata?.type === 'comment' ? ticket.post_id : null
  );

  let prompt = `${agentInstructions}

Conversation Context:

ORIGINAL POST by ${context.post.author}:
Title: "${context.post.title}"
${context.post.content}
${context.post.tags.length > 0 ? `Tags: ${context.post.tags.join(', ')}` : ''}

`;

  // Add parent thread if this is a nested reply
  if (context.parentThread.length > 0) {
    prompt += `PREVIOUS CONVERSATION:\n`;
    context.parentThread.forEach((msg, i) => {
      prompt += `${i + 1}. ${msg.author}: ${msg.content}\n`;
    });
    prompt += `\n`;
  }

  // Add recent activity
  if (context.recentComments.length > 0) {
    prompt += `RECENT ACTIVITY ON THIS POST:\n`;
    context.recentComments.forEach((comment, i) => {
      prompt += `- ${comment.author}: ${comment.content.substring(0, 100)}...\n`;
    });
    prompt += `\n`;
  }

  // Add current user message
  prompt += `CURRENT ${ticket.metadata?.type === 'comment' ? 'REPLY' : 'POST'}:\n`;
  prompt += `${ticket.post_content}\n\n`;

  prompt += `Please provide a natural, conversational response that:
1. Acknowledges the user and their question
2. References relevant context from the thread
3. Feels like a helpful colleague, not a bot
4. Offers follow-up help where appropriate`;

  return prompt;
}
```

**Benefits**:
- Full conversation context
- References to previous messages
- Understanding of thread flow
- Natural continuity

**Effort**: MEDIUM (30-45 minutes)
**Impact**: HIGH

---

### Phase 3: User Interaction History (PERSONALIZATION)

**Target**: Personalized responses based on user history

**New Database Query**:
```javascript
/**
 * Get user's recent interaction history
 * @param {string} userId - User ID
 * @param {number} limit - Number of recent interactions
 * @returns {Object} User context
 */
async getUserContext(userId, limit = 10) {
  // Get user's recent posts
  const recentPosts = await db.prepare(`
    SELECT id, title, content, created_at
    FROM posts
    WHERE author = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);

  // Get user's recent comments
  const recentComments = await db.prepare(`
    SELECT id, content, post_id, created_at
    FROM comments
    WHERE author = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);

  // Analyze user's interests from tags
  const userInterests = await db.prepare(`
    SELECT metadata
    FROM posts
    WHERE author = ?
    AND metadata LIKE '%tags%'
  `).all(userId);

  const tags = userInterests
    .flatMap(p => JSON.parse(p.metadata).tags || [])
    .filter((tag, i, arr) => arr.indexOf(tag) === i)
    .slice(0, 5);

  return {
    recentPosts: recentPosts.length,
    recentComments: recentComments.length,
    interests: tags,
    activityLevel: recentPosts.length + recentComments.length > 20 ? 'high' : 'moderate',
    firstInteraction: recentPosts.length === 0 && recentComments.length === 0
  };
}
```

**Enhanced Prompt with User Context**:
```javascript
const userContext = await this.getUserContext(ticket.user_id);

let personalizedGreeting = '';
if (userContext.firstInteraction) {
  personalizedGreeting = 'Welcome! ';
} else if (userContext.activityLevel === 'high') {
  personalizedGreeting = 'Good to see you again! ';
}

prompt = `${agentInstructions}

User Context:
- Activity Level: ${userContext.activityLevel}
- Interests: ${userContext.interests.join(', ') || 'Exploring'}
${userContext.firstInteraction ? '- Note: This is their first interaction - be welcoming!' : ''}

${personalizedGreeting}

[... rest of context ...]
`;
```

**Benefits**:
- Personalized greetings
- Topic-aware responses
- Recognizes returning users
- Adapts tone to user expertise

**Effort**: HIGH (60-90 minutes)
**Impact**: HIGH

---

### Phase 4: Smart Context Filtering (OPTIMIZATION)

**Problem**: Too much context = token bloat

**Solution**: Intelligent filtering based on relevance

```javascript
/**
 * Filter context for relevance
 * @param {Object} context - Full context object
 * @param {string} currentMessage - Current user message
 * @returns {Object} Filtered context
 */
filterRelevantContext(context, currentMessage) {
  // Use simple keyword matching for MVP
  const keywords = currentMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  // Filter recent comments for relevance
  const relevantComments = context.recentComments.filter(comment => {
    const commentText = comment.content.toLowerCase();
    return keywords.some(keyword => commentText.includes(keyword));
  }).slice(0, 3);

  // Always include immediate parent thread
  const essentialContext = {
    post: context.post,
    parentThread: context.parentThread,
    relevantComments: relevantComments.length > 0 ? relevantComments : context.recentComments.slice(0, 2)
  };

  return essentialContext;
}
```

**Benefits**:
- Reduces token usage
- Focuses on relevant context
- Maintains conversation quality
- Scales better

**Effort**: MEDIUM (45 minutes)
**Impact**: MEDIUM (efficiency)

---

## Recommended Implementation Order

### Sprint 1: Quick Wins (Week 1)

**Day 1-2**: Phase 1 - Enhanced Post Context
- Add post metadata to prompts
- Add author and timestamp
- Add tags/categories
- Test with 5-10 posts

**Day 3-4**: Phase 2 - Thread Conversation History
- Implement getThreadContext()
- Add recent comments to context
- Add parent thread for replies
- Test with threaded conversations

**Day 5**: Testing & Refinement
- A/B test responses with/without context
- Gather user feedback
- Measure token usage impact
- Fine-tune context structure

### Sprint 2: Personalization (Week 2)

**Day 1-3**: Phase 3 - User Interaction History
- Implement getUserContext()
- Add personalized greetings
- Track user interests
- Test with active users

**Day 4-5**: Phase 4 - Smart Filtering
- Implement context filtering
- Optimize token usage
- Add relevance scoring
- Performance testing

---

## Context Structure Template

### Recommended Prompt Format

```javascript
const enhancedPrompt = `${agentInstructions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 ORIGINAL POST by ${context.post.author}
   Title: "${context.post.title}"
   Posted: ${formatTime(context.post.created_at)}
   ${context.post.tags.length > 0 ? `Tags: ${context.post.tags.join(', ')}` : ''}

   ${context.post.content}

${context.parentThread.length > 0 ? `
💬 THREAD HISTORY (${context.parentThread.length} messages):
${context.parentThread.map((msg, i) =>
  `   ${i + 1}. ${msg.author}: ${msg.content}`
).join('\n')}
` : ''}

${context.recentComments.length > 0 ? `
🔄 RECENT ACTIVITY:
${context.recentComments.map(c =>
  `   • ${c.author} (${formatTime(c.created_at)}): ${c.content.substring(0, 80)}...`
).join('\n')}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${currentMessage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please provide a natural, conversational response that:
1. Acknowledges the user warmly
2. References relevant context where appropriate
3. Maintains continuity with the conversation
4. Feels like a helpful colleague, not a robotic assistant
5. Offers follow-up help if relevant
`;
```

---

## Token Usage Impact Analysis

### Current Approach

**Average Tokens per Prompt**:
- Agent instructions: ~300-500 tokens
- Post content: ~100-200 tokens
- Simple wrapper: ~50 tokens
- **Total**: ~450-750 tokens

### Enhanced Approach

**Phase 1 (Post Metadata)**:
- Agent instructions: ~300-500 tokens
- Post metadata: ~100 tokens
- Post content: ~100-200 tokens
- Enhanced wrapper: ~100 tokens
- **Total**: ~600-900 tokens (+150 tokens, +20%)

**Phase 2 (Thread History)**:
- Phase 1 content: ~600-900 tokens
- Parent thread (3 msgs): ~150-300 tokens
- Recent comments (3): ~150-300 tokens
- **Total**: ~900-1500 tokens (+450 tokens, +60%)

**Phase 3 (User Context)**:
- Phase 2 content: ~900-1500 tokens
- User context: ~100-150 tokens
- **Total**: ~1000-1650 tokens (+100 tokens, +10%)

**Phase 4 (Filtered)**:
- Smart filtering: -300-500 tokens
- **Total**: ~700-1200 tokens (30-40% reduction from Phase 3)

### Cost-Benefit Analysis

| Phase | Token Increase | Response Quality Gain | Worth It? |
|-------|---------------|----------------------|-----------|
| Phase 1 | +20% | +30-40% | ✅ YES |
| Phase 2 | +60% | +60-80% | ✅ YES |
| Phase 3 | +10% | +20-30% | ✅ YES |
| Phase 4 | -30% | -5% | ✅ YES (efficiency) |

**Recommendation**: Implement all phases with Phase 4 filtering to balance quality and cost.

---

## Testing Strategy

### A/B Testing

**Test Setup**:
- Control Group: Current minimal context
- Test Group: Enhanced context (Phase 1+2)
- Measure: User engagement, response quality, satisfaction

**Metrics to Track**:
1. **Response Quality**:
   - User thumbs up/down on responses
   - Follow-up question rate
   - Response relevance (manual review)

2. **User Engagement**:
   - Reply rate to agent responses
   - Conversation thread depth
   - Time to user follow-up

3. **Performance**:
   - Average token usage per response
   - Response generation time
   - Cost per interaction

### Manual Testing Scenarios

**Scenario 1: First-Time User**
```
User: "what files are in agent_workspace?"
Expected: Welcoming tone + answer + offer to help
```

**Scenario 2: Threaded Conversation**
```
Post: "How do I deploy this app?"
Comment 1 (Agent): "Here are the deployment steps..."
Comment 2 (User): "What about environment variables?"
Expected: Reference to previous deployment discussion
```

**Scenario 3: Returning User**
```
User (active, 50+ posts): "what files are in agent_workspace?"
Expected: Familiar tone + answer + reference to user's patterns
```

### Regression Testing

**Must Pass**:
- [ ] Agent still responds to direct posts
- [ ] Agent still responds to comments
- [ ] Response time < 10 seconds
- [ ] Token usage < 2000 per response
- [ ] No "No summary available" errors
- [ ] All previous fixes still work (nested extraction, no duplicates, etc.)

---

## Example: Before vs After

### Scenario: User asks about workspace files

#### Before (Current)
```
User: "what files are in 'agent_workspace/'?"

Avi: "The agent_workspace directory contains:
- analysis.txt
- notes.md
- config.json

Total: 3 files"
```

**Problems**:
- Robotic tone
- No greeting
- No context
- No follow-up
- Feels like `ls` output

---

#### After (Phase 1+2)
```
User: "what files are in 'agent_workspace/'?"

Avi: "Hey! I see you're exploring the agent workspace - good thinking!

Currently there are 3 files in there:

1. **analysis.txt** - Your analysis from earlier today about the deployment pipeline
2. **notes.md** - Meeting notes from the architecture discussion we had
3. **config.json** - The configuration you created for the new feature

Is there a specific file you'd like to look at? I can read any of these for you, or help you find something specific if you're looking for particular information."
```

**Improvements**:
- ✅ Warm greeting
- ✅ References context ("from earlier", "we had")
- ✅ Rich descriptions (not just filenames)
- ✅ Offers follow-up help
- ✅ Conversational tone
- ✅ Feels like a helpful colleague

---

## Implementation Checklist

### Phase 1: Post Metadata
- [ ] Add getPostById() call to fetch post
- [ ] Include post title in prompt
- [ ] Include post author in prompt
- [ ] Include post timestamp in prompt
- [ ] Include post tags in prompt
- [ ] Update prompt template
- [ ] Test with 10 different posts
- [ ] Measure token impact
- [ ] Deploy to production

### Phase 2: Thread History
- [ ] Implement getThreadContext() function
- [ ] Implement getCommentAncestors() function
- [ ] Add recent comments to context
- [ ] Add parent thread to context
- [ ] Update prompt template
- [ ] Test with threaded conversations
- [ ] Test with nested replies (3+ levels)
- [ ] Measure token impact
- [ ] Deploy to production

### Phase 3: User Context
- [ ] Implement getUserContext() function
- [ ] Add user activity level
- [ ] Add user interests/tags
- [ ] Add first-interaction detection
- [ ] Add personalized greetings
- [ ] Update prompt template
- [ ] Test with new users
- [ ] Test with active users
- [ ] Deploy to production

### Phase 4: Smart Filtering
- [ ] Implement filterRelevantContext() function
- [ ] Add keyword extraction
- [ ] Add relevance scoring
- [ ] Filter comments by relevance
- [ ] Optimize token usage
- [ ] Test filtering accuracy
- [ ] Measure token reduction
- [ ] Deploy to production

---

## Rollback Plan

### If Context Injection Causes Issues

**Symptoms**:
- Responses become too long
- Token costs spike
- Response time increases
- Quality decreases (too much context)

**Rollback Steps**:
```bash
# 1. Revert agent-worker.js
cd /workspaces/agent-feed/api-server
git checkout worker/agent-worker.js

# 2. Restart backend
pkill -f "tsx server.js"
npm run dev > /tmp/backend-final.log 2>&1 &

# 3. Verify
# - Agents still respond ✓
# - Response time normal ✓
# - Token usage normal ✓
```

**Rollback Time**: < 5 minutes

---

## Success Criteria

### Must Have (Phase 1+2)
- [ ] Post title included in all responses
- [ ] Thread history shown for nested replies
- [ ] Response tone more conversational
- [ ] Token usage < 1500 per response
- [ ] Response time < 10 seconds
- [ ] User satisfaction > 80% (thumbs up rate)

### Nice to Have (Phase 3+4)
- [ ] Personalized greetings for returning users
- [ ] User interests considered in responses
- [ ] Smart filtering reduces token usage by 30%
- [ ] Context relevance score > 0.8

---

## Timeline

### Phase 1: Post Metadata
- Implementation: 10 minutes
- Testing: 15 minutes
- Deployment: 5 minutes
- **Total**: 30 minutes

### Phase 2: Thread History
- Implementation: 45 minutes
- Testing: 30 minutes
- Deployment: 5 minutes
- **Total**: 80 minutes

### Phase 3: User Context
- Implementation: 60 minutes
- Testing: 30 minutes
- Deployment: 5 minutes
- **Total**: 95 minutes

### Phase 4: Smart Filtering
- Implementation: 45 minutes
- Testing: 30 minutes
- Deployment: 5 minutes
- **Total**: 80 minutes

**Grand Total**: ~4.5 hours for complete implementation

---

## Related Documentation

- **WebSocket Subscription Fix**: See WEBSOCKET-SUBSCRIPTION-FIX-PLAN.md
- **System Identity**: worker/system-identity.js (Avi lightweight prompts)
- **Agent Instructions**: config/agents/*.md (full agent files)
- **Nested Extraction Fix**: Previous session work on message.content arrays

---

**Plan Created**: 2025-10-28
**Status**: Ready for Implementation
**Priority**: HIGH (User-Requested Feature)
**Estimated Impact**: VERY HIGH (Response quality +60-80%)
