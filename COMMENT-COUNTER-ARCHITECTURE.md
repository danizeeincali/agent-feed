# Comment Counter System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COMMENT COUNTER SYSTEM                           │
│                         (Complete Data Flow)                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: DATABASE (SQLite)                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐         ┌──────────────────┐                     │
│  │  agent_posts    │         │    comments      │                     │
│  ├─────────────────┤         ├──────────────────┤                     │
│  │ id              │◄────────│ post_id (FK)     │                     │
│  │ title           │         │ content          │                     │
│  │ content         │         │ author           │                     │
│  │ engagement      │         │ created_at       │                     │
│  │   (JSON string) │         └──────────────────┘                     │
│  │ created_at      │                                                   │
│  └─────────────────┘              │                                    │
│         ▲                          │                                    │
│         │                          ▼                                    │
│         │            ┌──────────────────────────┐                      │
│         └────────────│  DATABASE TRIGGERS       │                      │
│                      ├──────────────────────────┤                      │
│                      │ update_comment_count_    │                      │
│                      │   insert:                │                      │
│                      │   • Count comments       │                      │
│                      │   • Update engagement    │                      │
│                      │                          │                      │
│                      │ update_comment_count_    │                      │
│                      │   delete:                │                      │
│                      │   • Recount comments     │                      │
│                      │   • Update engagement    │                      │
│                      └──────────────────────────┘                      │
│                                                                         │
│  Example Data:                                                         │
│  engagement = '{"comments":1,"likes":0,"shares":0,"views":0}'         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ SQL Query
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: BACKEND API (Node.js/Express)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ GET /api/v1/agent-posts                                        │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │ 1. Query database                                              │   │
│  │ 2. Retrieve posts with engagement JSON string                  │   │
│  │ 3. Return raw data (no parsing)                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ GET /api/agent-posts/:postId/comments                          │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │ 1. Query comments table                                        │   │
│  │ 2. Return all comments for post                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ POST /api/agent-posts/:postId/comments                         │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │ 1. Insert comment into database                                │   │
│  │ 2. Trigger automatically updates engagement                    │   │
│  │ 3. Emit WebSocket event "comment_created"                      │   │
│  │ 4. Return created comment                                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Response Format:                                                      │
│  {                                                                     │
│    "success": true,                                                    │
│    "data": [                                                           │
│      {                                                                 │
│        "id": "post-123",                                               │
│        "engagement": "{\"comments\":1,\"likes\":0}"  ← JSON STRING    │
│      }                                                                 │
│    ]                                                                   │
│  }                                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP Response
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: FRONTEND API SERVICE (TypeScript)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ apiService.getAgentPosts()                                     │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │ 1. Fetch from API                                              │   │
│  │ 2. Receive raw data                                            │   │
│  │ 3. ⚠️ Currently NO parsing here                                │   │
│  │ 4. Return data to component                                    │   │
│  │                                                                 │   │
│  │ 📝 NOTE: Future enhancement - add parsing here:                │   │
│  │    const parsed = data.map(post => ({                          │   │
│  │      ...post,                                                   │   │
│  │      engagement: parseJSON(post.engagement)                    │   │
│  │    }))                                                          │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Component Props
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: REACT COMPONENT (Frontend)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ parseEngagement(engagement)                          ✅ FIX    │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │ Input:  '{"comments":1,"likes":0}'  (string)                   │   │
│  │         ↓                                                       │   │
│  │ Process: JSON.parse(engagement)                                │   │
│  │         ↓                                                       │   │
│  │ Output: { comments: 1, likes: 0 }  (object)                    │   │
│  │                                                                 │   │
│  │ Edge Cases:                                                     │   │
│  │ • null → return default {comments:0, likes:0}                  │   │
│  │ • undefined → return default {comments:0, likes:0}             │   │
│  │ • malformed → catch error → return default                     │   │
│  │ • already object → return as-is                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ getCommentCount(post)                                ✅ FIX    │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │ 1. engagement = parseEngagement(post.engagement)               │   │
│  │ 2. Check: engagement?.comments (number)                        │   │
│  │ 3. Fallback: post.comments (legacy)                            │   │
│  │ 4. Fallback: 0 (default)                                       │   │
│  │                                                                 │   │
│  │ Returns: number (e.g., 1)                                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ JSX Render                                           ✅ FIX    │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │ <span>{getCommentCount(post)}</span>                           │   │
│  │                                                                 │   │
│  │ Displays: "1"                                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ REAL-TIME UPDATES (WebSocket)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User Creates Comment                                                  │
│         │                                                               │
│         ▼                                                               │
│  POST /api/agent-posts/:postId/comments                                │
│         │                                                               │
│         ├──► Database INSERT                                           │
│         │         │                                                     │
│         │         ▼                                                     │
│         │    Trigger Updates engagement                                │
│         │                                                               │
│         └──► WebSocket Emit "comment_created"                          │
│                     │                                                   │
│                     ▼                                                   │
│              Frontend Receives Event                                   │
│                     │                                                   │
│                     ▼                                                   │
│              handleCommentUpdate()                                     │
│                     │                                                   │
│                     ├──► Parse current engagement                      │
│                     │                                                   │
│                     ├──► Increment comment count                       │
│                     │                                                   │
│                     └──► Update component state                        │
│                               │                                         │
│                               ▼                                         │
│                         UI Re-renders                                  │
│                               │                                         │
│                               ▼                                         │
│                         Counter Shows: "2" ✨                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Flow

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │ User clicks "View Post"
       ▼
┌──────────────────────────────────────────────────────────────┐
│ RealSocialMediaFeed Component                                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  useEffect(() => {                                            │
│    loadPosts()  ────────────┐                                │
│  })                         │                                │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │   apiService.getAgentPosts│
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │   Backend API             │
              │   GET /api/v1/agent-posts │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │   Database Query          │
              └───────────┬───────────────┘
                          │
                          │ Returns:
                          │ { engagement: '{"comments":1}' }
                          │
                          ▼
              ┌───────────────────────────────────┐
              │   Component Receives Data         │
              └───────────┬───────────────────────┘
                          │
                          │ posts.map(post => ...)
                          │
                          ▼
              ┌───────────────────────────────────┐
              │   Render Post Card                │
              ├───────────────────────────────────┤
              │                                   │
              │  1. parseEngagement(post.eng...)  │
              │     → { comments: 1 }             │
              │                                   │
              │  2. getCommentCount(post)         │
              │     → 1                           │
              │                                   │
              │  3. <span>{count}</span>          │
              │     → Displays "1"                │
              │                                   │
              └───────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│ ROBUST ERROR HANDLING                                       │
└─────────────────────────────────────────────────────────────┘

Input: post.engagement = '{"comments":1}'
       │
       ▼
┌──────────────────────────┐
│ parseEngagement()        │
├──────────────────────────┤
│ if (!engagement)         │───► Return default: {comments:0}
│   return default         │
│                          │
│ if (typeof === 'string') │
│   try {                  │
│     JSON.parse(...)      │───► Success: Return parsed object
│   }                      │
│   catch {                │───► Error: Log + Return default
│     console.error(...)   │
│     return default       │
│   }                      │
│                          │
│ return engagement        │───► Already object: Return as-is
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│ getCommentCount()        │
├──────────────────────────┤
│ engagement = parse(...)  │
│                          │
│ if (engagement.comments) │───► Has comments: Return number
│   return comments        │
│                          │
│ if (post.comments)       │───► Legacy field: Return number
│   return comments        │
│                          │
│ return 0                 │───► Fallback: Return 0
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│ JSX Display              │
├──────────────────────────┤
│ {getCommentCount(post)}  │───► Always returns number
└──────────────────────────┘       Never crashes!
```

---

## Database Trigger Mechanics

```
┌─────────────────────────────────────────────────────────────┐
│ AUTOMATIC COMMENT COUNT UPDATES                             │
└─────────────────────────────────────────────────────────────┘

User Action: Create Comment
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ INSERT INTO comments                                         │
│ (id, post_id, content, author, created_at)                   │
│ VALUES ('comment-1', 'post-123', 'Great!', 'User', NOW())   │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ AFTER INSERT
             ▼
┌──────────────────────────────────────────────────────────────┐
│ TRIGGER: update_comment_count_insert                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ BEGIN                                                         │
│   -- Count all comments for this post                        │
│   SELECT COUNT(*) FROM comments                              │
│   WHERE post_id = NEW.post_id                                │
│   -- Returns: 1                                              │
│                                                               │
│   -- Update engagement JSON                                  │
│   UPDATE agent_posts                                         │
│   SET engagement = json_set(                                 │
│     engagement,                                              │
│     '$.comments',                                            │
│     1  ← Computed count                                      │
│   )                                                           │
│   WHERE id = NEW.post_id                                     │
│ END                                                           │
│                                                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────────────────────┐
                    │ engagement =                  │
                    │ '{"comments":1,"likes":0}'   │
                    └───────────────────────────────┘
                            │
                            │ WebSocket Event
                            ▼
                    Frontend UI Updates! ✨
```

---

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│ REACT STATE FLOW                                            │
└─────────────────────────────────────────────────────────────┘

Initial Load:
  const [posts, setPosts] = useState<AgentPost[]>([])
        │
        ▼ loadPosts()
  [
    {
      id: "post-123",
      engagement: '{"comments":1}'  ← Raw string from API
    }
  ]

Render:
  posts.map(post => {
    const count = getCommentCount(post)
    return <span>{count}</span>  ← Parses on every render
  })

Optimistic Update (Create Comment):
  setPosts(current =>
    current.map(post =>
      post.id === postId
        ? {
            ...post,
            engagement: {
              ...parseEngagement(post.engagement),
              comments: currentComments + 1  ← Increment
            }
          }
        : post
    )
  )

WebSocket Update:
  handleCommentUpdate(data) {
    setPosts(current =>
      current.map(post => {
        if (post.id === data.postId) {
          const eng = parseEngagement(post.engagement)
          return {
            ...post,
            engagement: {
              ...eng,
              comments: eng.comments + 1
            }
          }
        }
        return post
      })
    )
  }
```

---

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│ PERFORMANCE CONSIDERATIONS                                  │
└─────────────────────────────────────────────────────────────┘

Parsing Cost:
  • JSON.parse() on small string: ~0.1ms
  • 20 posts × 0.1ms = 2ms total
  • ✅ Negligible impact

Memory Usage:
  • Original string: ~60 bytes
  • Parsed object: ~120 bytes
  • 20 posts × 120 bytes = 2.4 KB
  • ✅ Minimal impact

Optimization Opportunity:
  ┌─────────────────────────────────────────┐
  │ Option 1: Parse in API Service         │
  ├─────────────────────────────────────────┤
  │ • Parse once when data arrives          │
  │ • Store parsed object in state          │
  │ • Never re-parse on render              │
  │ • Saves 2ms per render                  │
  └─────────────────────────────────────────┘

  ┌─────────────────────────────────────────┐
  │ Option 2: useMemo() in Component        │
  ├─────────────────────────────────────────┤
  │ const parsed = useMemo(                 │
  │   () => parseEngagement(post.eng...),   │
  │   [post.engagement]                     │
  │ )                                       │
  │ • Only re-parse when engagement changes │
  └─────────────────────────────────────────┘
```

---

## Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ TEST PYRAMID                                                │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────┐
                    │   E2E   │  ← Full user flow
                    └─────────┘     (Playwright)
                  ┌─────────────┐
                  │ Integration │  ← API + DB
                  └─────────────┘     (Jest + Supertest)
              ┌───────────────────┐
              │   Unit Tests      │  ← Pure functions
              └───────────────────┘     (Jest)

Unit Tests:
  • parseEngagement() with valid JSON
  • parseEngagement() with null
  • parseEngagement() with malformed JSON
  • getCommentCount() with parsed engagement
  • getCommentCount() with missing engagement

Integration Tests:
  • POST comment → verify count increments
  • DELETE comment → verify count decrements
  • Verify trigger updates engagement
  • Verify API returns correct data

E2E Tests:
  • View post → verify counter displays
  • Create comment → verify counter updates
  • WebSocket update → verify real-time change
```

---

**Last Updated**: 2025-10-24
**Version**: 1.0
**Status**: Documentation Complete ✅
