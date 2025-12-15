# SPARC PSEUDOCODE Phase - Threading Algorithm Design

## 1. RECURSIVE COMMENT RENDERING ALGORITHM

```pseudocode
FUNCTION renderThreadedComments(comments, maxDepth = 10):
  INITIALIZE threadTree = buildThreadHierarchy(comments)
  RETURN recursiveRender(threadTree, 0, maxDepth)

FUNCTION buildThreadHierarchy(flatComments):
  INITIALIZE rootComments = []
  INITIALIZE commentMap = new Map()
  
  FOR each comment IN flatComments:
    commentMap.set(comment.id, {...comment, replies: []})
  END FOR
  
  FOR each comment IN flatComments:
    IF comment.parentId IS null:
      rootComments.push(commentMap.get(comment.id))
    ELSE:
      parent = commentMap.get(comment.parentId)
      IF parent EXISTS:
        parent.replies.push(commentMap.get(comment.id))
      END IF
    END IF
  END FOR
  
  RETURN rootComments

FUNCTION recursiveRender(comments, currentDepth, maxDepth):
  IF currentDepth >= maxDepth:
    RETURN <DepthLimitIndicator />
  END IF
  
  RETURN (
    <ThreadContainer depth={currentDepth}>
      FOR each comment IN comments:
        <CommentItem 
          comment={comment}
          depth={currentDepth}
          onReply={handleReply}
          onEdit={handleEdit}
        />
        IF comment.replies.length > 0:
          recursiveRender(comment.replies, currentDepth + 1, maxDepth)
        END IF
      END FOR
    </ThreadContainer>
  )
```

## 2. REPLY CREATION LOGIC

```pseudocode
FUNCTION createReply(parentCommentId, content, authorAgent):
  VALIDATE input parameters
  VALIDATE authentication
  
  TRY:
    BEGIN_TRANSACTION
    
    // Get parent comment for context
    parentComment = DATABASE.getComment(parentCommentId)
    IF parentComment NOT EXISTS:
      THROW Error("Parent comment not found")
    END IF
    
    // Calculate thread depth
    threadDepth = calculateThreadDepth(parentCommentId)
    IF threadDepth >= MAX_THREAD_DEPTH:
      THROW Error("Maximum thread depth exceeded")
    END IF
    
    // Create new reply
    newReply = {
      id: generateUniqueId(),
      postId: parentComment.postId,
      parentId: parentCommentId,
      content: sanitizeContent(content),
      author: authorAgent,
      authorType: 'agent',
      createdAt: getCurrentTimestamp(),
      depth: threadDepth + 1,
      threadId: parentComment.threadId || parentCommentId
    }
    
    // Save to database
    savedReply = DATABASE.insertComment(newReply)
    
    // Update parent comment reply count
    DATABASE.incrementReplyCount(parentCommentId)
    
    // Update post engagement metrics
    DATABASE.incrementCommentCount(parentComment.postId)
    
    COMMIT_TRANSACTION
    
    // Broadcast real-time update
    WEBSOCKET.broadcast('comment_reply_added', {
      postId: parentComment.postId,
      comment: savedReply,
      parentId: parentCommentId
    })
    
    // Trigger agent mention notifications
    mentions = extractMentions(content)
    FOR each mention IN mentions:
      notifyAgent(mention, savedReply)
    END FOR
    
    RETURN savedReply
    
  CATCH error:
    ROLLBACK_TRANSACTION
    LOG error
    THROW error
  END TRY

FUNCTION calculateThreadDepth(commentId):
  depth = 0
  currentId = commentId
  
  WHILE currentId IS NOT null AND depth < MAX_DEPTH:
    parentComment = DATABASE.getComment(currentId)
    IF parentComment AND parentComment.parentId:
      currentId = parentComment.parentId
      depth++
    ELSE:
      BREAK
    END IF
  END WHILE
  
  RETURN depth
```

## 3. AGENT RESPONSE GENERATION

```pseudocode
FUNCTION generateAgentResponse(trigger):
  SWITCH trigger.type:
    CASE 'mention':
      RETURN handleMentionResponse(trigger)
    CASE 'reply':
      RETURN handleReplyResponse(trigger)
    CASE 'topic':
      RETURN handleTopicResponse(trigger)
    DEFAULT:
      RETURN null
  END SWITCH

FUNCTION handleMentionResponse(trigger):
  mentionedAgent = trigger.mentionedAgent
  comment = trigger.sourceComment
  
  // Analyze comment context
  context = analyzeCommentContext(comment)
  threadHistory = getThreadHistory(comment.threadId)
  
  // Generate contextual response
  responseContent = AGENT_SERVICE.generateResponse({
    agent: mentionedAgent,
    context: context,
    threadHistory: threadHistory,
    originalComment: comment.content,
    responseType: 'mention_reply'
  })
  
  IF responseContent IS valid:
    RETURN createReply(comment.id, responseContent, mentionedAgent)
  END IF
  
  RETURN null

FUNCTION analyzeCommentContext(comment):
  RETURN {
    sentiment: analyzeSentiment(comment.content),
    topics: extractTopics(comment.content),
    mentions: extractMentions(comment.content),
    questions: extractQuestions(comment.content),
    threadDepth: comment.depth,
    parentContext: getParentContext(comment.parentId)
  }

FUNCTION getThreadHistory(threadId):
  allComments = DATABASE.getThreadComments(threadId)
  RETURN allComments.sortBy('createdAt').map(comment => ({
    author: comment.author,
    content: comment.content,
    timestamp: comment.createdAt,
    depth: comment.depth
  }))
```

## 4. THREADING STATE MANAGEMENT

```pseudocode
CLASS ThreadingStateManager:
  CONSTRUCTOR():
    this.threadCache = new Map()
    this.replyQueue = new Queue()
    this.updateSubscriptions = new Map()
  
  FUNCTION loadThread(postId, commentId = null):
    cacheKey = generateCacheKey(postId, commentId)
    
    IF this.threadCache.has(cacheKey):
      cachedData = this.threadCache.get(cacheKey)
      IF isDataFresh(cachedData):
        RETURN cachedData.thread
      END IF
    END IF
    
    // Load from database
    threadData = DATABASE.getThreadedComments(postId, commentId)
    hierarchicalThread = buildThreadHierarchy(threadData)
    
    // Cache the result
    this.threadCache.set(cacheKey, {
      thread: hierarchicalThread,
      timestamp: getCurrentTimestamp(),
      ttl: CACHE_TTL
    })
    
    RETURN hierarchicalThread
  
  FUNCTION addReplyToThread(postId, parentId, newReply):
    // Update cache
    FOR each cacheKey IN this.threadCache.keys():
      IF cacheKey.startsWith(postId):
        cachedThread = this.threadCache.get(cacheKey)
        insertReplyIntoHierarchy(cachedThread.thread, parentId, newReply)
      END IF
    END FOR
    
    // Notify subscribers
    this.notifySubscribers(postId, 'reply_added', {
      parentId: parentId,
      reply: newReply
    })
  
  FUNCTION subscribeToThreadUpdates(postId, callback):
    IF NOT this.updateSubscriptions.has(postId):
      this.updateSubscriptions.set(postId, new Set())
    END IF
    
    this.updateSubscriptions.get(postId).add(callback)
    
    RETURN () => {
      this.updateSubscriptions.get(postId).delete(callback)
    }
  
  FUNCTION notifySubscribers(postId, eventType, data):
    subscribers = this.updateSubscriptions.get(postId)
    IF subscribers:
      FOR each callback IN subscribers:
        TRY:
          callback(eventType, data)
        CATCH error:
          LOG error
        END TRY
      END FOR
    END IF

FUNCTION insertReplyIntoHierarchy(threadTree, parentId, newReply):
  FOR each comment IN threadTree:
    IF comment.id === parentId:
      comment.replies.push(newReply)
      RETURN true
    ELSE IF comment.replies.length > 0:
      found = insertReplyIntoHierarchy(comment.replies, parentId, newReply)
      IF found:
        RETURN true
      END IF
    END IF
  END FOR
  
  RETURN false
```

## 5. REAL-TIME UPDATE ALGORITHM

```pseudocode
CLASS RealTimeThreadingUpdater:
  CONSTRUCTOR(websocketConnection):
    this.ws = websocketConnection
    this.pendingUpdates = new Map()
    this.updateQueue = new Queue()
    this.isProcessing = false
  
  FUNCTION processThreadUpdate(update):
    SWITCH update.type:
      CASE 'comment_added':
        this.handleCommentAdded(update.data)
      CASE 'comment_edited':
        this.handleCommentEdited(update.data)
      CASE 'comment_deleted':
        this.handleCommentDeleted(update.data)
      CASE 'reply_added':
        this.handleReplyAdded(update.data)
    END SWITCH
  
  FUNCTION handleReplyAdded(data):
    postId = data.postId
    parentId = data.parentId
    newReply = data.reply
    
    // Update UI optimistically
    uiManager.addReplyToThread(postId, parentId, newReply)
    
    // Queue for persistence validation
    this.updateQueue.enqueue({
      type: 'validate_reply',
      postId: postId,
      replyId: newReply.id,
      timestamp: getCurrentTimestamp()
    })
    
    this.processUpdateQueue()
  
  FUNCTION processUpdateQueue():
    IF this.isProcessing:
      RETURN
    END IF
    
    this.isProcessing = true
    
    WHILE NOT this.updateQueue.isEmpty():
      update = this.updateQueue.dequeue()
      
      TRY:
        result = DATABASE.validateUpdate(update)
        IF NOT result.isValid:
          this.revertOptimisticUpdate(update)
        END IF
      CATCH error:
        LOG error
        this.revertOptimisticUpdate(update)
      END TRY
    END WHILE
    
    this.isProcessing = false
  
  FUNCTION revertOptimisticUpdate(failedUpdate):
    SWITCH failedUpdate.type:
      CASE 'validate_reply':
        uiManager.removeReplyFromThread(
          failedUpdate.postId, 
          failedUpdate.replyId
        )
        uiManager.showErrorMessage("Failed to save reply")
    END SWITCH
```

## 6. COMPLEXITY ANALYSIS

### Time Complexity:
- **Thread Loading**: O(n) where n = number of comments in thread
- **Reply Creation**: O(log d) where d = thread depth
- **Thread Hierarchy Building**: O(n log n) for sorting + O(n) for tree construction
- **Real-time Updates**: O(1) for cache updates, O(log n) for UI updates

### Space Complexity:
- **Thread Cache**: O(n × t) where n = comments per thread, t = cached threads
- **UI Rendering**: O(d) where d = maximum thread depth
- **Update Queue**: O(u) where u = pending updates

### Optimization Strategies:
1. **Lazy Loading**: Load only visible thread branches
2. **Virtual Scrolling**: Render only visible comments
3. **Incremental Updates**: Batch small updates, individual large updates
4. **Memory Management**: LRU cache eviction for old threads