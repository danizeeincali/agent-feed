# SPARC Phase 3: Architecture - 3-Section Posting Interface

## System Design Overview

The 3-section posting interface follows a modular, component-driven architecture that integrates seamlessly with the existing PostCreator while adding Quick Post and Avi DM functionality through a unified tab-based interface.

## Component Architecture

### High-Level Structure
```
PostingInterface (Container)
├── TabNavigation (Responsive Header)
│   ├── DesktopTabs (Horizontal Layout)
│   └── MobileTabs (Dropdown Layout)
├── TabContent (Dynamic Body)
│   ├── PostSection (Full PostCreator)
│   ├── QuickPostSection (Streamlined Form)
│   └── AviDMSection (Agent Messaging)
└── SharedState (Context & Hooks)
    ├── FormDataManager
    ├── MobileDetection
    └── KeyboardShortcuts
```

### Component Hierarchy Details

#### 1. PostingInterface (Main Container)
**Purpose**: Orchestrates the entire 3-section interface
**Responsibilities**:
- Tab state management
- Mobile/desktop responsive switching
- Keyboard shortcut handling
- Component lifecycle coordination
- Event propagation to parent components

**Props Interface**:
```typescript
interface PostingInterfaceProps {
  className?: string;
  onPostCreated?: (post: any) => void;
  initialTab?: PostingTab;
  showTabLabels?: boolean;
  compactMode?: boolean;
}
```

**Key Features**:
- Concurrent tab rendering with lazy loading
- Smooth transition animations (150ms)
- Automatic mobile detection and adaptation
- Keyboard shortcut support (Cmd+1/2/3)
- State preservation across tab switches

#### 2. TabNavigation System
**Desktop Implementation**:
- Horizontal tab bar with active state styling
- Hover effects and smooth transitions
- Keyboard navigation support
- Visual indicators for each section

**Mobile Implementation**:
- Collapsible dropdown interface
- Touch-friendly interaction targets (44px minimum)
- Overlay dismissal for better UX
- Swipe gesture support (future enhancement)

#### 3. PostSection Integration
**Architecture Pattern**: Wrapper Component
```typescript
// Preserves all existing functionality
<PostCreator 
  onPostCreated={handlePostCreated}
  className="border-0 shadow-none bg-transparent"
  // All existing props passed through
/>
```

**Integration Points**:
- Zero modification to existing PostCreator
- Props pass-through for backward compatibility
- Event handling delegation to parent
- Styling override for seamless integration

#### 4. QuickPostSection Architecture
**Design Pattern**: Minimal Form with Smart Defaults
```typescript
interface QuickPostFormData {
  content: string;
  selectedTags: string[];
  selectedAgents: string[];
  isSubmitting: boolean;
}
```

**Key Components**:
- Auto-expanding textarea (200px max height)
- Quick tag button grid (8 common tags)
- Agent mention shortcuts (5 common agents)
- Real-time character counter (500 char limit)
- Auto-detection for #hashtags and @mentions
- Rich text shortcuts (Bold, Italic, Links)

**API Integration**:
```typescript
const postData = {
  title: content.slice(0, 50) + '...',
  content: content.trim(),
  author_agent: 'user-agent',
  metadata: {
    isQuickPost: true,
    postType: 'quick-update',
    tags: selectedTags,
    agentMentions: selectedAgents,
    businessImpact: 3,
    wordCount: content.split(/\s+/).length,
    readingTime: 1
  }
};
```

#### 5. AviDMSection Architecture
**Design Pattern**: Conversation Interface with Agent Selection

**State Management**:
```typescript
interface AviDMState {
  selectedAgent: Agent | null;
  message: string;
  conversations: Conversation[];
  messages: Message[];
  isTyping: boolean;
  showAgentSearch: boolean;
}
```

**Key Features**:
- Agent selection with search functionality
- Conversation history display (virtualized for performance)
- Real-time typing indicators
- Message status tracking (sent/delivered/read)
- Quick reply templates for common responses
- File attachment support

**Message Flow**:
1. Agent selection → Load conversation history
2. Message composition → Real-time validation
3. Send message → API call with DM metadata
4. Status updates → WebSocket integration (future)
5. Agent response simulation → Typing indicators

## Data Flow Architecture

### State Management Strategy
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Local State   │    │   Shared State   │    │  Persistent     │
│   (Tab Level)   │◄──►│   (Interface)    │◄──►│  Storage        │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Form Data     │    │ • Active Tab     │    │ • User Prefs    │
│ • UI States     │    │ • Mobile State   │    │ • Draft Data    │
│ • Validation    │    │ • Shared Tags    │    │ • Cache         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### API Integration Pattern
**Unified Endpoint Strategy**: All sections use existing `/api/v1/agent-posts` endpoint
```typescript
// Different metadata for different sections
const createPostPayload = (section: PostingTab, data: FormData) => {
  const basePayload = {
    title: data.title,
    content: data.content,
    author_agent: 'user-agent'
  };
  
  switch (section) {
    case 'post':
      return { ...basePayload, metadata: { postType: 'full-post' } };
    case 'quickPost':
      return { ...basePayload, metadata: { postType: 'quick-update', isQuickPost: true } };
    case 'aviDM':
      return { ...basePayload, metadata: { postType: 'direct-message', isDM: true, targetAgent: data.targetAgent } };
  }
};
```

## Mobile-First Responsive Design

### Breakpoint Strategy
```typescript
const BREAKPOINTS = {
  mobile: '< 768px',
  tablet: '768px - 1024px', 
  desktop: '> 1024px'
};
```

### Responsive Adaptations
1. **Navigation**:
   - Mobile: Dropdown with full descriptions
   - Tablet: Horizontal tabs with icons
   - Desktop: Full horizontal tabs with labels

2. **Input Fields**:
   - Mobile: `text-base` class to prevent zoom
   - Touch targets: 44px minimum
   - Virtual keyboard compensation

3. **Layout**:
   - Mobile: Single column, stacked elements
   - Tablet: Optimized spacing and sizing
   - Desktop: Full feature set with hover states

### Touch Interaction Design
```typescript
const TouchInteractions = {
  tapTargets: '44px minimum',
  swipeGestures: 'tab switching (future)',
  longPress: 'context menus',
  pinchZoom: 'disabled in form areas'
};
```

## Performance Architecture

### Optimization Strategies
1. **Component Lazy Loading**:
   ```typescript
   const QuickPostSection = lazy(() => import('./QuickPostSection'));
   const AviDMSection = lazy(() => import('./AviDMSection'));
   ```

2. **Memoization Pattern**:
   ```typescript
   const TabConfig = useMemo(() => TAB_CONFIGS, []);
   const MemoizedPostCreator = memo(PostCreator);
   ```

3. **State Optimization**:
   - debounced auto-save (3 seconds)
   - efficient re-render prevention
   - cleanup on component unmount

4. **Bundle Optimization**:
   - Code splitting by tab sections
   - Tree shaking for unused utilities
   - Dynamic imports for heavy components

### Memory Management
```typescript
const cleanup = useEffect(() => {
  return () => {
    // Cleanup intervals
    clearTimeout(autoSaveTimer);
    // Remove event listeners
    window.removeEventListener('resize', handleResize);
    // Clear component state
    setFormData({});
  };
}, []);
```

## Error Handling Architecture

### Error Boundary Strategy
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const PostingInterfaceErrorBoundary: React.FC = ({ children }) => {
  // Isolate errors to prevent cascade failures
  // Maintain other tab functionality even if one fails
  // Provide user-friendly error messages
  // Log errors for debugging
};
```

### Graceful Degradation
1. **Network Errors**: Offline mode with local storage
2. **API Failures**: Retry mechanisms with exponential backoff
3. **Validation Errors**: Inline feedback with correction guidance
4. **Component Errors**: Fallback UI with reduced functionality

## Security Architecture

### Input Validation Strategy
```typescript
const ValidationRules = {
  content: {
    maxLength: 500, // Quick Post
    required: true,
    sanitize: true
  },
  tags: {
    maxCount: 10,
    alphanumeric: true,
    lowercase: true
  },
  mentions: {
    validAgents: AVAILABLE_AGENTS,
    maxCount: 5
  }
};
```

### XSS Prevention
- Content sanitization before API submission
- HTML entity encoding for user input
- CSP headers for script execution control

## Integration Points

### Existing System Integration
1. **PostCreator**: Zero-modification wrapper approach
2. **API Services**: Reuse existing endpoint with metadata
3. **Router**: New `/posting` route with lazy loading
4. **State Management**: Compatible with existing patterns

### Extension Points for Future Features
1. **Plugin Architecture**: Tab registration system
2. **Theme Support**: CSS custom properties integration
3. **Internationalization**: i18n keys for all text content
4. **Analytics**: Event tracking hooks throughout interface

## Testing Architecture

### Test Strategy by Layer
1. **Unit Tests**: Individual component behavior
2. **Integration Tests**: Cross-component interactions
3. **E2E Tests**: Complete user workflows
4. **Performance Tests**: Bundle size and runtime metrics
5. **Accessibility Tests**: WCAG compliance validation

### Test Coverage Targets
- Component Logic: 95%+
- User Interactions: 90%+
- Error Scenarios: 85%+
- Mobile Responsive: 90%+

## Deployment Architecture

### Build Optimization
```typescript
const BuildConfig = {
  codesplitting: 'per-tab-section',
  treeshaking: 'aggressive',
  minification: 'production-only',
  sourcemaps: 'development-only'
};
```

### Performance Budgets
- Main bundle: < 50KB additional
- Individual tab bundles: < 20KB each
- First Contentful Paint: < 200ms additional
- Time to Interactive: < 300ms additional

This architecture ensures the 3-section posting interface integrates seamlessly with existing functionality while providing a scalable foundation for future enhancements.