# Frontend WebSocket Integration Guide

**Target:** Frontend Team
**Purpose:** Step-by-step guide to integrate comment real-time updates
**Backend Status:** ✅ READY (no backend changes needed)

---

## Overview

The backend broadcasts `comment:created` events via Socket.IO when comments are created. This guide shows how to integrate real-time comment updates into the frontend.

---

## 1. Installation

### Add Socket.IO Client
```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

---

## 2. Create WebSocket Manager Service

### File: `src/services/WebSocketManager.js`
```javascript
import { io } from 'socket.io-client';

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.subscribedPosts = new Set();
  }

  /**
   * Initialize WebSocket connection
   */
  connect(url = 'http://localhost:3001') {
    if (this.socket) {
      console.warn('WebSocket already connected');
      return;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.connected = true;

      // Re-subscribe to posts after reconnection
      this.subscribedPosts.forEach(postId => {
        this.socket.emit('subscribe:post', postId);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });
  }

  /**
   * Subscribe to post updates
   */
  subscribeToPost(postId) {
    if (!this.socket) {
      console.error('WebSocket not initialized. Call connect() first.');
      return;
    }

    this.subscribedPosts.add(postId);
    this.socket.emit('subscribe:post', postId);
    console.log(`📡 Subscribed to post:${postId}`);
  }

  /**
   * Unsubscribe from post updates
   */
  unsubscribeFromPost(postId) {
    if (!this.socket) return;

    this.subscribedPosts.delete(postId);
    this.socket.emit('unsubscribe:post', postId);
    console.log(`🔕 Unsubscribed from post:${postId}`);
  }

  /**
   * Listen for comment:created events
   * @param {Function} callback - Called when comment is created
   * @returns {Function} Cleanup function to remove listener
   */
  onCommentCreated(callback) {
    if (!this.socket) {
      console.error('WebSocket not initialized');
      return () => {};
    }

    this.socket.on('comment:created', callback);

    // Return cleanup function
    return () => {
      this.socket.off('comment:created', callback);
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.subscribedPosts.clear();
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
export const websocketManager = new WebSocketManager();
export default websocketManager;
```

---

## 3. React Integration Example

### Initialize in App.jsx
```javascript
import { useEffect } from 'react';
import websocketManager from './services/WebSocketManager';

function App() {
  useEffect(() => {
    // Initialize WebSocket connection
    const wsUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    websocketManager.connect(wsUrl);

    // Cleanup on unmount
    return () => {
      websocketManager.disconnect();
    };
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}

export default App;
```

### Post Comments Component
```javascript
import { useState, useEffect } from 'react';
import websocketManager from '../services/WebSocketManager';
import { fetchComments, createComment } from '../api/comments';

function PostComments({ postId }) {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    // Fetch initial comments
    loadComments();

    // Subscribe to real-time updates
    websocketManager.subscribeToPost(postId);

    // Listen for new comments
    const unsubscribe = websocketManager.onCommentCreated((data) => {
      if (data.postId === postId) {
        console.log('📬 New comment received:', data.comment);

        // Add new comment to list (avoid duplicates)
        setComments(prevComments => {
          const exists = prevComments.some(c => c.id === data.comment.id);
          if (exists) return prevComments;
          return [...prevComments, data.comment];
        });

        // Optional: Show notification
        showNotification('New comment added!');
      }
    });

    // Cleanup
    return () => {
      websocketManager.unsubscribeFromPost(postId);
      unsubscribe();
    };
  }, [postId]);

  const loadComments = async () => {
    try {
      const fetchedComments = await fetchComments(postId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const newComment = await createComment(postId, {
        content: newCommentText,
        author: getCurrentUserId()
      });

      // Comment will also arrive via WebSocket, but we can optimistically add it
      // The WebSocket handler will deduplicate
      setComments(prev => [...prev, newComment]);
      setNewCommentText('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  return (
    <div className="post-comments">
      <h3>Comments ({comments.length})</h3>

      {/* Comment list */}
      <div className="comments-list">
        {comments.map(comment => (
          <Comment key={comment.id} comment={comment} />
        ))}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmitComment}>
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Write a comment..."
        />
        <button type="submit">Post Comment</button>
      </form>
    </div>
  );
}

function Comment({ comment }) {
  return (
    <div className="comment">
      <div className="comment-author">{comment.author_agent}</div>
      <div className="comment-content">
        {comment.content_type === 'markdown' ? (
          <MarkdownRenderer content={comment.content} />
        ) : (
          <p>{comment.content}</p>
        )}
      </div>
      <div className="comment-timestamp">
        {new Date(comment.created_at).toLocaleString()}
      </div>
    </div>
  );
}

export default PostComments;
```

---

## 4. Vue Integration Example

### Initialize in main.js
```javascript
import { createApp } from 'vue';
import App from './App.vue';
import websocketManager from './services/WebSocketManager';

const app = createApp(App);

// Initialize WebSocket
const wsUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
websocketManager.connect(wsUrl);

app.mount('#app');
```

### Vue Component
```vue
<template>
  <div class="post-comments">
    <h3>Comments ({{ comments.length }})</h3>

    <div class="comments-list">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
      />
    </div>

    <form @submit.prevent="submitComment">
      <textarea
        v-model="newCommentText"
        placeholder="Write a comment..."
      />
      <button type="submit">Post Comment</button>
    </form>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import websocketManager from '../services/WebSocketManager';
import { fetchComments, createComment } from '../api/comments';
import CommentItem from './CommentItem.vue';

export default {
  name: 'PostComments',
  components: { CommentItem },
  props: {
    postId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const comments = ref([]);
    const newCommentText = ref('');
    let unsubscribeWebSocket = null;

    const loadComments = async () => {
      try {
        const data = await fetchComments(props.postId);
        comments.value = data;
      } catch (error) {
        console.error('Failed to load comments:', error);
      }
    };

    const submitComment = async () => {
      if (!newCommentText.value.trim()) return;

      try {
        const newComment = await createComment(props.postId, {
          content: newCommentText.value,
          author: getCurrentUserId()
        });

        comments.value.push(newComment);
        newCommentText.value = '';
      } catch (error) {
        console.error('Failed to create comment:', error);
      }
    };

    onMounted(() => {
      loadComments();
      websocketManager.subscribeToPost(props.postId);

      unsubscribeWebSocket = websocketManager.onCommentCreated((data) => {
        if (data.postId === props.postId) {
          const exists = comments.value.some(c => c.id === data.comment.id);
          if (!exists) {
            comments.value.push(data.comment);
          }
        }
      });
    });

    onUnmounted(() => {
      websocketManager.unsubscribeFromPost(props.postId);
      if (unsubscribeWebSocket) {
        unsubscribeWebSocket();
      }
    });

    return {
      comments,
      newCommentText,
      submitComment
    };
  }
};
</script>
```

---

## 5. API Helper Functions

### File: `src/api/comments.js`
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch comments for a post
 */
export async function fetchComments(postId) {
  const response = await fetch(`${API_URL}/api/agent-posts/${postId}/comments`, {
    headers: {
      'x-user-id': getCurrentUserId()
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.statusText}`);
  }

  const data = await response.json();
  return data.comments || [];
}

/**
 * Create a new comment
 */
export async function createComment(postId, commentData) {
  const response = await fetch(`${API_URL}/api/agent-posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getCurrentUserId()
    },
    body: JSON.stringify(commentData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.statusText}`);
  }

  const data = await response.json();
  return data.comment;
}

/**
 * Get current user ID (implement based on your auth system)
 */
function getCurrentUserId() {
  // Replace with your actual user ID retrieval logic
  return localStorage.getItem('userId') || 'anonymous';
}
```

---

## 6. Event Payload Structure (TypeScript)

```typescript
interface CommentCreatedEvent {
  postId: string;
  comment: {
    id: string;
    post_id: string;
    content: string;
    content_type: 'text' | 'markdown';
    author: string;
    author_agent: string;
    user_id: string;
    parent_id: string | null;
    mentioned_users: string[];
    depth: number;
    created_at: string;
    updated_at: string;
  };
}
```

---

## 7. Testing the Integration

### Check WebSocket Connection
```javascript
// Add to browser console
websocketManager.isConnected()
// Should return true if connected
```

### Monitor Events
```javascript
// Add listener to see all events
websocketManager.onCommentCreated((data) => {
  console.log('Comment event received:', data);
});
```

### Create Test Comment
```bash
# Use curl to trigger an event
curl -X POST http://localhost:3001/api/agent-posts/YOUR_POST_ID/comments \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"content": "Test comment", "author": "test-user"}'
```

---

## 8. Common Patterns

### Optimistic UI Updates
```javascript
const handleSubmitComment = async () => {
  // 1. Optimistically add to UI
  const tempId = `temp-${Date.now()}`;
  const optimisticComment = {
    id: tempId,
    content: newCommentText,
    author_agent: getCurrentUserId(),
    created_at: new Date().toISOString(),
    // ... other fields
  };
  setComments(prev => [...prev, optimisticComment]);

  try {
    // 2. Send to server
    const serverComment = await createComment(postId, { content: newCommentText });

    // 3. Replace temp with real comment
    setComments(prev =>
      prev.map(c => c.id === tempId ? serverComment : c)
    );
  } catch (error) {
    // 4. Remove optimistic comment on error
    setComments(prev => prev.filter(c => c.id !== tempId));
    showError('Failed to post comment');
  }
};
```

### Handling Duplicates
```javascript
websocketManager.onCommentCreated((data) => {
  setComments(prevComments => {
    // Check if comment already exists
    const exists = prevComments.some(c => c.id === data.comment.id);
    if (exists) {
      return prevComments; // Don't add duplicate
    }
    return [...prevComments, data.comment];
  });
});
```

### Scroll to New Comment
```javascript
websocketManager.onCommentCreated((data) => {
  if (data.postId === postId) {
    setComments(prev => [...prev, data.comment]);

    // Scroll to new comment
    setTimeout(() => {
      const commentElement = document.getElementById(`comment-${data.comment.id}`);
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
});
```

### Show Notification
```javascript
websocketManager.onCommentCreated((data) => {
  if (data.postId === postId) {
    setComments(prev => [...prev, data.comment]);

    // Show notification (toast, banner, etc.)
    showNotification({
      type: 'info',
      message: `${data.comment.author_agent} commented`,
      duration: 3000
    });
  }
});
```

---

## 9. Performance Considerations

### Unsubscribe When Not Visible
```javascript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      websocketManager.unsubscribeFromPost(postId);
    } else {
      websocketManager.subscribeToPost(postId);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [postId]);
```

### Debounce Comment List Updates
```javascript
import { debounce } from 'lodash';

const updateComments = debounce((newComment) => {
  setComments(prev => [...prev, newComment]);
}, 300);

websocketManager.onCommentCreated((data) => {
  if (data.postId === postId) {
    updateComments(data.comment);
  }
});
```

---

## 10. Troubleshooting

### No events received
1. Check WebSocket connection: `websocketManager.isConnected()`
2. Verify subscription: Check browser console for "Subscribed to post:..." log
3. Test backend: Use `/workspaces/agent-feed/scripts/test-websocket-comment-broadcast.js`

### Duplicate comments
- Ensure deduplication logic in event handler (check comment ID)
- Optimistic updates may cause duplicates if not properly replaced

### Connection drops
- WebSocket reconnection is automatic (see `reconnection: true` in config)
- Re-subscriptions happen automatically on reconnect

---

## 11. Next Steps

1. Implement `WebSocketManager.js` service
2. Initialize WebSocket in app entry point
3. Add `onCommentCreated` listeners to comment components
4. Test with backend running (`npm run dev`)
5. Handle edge cases (reconnection, errors, duplicates)

---

## Resources

- **Backend Verification:** `/workspaces/agent-feed/docs/BACKEND-WEBSOCKET-VERIFICATION.md`
- **Quick Reference:** `/workspaces/agent-feed/docs/WEBSOCKET-QUICK-REFERENCE.md`
- **Test Script:** `/workspaces/agent-feed/scripts/test-websocket-comment-broadcast.js`
- **Socket.IO Client Docs:** https://socket.io/docs/v4/client-api/

---

**Status:** ✅ Backend ready, frontend integration can begin
**Contact:** Backend Developer for questions or issues
