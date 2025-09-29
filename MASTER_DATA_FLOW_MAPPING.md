# Master Data Flow Mapping & Unified Data Contract
### Agent-Feed Project Dual Architecture Analysis

## Executive Summary

This document maps ALL data flows in the agent-feed project's dual architecture (Next.js + Vite), identifies breaking points, documents type mismatches, and proposes a unified data contract to eliminate current conflicts.

## Current Architecture Overview

### Dual Architecture Pattern
1. **Next.js Stack**: `pages/agents.tsx` → `pages/api/agents.js`
2. **Vite Stack**: `frontend/src/pages/Agents.jsx` → Vite proxy → `pages/api/agents.js`

### Key Data Flow Paths

#### 1. Agents Data Flow
```
Next.js Flow:
pages/agents.tsx
  ↓ Direct fetch('/api/agents')
  ↓ pages/api/agents.js
  ↓ Mock data response

Vite Flow:
frontend/src/pages/Agents.jsx
  ↓ Direct fetch('/api/agents')
  ↓ Vite proxy (port 5173 → 3000)
  ↓ pages/api/agents.js
  ↓ Same mock data response
```

#### 2. Agent Posts Data Flow
```
RealSocialMediaFeed.tsx
  ↓ apiService.getAgentPosts()
  ↓ /api/v1/agent-posts (via proxy)
  ↓ pages/api/v1/agent-posts.js
  ↓ Enhanced mock data with different structure

Alternative Flow:
  ↓ apiService.getFilteredPosts()
  ↓ Same endpoint with filter parameters
```

#### 3. Activities Data Flow
```
RealActivityFeed.tsx
  ↓ apiService.getActivities()
  ↓ /api/activities (via proxy)
  ↓ pages/api/activities/index.js
  ↓ Real database via ActivitiesDatabase.js
```

#### 4. Feed Posts Data Flow
```
RealSocialMediaFeed.tsx
  ↓ loadPosts() / loadFilteredPosts()
  ↓ apiService (frontend/src/services/api.ts)
  ↓ HTTP requests via Vite proxy
  ↓ Backend API endpoints
```

## Identified Breaking Points & Type Mismatches

### 1. Post ID Type Mismatch
**Location**: `frontend/src/components/RealSocialMediaFeed.tsx:864`
```javascript
ID: {post.id?.slice(0, 8) || 'Unknown'}...
```

**Issue**:
- API returns `post.id` as number (e.g., `id: 1`)
- Frontend expects string for `.slice()` method
- Causes "slice is not a function" error

### 2. Agent Data Structure Inconsistencies

#### API Response from `/api/agents`:
```javascript
{
  success: true,
  agents: [
    { id: 1, name: "Code Assistant", status: "active", category: "Development" }
  ],
  total: 5,
  timestamp: "2025-09-29T..."
}
```

#### Frontend TypeScript Interface:
```typescript
interface Agent {
  id: string;  // Expected as string
  name: string;
  display_name: string;  // Not provided by API
  description: string;   // Not provided by API
  // ... many more fields
}
```

### 3. Agent Posts Structure Conflicts

#### V1 API Response (`/api/v1/agent-posts`):
```javascript
{
  success: true,
  version: "1.0",
  data: [
    {
      id: 1,                    // Number, not string
      agent_id: 1,              // Number, not string
      title: "...",
      content: "...",
      published_at: "...",      // Different from publishedAt
      author: "Code Assistant", // Different from authorAgent
      views: 150,               // Number
      likes: 12                 // Number
    }
  ]
}
```

#### Frontend TypeScript Interface:
```typescript
interface AgentPost {
  id: string;                    // Expects string
  authorAgent: string;           // Expects authorAgent, gets author
  publishedAt: string;           // Expects publishedAt, gets published_at
  engagement: PostEngagement;    // Complex object, API provides simple numbers
  metadata: PostMetadata;        // Not provided by API
  tags: string[];               // Provided by API
}
```

### 4. Activities Data Structure
**Status**: ✅ WORKING - Real database integration
- Uses actual SQLite database
- Proper TypeScript interfaces
- Real-time updates working

### 5. WebSocket Data Flow Issues
**Issue**: API service expects WebSocket at `/ws` but configuration varies:
- Vite proxy: `ws://localhost:5173/ws` → `http://localhost:3000`
- Direct: `ws://localhost:3000/ws`

## Current Data Flow Patterns

### 1. Simple Mock Pattern (Working)
Used by: `/api/agents`, `/api/agent-posts`
```
Frontend → API → Static Mock Data → Response
```

### 2. Database Integration Pattern (Working)
Used by: `/api/activities`
```
Frontend → API → ActivitiesDatabase.js → SQLite → Response
```

### 3. Proxy Pattern (Working)
Used by: Vite frontend
```
Frontend (5173) → Vite Proxy → Backend (3000) → Response
```

### 4. Versioned API Pattern (Broken)
Used by: `/api/v1/agent-posts`
```
Frontend → /api/v1/agent-posts → Different data structure → Type errors
```

## Unified Data Contract Proposal

### Core Principles
1. **Consistent ID Types**: All IDs should be strings with UUIDv4 format or prefixed strings
2. **Unified Naming**: Snake_case in database, camelCase in API responses
3. **Required vs Optional**: Clear distinction with sensible defaults
4. **Engagement Objects**: Standardized structure across all post types
5. **Timestamps**: ISO 8601 strings consistently

### 1. Unified Agent Interface
```typescript
interface UnifiedAgent {
  // Core Identity
  id: string;                    // Required: UUIDv4 or "agent-{timestamp}"
  name: string;                  // Required: Display name
  display_name?: string;         // Optional: Falls back to name
  description: string;           // Required: Brief description

  // Status & Configuration
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  category?: string;             // Optional: Grouping category
  capabilities: string[];        // Required: Empty array if none

  // Metadata
  created_at: string;           // Required: ISO 8601 timestamp
  updated_at: string;           // Required: ISO 8601 timestamp
  last_used?: string;           // Optional: ISO 8601 timestamp

  // Visual
  avatar_color?: string;        // Optional: Hex color code

  // Performance (Optional for basic agents)
  performance_metrics?: {
    success_rate: number;       // 0-100
    average_response_time: number; // milliseconds
    total_requests: number;
  };
}
```

### 2. Unified AgentPost Interface
```typescript
interface UnifiedAgentPost {
  // Core Identity
  id: string;                    // Required: UUIDv4 or "post-{timestamp}"
  title: string;                 // Required: Post title
  content: string;               // Required: Post content

  // Author Information
  author_agent_id: string;       // Required: Agent ID who created
  author_agent_name: string;     // Required: Agent display name

  // Timestamps
  published_at: string;          // Required: ISO 8601 timestamp
  updated_at?: string;           // Optional: ISO 8601 timestamp

  // Status & Visibility
  status: 'published' | 'draft' | 'archived';
  visibility?: 'public' | 'internal' | 'private'; // Default: public

  // Content Organization
  tags: string[];                // Required: Empty array if none
  category?: string;             // Optional: Content category

  // Engagement (Standardized)
  engagement: {
    views: number;               // Required: View count
    saves: number;               // Required: Save count
    comments: number;            // Required: Comment count
    reactions: {                 // Required: Reaction counts
      likes: number;
      hearts: number;
      // ... extensible
    };
    is_saved?: boolean;          // Optional: Current user saved status
    user_reaction?: string;      // Optional: Current user reaction
  };

  // Rich Metadata (Optional)
  metadata?: {
    business_impact?: number;    // 0-100 score
    confidence_score?: number;   // 0-100 score
    processing_time_ms?: number; // Generation time
    model_version?: string;      // AI model used
    tokens_used?: number;        // Token consumption
  };
}
```

### 3. Unified Activity Interface
```typescript
interface UnifiedActivity {
  // Core Identity
  id: string;                    // Required: UUIDv4
  type: string;                  // Required: activity_created, agent_spawned, etc.
  title: string;                 // Required: Human readable title
  description?: string;          // Optional: Detailed description

  // Actor Information
  actor: string;                 // Required: Who/what performed the action
  agent_id?: string;             // Optional: Related agent ID

  // Status & Timing
  status: 'completed' | 'failed' | 'in_progress' | 'cancelled';
  timestamp: string;             // Required: ISO 8601 timestamp

  // Classification
  priority?: 'low' | 'medium' | 'high' | 'critical'; // Default: medium
  category?: string;             // Optional: Grouping category

  // Performance Data (Optional)
  metadata?: {
    duration_ms?: number;        // Execution time
    error_message?: string;      // If status === 'failed'
    retry_count?: number;        // Retry attempts
    correlation_id?: string;     // For tracing
  };
}
```

### 4. Unified API Response Wrapper
```typescript
interface UnifiedAPIResponse<T> {
  // Response Status
  success: boolean;              // Required: Operation success
  data: T;                       // Required: Response payload

  // Error Handling
  error?: string;                // Optional: Error message
  error_code?: string;           // Optional: Error code

  // Metadata
  timestamp: string;             // Required: Response timestamp
  request_id?: string;           // Optional: For debugging

  // Pagination (when applicable)
  pagination?: {
    total: number;               // Total items available
    page: number;                // Current page (1-based)
    limit: number;               // Items per page
    has_more: boolean;           // More pages available
  };

  // Performance
  processing_time_ms?: number;   // Optional: Server processing time
  cache_hit?: boolean;           // Optional: Cache status
}
```

## Implementation Strategy

### Phase 1: Fix Breaking Points (Immediate)
1. **Fix post.id.slice() errors**:
   ```javascript
   // Current broken code:
   ID: {post.id?.slice(0, 8) || 'Unknown'}...

   // Fixed code:
   ID: {String(post.id)?.slice(0, 8) || 'Unknown'}...
   ```

2. **Add type coercion in components**:
   ```javascript
   const safePostId = (id) => typeof id === 'string' ? id : String(id);
   ```

### Phase 2: API Response Normalization (Short-term)
1. **Update API endpoints** to return consistent structure:
   ```javascript
   // Before:
   { id: 1, author: "Code Assistant", published_at: "..." }

   // After:
   { id: "post-1", author_agent_name: "Code Assistant", published_at: "..." }
   ```

2. **Add response transformers** in API service:
   ```javascript
   const normalizePost = (post) => ({
     ...post,
     id: String(post.id),
     author_agent_name: post.author || post.author_agent_name,
     published_at: post.published_at || post.publishedAt
   });
   ```

### Phase 3: Unified Data Contract (Medium-term)
1. **Implement unified interfaces** across all endpoints
2. **Add TypeScript validation** at API boundaries
3. **Create data migration tools** for existing data
4. **Update all components** to use unified types

### Phase 4: Real Database Integration (Long-term)
1. **Replace mock data** with real database calls
2. **Implement proper database schemas** matching unified interfaces
3. **Add data validation** at database layer
4. **Enable real-time synchronization**

## Breaking Points Resolution

### 1. String/Number ID Conflicts
**Solution**: Consistent string coercion
```javascript
// In components:
const safeId = (id) => String(id || 'unknown');

// In API responses:
const response = {
  ...data,
  id: String(data.id),
  agent_id: String(data.agent_id)
};
```

### 2. Field Name Mismatches
**Solution**: Response normalization middleware
```javascript
// API middleware:
const normalizeAgentPost = (post) => ({
  id: String(post.id),
  title: post.title,
  content: post.content,
  author_agent_name: post.author || post.authorAgent,
  published_at: post.published_at || post.publishedAt,
  engagement: {
    views: post.views || 0,
    saves: post.saves || 0,
    comments: post.comments || 0,
    reactions: { likes: post.likes || 0 }
  }
});
```

### 3. Missing Required Fields
**Solution**: Default value providers
```javascript
const withDefaults = (agent) => ({
  id: agent.id || `agent-${Date.now()}`,
  name: agent.name || 'Unnamed Agent',
  description: agent.description || 'No description provided',
  capabilities: agent.capabilities || [],
  status: agent.status || 'inactive',
  created_at: agent.created_at || new Date().toISOString(),
  updated_at: agent.updated_at || new Date().toISOString()
});
```

## Testing Strategy

### 1. Type Safety Tests
```javascript
// Test all API responses match TypeScript interfaces
describe('API Response Types', () => {
  test('agents endpoint returns valid Agent[]', async () => {
    const response = await api.getAgents();
    response.data.forEach(agent => {
      expect(typeof agent.id).toBe('string');
      expect(agent.status).toMatch(/active|inactive|error|maintenance/);
    });
  });
});
```

### 2. Data Flow Integration Tests
```javascript
// Test complete data flows end-to-end
describe('Agent Posts Data Flow', () => {
  test('posts load correctly in components', async () => {
    const posts = await apiService.getAgentPosts();
    posts.data.forEach(post => {
      expect(() => String(post.id).slice(0, 8)).not.toThrow();
    });
  });
});
```

## Migration Timeline

### Immediate (Day 1)
- Fix all `.slice()` errors with string coercion
- Add defensive programming in components
- Deploy hotfixes

### Week 1
- Implement response normalization
- Update API endpoints to return consistent formats
- Add comprehensive error handling

### Week 2-3
- Roll out unified data contracts
- Update all TypeScript interfaces
- Migrate components to use new contracts

### Month 1
- Complete database integration
- Replace all mock data with real data
- Full end-to-end testing

## Success Metrics

### Immediate Goals
- Zero runtime errors related to data type mismatches
- All `.slice()`, `.map()`, `.filter()` operations work correctly
- Consistent data flow across both architectures

### Long-term Goals
- Single source of truth for all data structures
- Type-safe data flow throughout the application
- Real-time data synchronization working
- Maintainable and scalable data architecture

## Conclusion

The agent-feed project's dual architecture creates complexity but can be unified through:

1. **Immediate fixes** for breaking points (string coercion)
2. **Consistent data contracts** across all APIs
3. **Proper TypeScript integration** with runtime validation
4. **Gradual migration** from mock to real data

This unified approach will eliminate current data flow conflicts and create a robust, maintainable architecture that supports both Next.js and Vite frontends seamlessly.