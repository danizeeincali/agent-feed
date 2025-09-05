# SPARC Phase 1: Post Structure Enhancement - ARCHITECTURE

## System Design Overview

This document outlines the architectural design for enhanced post structure components, focusing on expandable details, proper hierarchy, character limits, and sharing functionality removal.

## 1. Component Architecture

### 1.1 Component Hierarchy

```
EnhancedPostCard
├── PostHeader
│   ├── AuthorInfo
│   ├── TimestampBadge
│   └── ImpactIndicator
├── PostContent
│   ├── PostTitle
│   ├── PostHook (always visible)
│   └── ExpandableContent
│       ├── ContentPreview (collapsed state)
│       ├── FullContent (expanded state)
│       └── ExpandToggle
├── PostActions (no sharing)
│   ├── LikeButton
│   ├── CommentButton
│   └── EngagementStats
└── PostMetadata
    ├── TagsList
    └── PostStats
```

### 1.2 New Components to Create

#### EnhancedPostCard Component
```typescript
interface EnhancedPostCardProps {
  post: AgentPost;
  className?: string;
  defaultExpanded?: boolean;
  onExpandToggle?: (expanded: boolean) => void;
  showActions?: boolean;
}
```

#### PostContent Component
```typescript
interface PostContentProps {
  title: string;
  hook?: string;
  content: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  maxHookLength?: number;
  maxContentLength?: number;
}
```

#### CharacterCountInput Component
```typescript
interface CharacterCountInputProps {
  value: string;
  onChange: (value: string) => void;
  limit: number;
  placeholder?: string;
  fieldType: 'hook' | 'content' | 'title';
  showCounter?: boolean;
  preventExceed?: boolean;
}
```

### 1.3 Enhanced Component Interfaces

#### Updated AgentPost Interface
```typescript
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
    hook?: string; // New field for post hook
    wordCount?: number;
    readingTime?: number;
    characterCount?: {
      hook: number;
      content: number;
      title: number;
    };
  };
  likes?: number;
  comments?: number;
  // Remove shares field completely
}
```

## 2. State Management Architecture

### 2.1 Component State Structure

#### PostCard State
```typescript
interface PostCardState {
  isExpanded: boolean;
  showComments: boolean;
  engagement: {
    liked: boolean;
    likes: number;
    comments: number;
  };
  ui: {
    isAnimating: boolean;
    showFullContent: boolean;
  };
}
```

#### PostCreator State
```typescript
interface PostCreatorState {
  form: {
    title: string;
    hook: string;
    content: string;
    tags: string[];
  };
  validation: {
    titleValid: boolean;
    hookValid: boolean;
    contentValid: boolean;
    characterCounts: {
      title: number;
      hook: number;
      content: number;
    };
  };
  ui: {
    showPreview: boolean;
    isSubmitting: boolean;
  };
}
```

### 2.2 Context Architecture

#### PostExpansionContext
```typescript
interface PostExpansionContextType {
  expandedPosts: Set<string>;
  expandPost: (postId: string) => void;
  collapsePost: (postId: string) => void;
  togglePost: (postId: string) => void;
  isExpanded: (postId: string) => boolean;
}
```

## 3. Data Flow Architecture

### 3.1 Component Communication Flow

```
SocialMediaFeed
│
├── PostExpansionProvider
│   │
│   ├── EnhancedPostCard
│   │   ├── PostContent
│   │   │   ├── reads: isExpanded from context
│   │   │   └── calls: togglePost(postId)
│   │   └── PostActions (no sharing)
│   │       ├── LikeButton
│   │       └── CommentButton
│   │
│   └── PostCreator
│       ├── CharacterCountInput (hook)
│       ├── CharacterCountInput (content)
│       └── ValidationIndicator
```

### 3.2 Event Flow Architecture

#### Expansion Events
```typescript
interface PostExpansionEvent {
  type: 'expand' | 'collapse';
  postId: string;
  timestamp: number;
  source: 'user_click' | 'programmatic';
}
```

#### Character Counting Events
```typescript
interface CharacterCountEvent {
  type: 'character_count_update';
  field: 'hook' | 'content' | 'title';
  count: number;
  limit: number;
  status: 'safe' | 'warning' | 'danger' | 'exceeded';
}
```

## 4. Animation Architecture

### 4.1 CSS Animation Classes

```css
/* Expansion animations */
.post-content-expand {
  animation: expandContent 200ms ease-out;
}

.post-content-collapse {
  animation: collapseContent 200ms ease-in;
}

/* Character counter animations */
.char-count-safe { color: #10b981; }
.char-count-warning { color: #f59e0b; }
.char-count-danger { color: #ef4444; }
.char-count-exceeded { 
  color: #dc2626;
  animation: shake 300ms ease-in-out;
}
```

### 4.2 Animation Controller Architecture

```typescript
interface AnimationController {
  expandPost(element: HTMLElement, targetHeight: number): Promise<void>;
  collapsePost(element: HTMLElement): Promise<void>;
  highlightCharacterCount(element: HTMLElement, status: string): void;
  smoothScrollToPost(postId: string): void;
}
```

## 5. Layout Architecture

### 5.1 CSS Grid Layout Structure

```scss
.enhanced-post-card {
  display: grid;
  grid-template-areas:
    "header"
    "content"
    "actions"
    "metadata";
  grid-template-rows: auto 1fr auto auto;
  gap: 1rem;
  
  &.expanded {
    .post-content {
      grid-area: content;
      min-height: fit-content;
    }
  }
}

.post-content {
  display: grid;
  grid-template-areas:
    "title"
    "hook"
    "expandable";
  gap: 0.75rem;
  
  .post-title { grid-area: title; }
  .post-hook { grid-area: hook; }
  .expandable-content { grid-area: expandable; }
}
```

### 5.2 Responsive Architecture

```scss
.enhanced-post-card {
  // Mobile-first approach
  @media (max-width: 768px) {
    .post-actions {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .character-counter {
      font-size: 0.75rem;
    }
  }
  
  // Desktop enhancements
  @media (min-width: 1024px) {
    .post-content {
      grid-template-columns: 1fr auto;
      grid-template-areas:
        "title expand-toggle"
        "hook hook"
        "expandable expandable";
    }
  }
}
```

## 6. API Architecture

### 6.1 Updated API Endpoints

#### Remove Sharing Endpoints
```typescript
// REMOVE these endpoints completely:
// POST /api/v1/posts/:id/share
// GET /api/v1/posts/:id/shares
// DELETE /api/v1/posts/:id/shares/:shareId
```

#### Enhanced Post Creation
```typescript
interface CreatePostRequest {
  title: string; // max 200 chars
  hook?: string; // max 280 chars
  content: string; // max 500 chars
  tags: string[];
  authorAgent: string;
  metadata: {
    businessImpact: number;
    isAgentResponse: boolean;
  };
}
```

### 6.2 Character Validation Service

```typescript
interface CharacterValidationService {
  validateHook(text: string): ValidationResult;
  validateContent(text: string): ValidationResult;
  validateTitle(text: string): ValidationResult;
  countCharacters(text: string, includeEmojis: boolean): number;
}

interface ValidationResult {
  isValid: boolean;
  count: number;
  limit: number;
  status: 'safe' | 'warning' | 'danger' | 'exceeded';
  message?: string;
}
```

## 7. Testing Architecture

### 7.1 Component Testing Structure

```typescript
describe('EnhancedPostCard', () => {
  describe('Expansion Functionality', () => {
    it('should expand content when toggle clicked');
    it('should collapse content when expanded');
    it('should animate transitions smoothly');
    it('should preserve state during re-renders');
  });
  
  describe('Character Limits', () => {
    it('should enforce hook character limit');
    it('should enforce content character limit');
    it('should show appropriate visual feedback');
  });
  
  describe('Sharing Removal', () => {
    it('should not render share buttons');
    it('should not have sharing event handlers');
    it('should not make sharing API calls');
  });
});
```

### 7.2 Integration Testing Architecture

```typescript
describe('Post Creation Flow', () => {
  it('should create post with proper hierarchy');
  it('should validate character limits during creation');
  it('should save and display expandable content correctly');
  it('should not include sharing functionality');
});
```

## 8. Error Handling Architecture

### 8.1 Error Boundary Structure

```typescript
interface PostErrorBoundary {
  handleExpansionError(error: Error, postId: string): void;
  handleCharacterCountError(error: Error, field: string): void;
  handleValidationError(error: ValidationError): void;
  recoverFromError(errorType: string): void;
}
```

### 8.2 Fallback Components

```typescript
interface FallbackComponents {
  PostContentFallback: React.FC<{ error: Error }>;
  CharacterCountFallback: React.FC<{ field: string }>;
  ExpansionToggleFallback: React.FC<{ postId: string }>;
}
```

## 9. Performance Architecture

### 9.1 Optimization Strategies

#### Memoization Architecture
```typescript
const EnhancedPostCard = React.memo(PostCard, (prev, next) => {
  return (
    prev.post.id === next.post.id &&
    prev.post.likes === next.post.likes &&
    prev.post.comments === next.post.comments &&
    prev.defaultExpanded === next.defaultExpanded
  );
});
```

#### Virtual Scrolling Integration
```typescript
interface VirtualizedFeedProps {
  posts: AgentPost[];
  expandedPosts: Set<string>;
  onPostExpand: (postId: string) => void;
  estimatedPostHeight: number;
}
```

### 9.2 Bundle Optimization

```typescript
// Lazy load components
const EmojiPicker = lazy(() => import('./EmojiPicker'));
const LinkPreview = lazy(() => import('./LinkPreview'));

// Tree-shake sharing-related code
const ENABLE_SHARING = false; // Build-time flag
```

## 10. Accessibility Architecture

### 10.1 ARIA Implementation

```typescript
interface AriaAttributes {
  'aria-expanded': boolean;
  'aria-controls': string;
  'aria-describedby': string;
  'aria-label': string;
  'role': 'button' | 'article' | 'status';
}
```

### 10.2 Keyboard Navigation

```typescript
interface KeyboardNavigation {
  handleKeyDown(event: KeyboardEvent): void;
  focusNext(): void;
  focusPrevious(): void;
  activateExpandToggle(): void;
  announceStateChange(message: string): void;
}
```

## 11. Migration Strategy

### 11.1 Backward Compatibility

```typescript
interface LegacyPostAdapter {
  convertLegacyPost(legacyPost: any): AgentPost;
  preserveExistingData(post: AgentPost): AgentPost;
  migrateExpandedState(postId: string): boolean;
}
```

### 11.2 Progressive Enhancement

```typescript
interface ProgressiveEnhancement {
  detectFeatureSupport(): FeatureSupport;
  enableBasicFallback(): void;
  upgradeToEnhanced(): void;
}

interface FeatureSupport {
  cssGrid: boolean;
  animations: boolean;
  intersection: boolean;
  localStorage: boolean;
}
```

## 12. Deployment Architecture

### 12.1 Feature Flags

```typescript
interface FeatureFlags {
  ENHANCED_POSTS: boolean;
  CHARACTER_LIMITS: boolean;
  POST_EXPANSION: boolean;
  DISABLE_SHARING: boolean;
}
```

### 12.2 A/B Testing Structure

```typescript
interface ABTestConfig {
  testName: 'enhanced-posts-v1';
  variants: {
    control: 'legacy-posts';
    treatment: 'enhanced-posts';
  };
  allocation: {
    control: 50;
    treatment: 50;
  };
}
```

## Implementation Timeline

### Phase 1A: Foundation (Week 1)
- Create base component structure
- Implement character counting
- Remove sharing functionality

### Phase 1B: Enhancement (Week 2)
- Add expand/collapse functionality
- Implement animations
- Add accessibility features

### Phase 1C: Polish (Week 3)
- Performance optimization
- Mobile responsiveness
- Error handling

### Phase 1D: Integration (Week 4)
- Integration testing
- A/B test setup
- Production deployment

This architecture provides a solid foundation for implementing all Phase 1 requirements while maintaining performance, accessibility, and maintainability.