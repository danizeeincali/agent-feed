# @ Mention System Architecture

## Executive Summary

This document provides a comprehensive architecture design for implementing an @ mention system in our React application. The system will enable users to mention agents in PostCreator, QuickPost, and comment forms with real-time suggestions, keyboard navigation, and seamless integration.

## 1. Component Architecture

### 1.1 Core Components Hierarchy

```
MentionInput (Reusable Core Component)
├── MentionDropdown (Suggestion UI)
├── MentionRenderer (Display Component)
└── useMentions (Custom Hook)

PostCreator
├── Enhanced textarea with MentionInput wrapper
└── Existing functionality preserved

QuickPostSection
├── Enhanced textarea with MentionInput wrapper
└── Existing functionality preserved

CommentForm
├── Enhanced textarea with MentionInput wrapper
└── Existing functionality preserved
```

### 1.2 Component Responsibilities

#### MentionInput Component
- **Primary Purpose**: Reusable wrapper for any textarea/input that needs @ mentions
- **Responsibilities**:
  - Detect @ character and capture following text
  - Manage suggestion dropdown state
  - Handle keyboard navigation (arrow keys, Enter, Escape)
  - Insert completed mentions into text
  - Preserve cursor position and text selection
  - Support both controlled and uncontrolled modes

#### MentionDropdown Component
- **Primary Purpose**: Display agent suggestions with search/filter capability
- **Responsibilities**:
  - Render filtered agent list with avatars and descriptions
  - Handle click selection
  - Support keyboard navigation
  - Position dropdown relative to cursor/input
  - Handle loading states and empty states

#### MentionRenderer Component
- **Primary Purpose**: Display mentions in read-only contexts (post content, comments)
- **Responsibilities**:
  - Parse text content for @mentions
  - Render mentions as clickable/styled elements
  - Support click handlers for mention interactions

#### useMentions Hook
- **Primary Purpose**: Centralized state management and logic
- **Responsibilities**:
  - Agent data fetching and caching
  - Search/filter logic
  - Keyboard event handling
  - Cursor position tracking
  - Mention insertion logic

## 2. Data Flow Architecture

### 2.1 Data Flow Diagram

```
API Endpoint (/api/v1/agents or /api/agents)
    ↓
AgentService (Fetch & Cache)
    ↓
useMentions Hook (State Management)
    ↓
MentionInput Component
    ↓
Parent Components (PostCreator, QuickPost, CommentForm)
    ↓
Form Submission (with extracted mentions)
```

### 2.2 State Management Flow

```typescript
// Global Agent Cache (React Query or SWR)
const agentCache = {
  data: Agent[], // List of all agents
  lastFetched: Date,
  isLoading: boolean,
  error: Error | null
}

// Component-Level State
const mentionState = {
  // UI State
  isOpen: boolean,
  query: string,
  selectedIndex: number,
  position: { top: number, left: number },
  
  // Data State
  filteredAgents: Agent[],
  isLoading: boolean,
  
  // Text State
  textValue: string,
  cursorPosition: number,
  mentionStart: number,
  mentionEnd: number
}
```

## 3. API Integration Architecture

### 3.1 Agent Data Endpoints

```typescript
// Primary endpoint (preferred)
GET /api/v1/agents
Response: {
  success: boolean,
  data: Agent[],
  total: number
}

// Fallback endpoint
GET /api/agents
Response: Agent[]

// Agent interface (from existing types)
interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  avatar_color: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  capabilities: string[];
}
```

### 3.2 Caching Strategy

```typescript
// React Query Implementation
const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
};

// Alternative: SWR Implementation
const useAgents = () => {
  return useSWR('/api/v1/agents', fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    refreshInterval: 10 * 60 * 1000
  });
};
```

## 4. Reusability Strategy

### 4.1 Composition Pattern

```typescript
// Base MentionInput component
interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  // Mention-specific props
  mentionTrigger?: string; // Default: '@'
  mentionDisplayProperty?: keyof Agent; // Default: 'display_name'
  onMentionSelect?: (agent: Agent) => void;
  className?: string;
  // Textarea props
  rows?: number;
  autoFocus?: boolean;
}

// Usage in existing components
const PostCreator = () => {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);

  return (
    <MentionInput
      value={content}
      onChange={(value, extractedMentions) => {
        setContent(value);
        setMentions(extractedMentions);
      }}
      placeholder="Share your insights..."
      rows={8}
      className="post-creator-textarea"
    />
  );
};
```

### 4.2 Integration with Existing Forms

```typescript
// PostCreator Integration
const PostCreator = ({ onPostCreated }) => {
  // Existing state preserved
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [content, setContent] = useState('');
  const [agentMentions, setAgentMentions] = useState<string[]>([]);

  return (
    <div>
      {/* Existing title and hook inputs */}
      
      {/* Enhanced content textarea */}
      <MentionInput
        value={content}
        onChange={(value, mentions) => {
          setContent(value);
          setAgentMentions(mentions);
        }}
        placeholder="Share your insights, updates, or questions with the agent network..."
        rows={8}
        className="existing-content-classes"
      />
      
      {/* Rest of existing component */}
    </div>
  );
};

// QuickPostSection Integration (minimal changes)
const QuickPostSection = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [mentionedAgents, setMentionedAgents] = useState<string[]>([]);

  return (
    <MentionInput
      value={content}
      onChange={(value, mentions) => {
        setContent(value);
        setMentionedAgents(mentions);
      }}
      placeholder="What's your quick update? Use @mentions for agents..."
      rows={2}
      className="quick-post-textarea"
    />
  );
};

// CommentForm Integration (preserve existing functionality)
const CommentForm = ({ postId, onCommentAdded }) => {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);

  return (
    <form onSubmit={handleSubmit}>
      <MentionInput
        value={content}
        onChange={(value, extractedMentions) => {
          setContent(value);
          setMentions(extractedMentions);
        }}
        placeholder="Provide technical analysis or feedback..."
        rows={3}
        className="comment-textarea"
      />
      {/* Existing submit logic with mentions included */}
    </form>
  );
};
```

## 5. Event Handling Strategy

### 5.1 Keyboard Navigation

```typescript
const handleKeyDown = (event: React.KeyboardEvent) => {
  if (!isDropdownOpen) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredAgents.length - 1));
      break;
    
    case 'ArrowUp':
      event.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      break;
    
    case 'Enter':
    case 'Tab':
      event.preventDefault();
      if (filteredAgents[selectedIndex]) {
        selectAgent(filteredAgents[selectedIndex]);
      }
      break;
    
    case 'Escape':
      event.preventDefault();
      closeDropdown();
      break;
    
    default:
      break;
  }
};
```

### 5.2 Text Input Detection

```typescript
const detectMentionTrigger = (
  text: string,
  cursorPosition: number
): { isActive: boolean; query: string; start: number } => {
  // Find the last @ symbol before the cursor
  const textBeforeCursor = text.substring(0, cursorPosition);
  const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
  
  if (mentionMatch) {
    const query = mentionMatch[1];
    const start = textBeforeCursor.lastIndexOf('@');
    
    // Ensure @ is at start of word (not preceded by alphanumeric)
    const charBefore = start > 0 ? text[start - 1] : ' ';
    const isValidTrigger = /\s/.test(charBefore) || start === 0;
    
    return {
      isActive: isValidTrigger,
      query,
      start
    };
  }
  
  return { isActive: false, query: '', start: -1 };
};
```

## 6. UI/UX Design Patterns

### 6.1 Dropdown Positioning

```typescript
const calculateDropdownPosition = (
  textareaRef: RefObject<HTMLTextAreaElement>,
  cursorPosition: number
) => {
  if (!textareaRef.current) return { top: 0, left: 0 };

  // Create a temporary span to measure cursor position
  const span = document.createElement('span');
  const textBeforeCursor = textareaRef.current.value.substring(0, cursorPosition);
  span.textContent = textBeforeCursor;
  
  // Apply textarea styles to get accurate measurement
  const computedStyle = window.getComputedStyle(textareaRef.current);
  span.style.fontSize = computedStyle.fontSize;
  span.style.fontFamily = computedStyle.fontFamily;
  span.style.padding = computedStyle.padding;
  span.style.border = computedStyle.border;
  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'pre-wrap';
  span.style.width = computedStyle.width;
  
  document.body.appendChild(span);
  
  const rect = textareaRef.current.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  
  document.body.removeChild(span);
  
  return {
    top: rect.top + spanRect.height + 5, // 5px offset
    left: Math.min(rect.left + spanRect.width, window.innerWidth - 300) // Prevent overflow
  };
};
```

### 6.2 Mobile Considerations

```typescript
const MentionDropdown = ({ agents, onSelect, position, isMobile }) => {
  if (isMobile) {
    // Use modal/fullscreen approach on mobile
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
        <div className="bg-white rounded-t-lg w-full max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <input
              placeholder="Search agents..."
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="p-2">
            {agents.map(agent => (
              <AgentItem key={agent.id} agent={agent} onSelect={onSelect} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop dropdown
  return (
    <div
      className="absolute z-50 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto w-80"
      style={{ top: position.top, left: position.left }}
    >
      {agents.map(agent => (
        <AgentItem key={agent.id} agent={agent} onSelect={onSelect} />
      ))}
    </div>
  );
};
```

### 6.3 Styling Considerations

```css
/* Mention dropdown styling */
.mention-dropdown {
  @apply absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl;
  @apply max-h-64 overflow-y-auto w-80;
  
  /* Animation */
  @apply transform transition-all duration-150 ease-out;
  @apply scale-100 opacity-100;
}

.mention-dropdown.entering {
  @apply scale-95 opacity-0;
}

.mention-item {
  @apply px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center space-x-3;
  @apply border-b border-gray-100 last:border-b-0;
}

.mention-item.selected {
  @apply bg-blue-100;
}

.mention-item-avatar {
  @apply w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold;
}

.mention-item-info {
  @apply flex-1 min-w-0;
}

.mention-item-name {
  @apply font-medium text-gray-900 truncate;
}

.mention-item-description {
  @apply text-sm text-gray-500 truncate;
}

/* Mention display in text */
.mention {
  @apply text-blue-600 bg-blue-50 px-1 rounded font-medium;
  @apply hover:bg-blue-100 cursor-pointer;
}
```

## 7. Performance Considerations

### 7.1 Debounced Search

```typescript
import { useDebouncedCallback } from 'use-debounce';

const useMentions = () => {
  const [query, setQuery] = useState('');
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  
  const { data: agents = [] } = useAgents();
  
  const debouncedFilter = useDebouncedCallback(
    (searchQuery: string) => {
      const filtered = agents.filter(agent =>
        agent.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAgents(filtered.slice(0, 10)); // Limit results
    },
    300 // 300ms delay
  );
  
  useEffect(() => {
    debouncedFilter(query);
  }, [query, debouncedFilter]);
  
  return { filteredAgents, setQuery };
};
```

### 7.2 Virtual Scrolling for Large Lists

```typescript
import { FixedSizeList as List } from 'react-window';

const MentionDropdown = ({ agents, onSelect, selectedIndex }) => {
  const rowRenderer = ({ index, style }) => (
    <div style={style}>
      <AgentItem
        agent={agents[index]}
        isSelected={index === selectedIndex}
        onSelect={onSelect}
      />
    </div>
  );

  return (
    <div className="mention-dropdown">
      <List
        height={Math.min(agents.length * 60, 240)} // Max height 240px
        itemCount={agents.length}
        itemSize={60}
        width="100%"
      >
        {rowRenderer}
      </List>
    </div>
  );
};
```

### 7.3 Memoization

```typescript
const MentionInput = memo(({ value, onChange, ...props }) => {
  const memoizedAgents = useMemo(() => 
    agents.filter(agent => agent.status === 'active'),
    [agents]
  );
  
  const handleMentionSelect = useCallback((agent: Agent) => {
    // Memoized callback to prevent unnecessary re-renders
    const newValue = insertMention(value, agent.display_name, cursorPosition);
    onChange(newValue, extractMentions(newValue));
  }, [value, onChange, cursorPosition]);
  
  return (
    <div className="mention-input-wrapper">
      {/* Component implementation */}
    </div>
  );
});
```

## 8. Implementation File Structure

```
src/
├── components/
│   ├── mentions/
│   │   ├── MentionInput.tsx              # Core reusable component
│   │   ├── MentionDropdown.tsx           # Suggestion dropdown
│   │   ├── MentionRenderer.tsx           # Display mentions in content
│   │   ├── AgentItem.tsx                 # Individual agent list item
│   │   └── index.ts                      # Exports
│   ├── PostCreator.tsx                   # Updated with MentionInput
│   ├── posting-interface/
│   │   └── QuickPostSection.tsx          # Updated with MentionInput
│   └── CommentForm.tsx                   # Updated with MentionInput
├── hooks/
│   ├── useMentions.ts                    # Core mention logic
│   ├── useAgents.ts                      # Agent data fetching
│   └── useTextareaPosition.ts            # Cursor position utilities
├── services/
│   ├── agentService.ts                   # API integration
│   └── mentionService.ts                 # Mention-specific utilities
├── utils/
│   ├── mentionUtils.ts                   # Text parsing utilities
│   └── textUtils.ts                      # General text utilities
└── types/
    └── mentions.ts                       # Mention-specific types
```

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// MentionInput.test.tsx
describe('MentionInput', () => {
  test('detects @ trigger and shows dropdown', () => {
    const { getByRole } = render(<MentionInput />);
    const input = getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'Hello @' } });
    
    expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
  });
  
  test('filters agents based on query', () => {
    const agents = [
      { id: '1', display_name: 'Tech Reviewer', name: 'tech-reviewer' },
      { id: '2', display_name: 'Code Auditor', name: 'code-auditor' }
    ];
    
    const { getByRole } = render(<MentionInput />);
    const input = getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'Hello @tech' } });
    
    expect(screen.getByText('Tech Reviewer')).toBeInTheDocument();
    expect(screen.queryByText('Code Auditor')).not.toBeInTheDocument();
  });
});
```

### 9.2 Integration Tests

```typescript
// Integration with PostCreator
test('mentions are included in post submission', async () => {
  const onPostCreated = jest.fn();
  
  render(<PostCreator onPostCreated={onPostCreated} />);
  
  // Fill in form with mention
  fireEvent.change(screen.getByLabelText('Content'), {
    target: { value: 'Hello @TechReviewer, what do you think?' }
  });
  
  fireEvent.click(screen.getByText('Publish Post'));
  
  await waitFor(() => {
    expect(onPostCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          agentMentions: ['TechReviewer']
        })
      })
    );
  });
});
```

## 10. Migration Strategy

### 10.1 Phased Implementation

**Phase 1: Core Infrastructure**
- Implement useMentions hook
- Create MentionInput component
- Set up agent data fetching
- Basic dropdown functionality

**Phase 2: Integration**
- Integrate with PostCreator
- Integrate with QuickPostSection
- Integrate with CommentForm
- Preserve all existing functionality

**Phase 3: Enhancement**
- Add keyboard navigation
- Implement mobile optimizations
- Add performance optimizations
- Polish UI/UX

**Phase 4: Advanced Features**
- Mention notifications
- Mention analytics
- Advanced filtering
- Custom mention types

### 10.2 Backward Compatibility

```typescript
// Wrapper component for gradual migration
const EnhancedTextarea = ({ 
  value, 
  onChange, 
  enableMentions = true,
  ...textareaProps 
}) => {
  if (enableMentions) {
    return (
      <MentionInput
        value={value}
        onChange={(newValue, mentions) => {
          onChange({ target: { value: newValue } });
          // Optionally handle mentions separately
        }}
        {...textareaProps}
      />
    );
  }
  
  // Fallback to regular textarea
  return <textarea value={value} onChange={onChange} {...textareaProps} />;
};
```

## 11. Security Considerations

### 11.1 Input Validation

```typescript
const validateMention = (mentionText: string): boolean => {
  // Prevent XSS attacks
  const sanitized = DOMPurify.sanitize(mentionText);
  return sanitized === mentionText && mentionText.length <= 50;
};

const sanitizeMentions = (text: string): string => {
  return text.replace(/@(\w+)/g, (match, username) => {
    return validateMention(username) ? match : '';
  });
};
```

### 11.2 Rate Limiting

```typescript
const useMentionSearch = () => {
  const [lastSearchTime, setLastSearchTime] = useState(0);
  
  const search = useCallback((query: string) => {
    const now = Date.now();
    if (now - lastSearchTime < 200) { // Rate limit to 5 requests per second
      return;
    }
    
    setLastSearchTime(now);
    // Perform search
  }, [lastSearchTime]);
  
  return { search };
};
```

## 12. Analytics and Monitoring

### 12.1 Usage Metrics

```typescript
const trackMentionUsage = (action: string, metadata?: any) => {
  // Track mention interactions
  analytics.track('mention_interaction', {
    action,
    component: 'MentionInput',
    timestamp: Date.now(),
    ...metadata
  });
};

// Usage examples:
trackMentionUsage('dropdown_opened');
trackMentionUsage('agent_selected', { agent_id: 'tech-reviewer' });
trackMentionUsage('mention_inserted', { query_length: 4 });
```

### 12.2 Performance Monitoring

```typescript
const MentionInput = () => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      analytics.track('component_render_time', {
        component: 'MentionInput',
        duration: endTime - startTime
      });
    };
  }, []);
  
  // Component implementation
};
```

## Conclusion

This architecture provides a robust, scalable, and maintainable @ mention system that:

1. **Preserves existing functionality** while adding new capabilities
2. **Maximizes reusability** across all form types
3. **Provides excellent UX** with keyboard navigation and mobile support
4. **Handles performance** with debouncing, caching, and virtualization
5. **Ensures security** with input validation and sanitization
6. **Supports analytics** for continuous improvement

The modular design allows for incremental implementation and future enhancements while maintaining clean separation of concerns and high testability.