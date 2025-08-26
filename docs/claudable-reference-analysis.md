# Claudable Reference Implementation Analysis

## Executive Summary

The Claudable reference implementation provides a sophisticated chat interface with dual modes (Chat/Act), advanced WebSocket communication, CLI selection capabilities, and comprehensive image upload functionality. This analysis identifies key architectural patterns and implementation strategies that can be integrated into our simplified implementation.

## Architecture Overview

### Core Structure
```
apps/web/
├── components/chat/          # Chat UI components
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript definitions
└── contexts/               # React contexts
```

### Key Technologies
- **Framework**: Next.js 14.2.5 with TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: React hooks with custom state management
- **Real-time**: WebSocket with reconnection logic
- **Animations**: Framer Motion for smooth transitions
- **Image Processing**: FileReader API with base64 encoding

## Component Analysis

### 1. CLISelector Component

**File**: `/apps/web/components/chat/CLISelector.tsx`

**Key Features**:
- Modal-based CLI selection interface
- Support for multiple CLI options (Claude, Cursor, Qwen, Gemini, Codex)
- Status indicators (available, configured, ready)
- Model display with truncation for long lists
- Dark mode support

**Implementation Patterns**:
```typescript
interface CLISelectorProps {
  options: CLIOption[];
  selected?: string;
  onSelect: (cliId: string) => void;
  onClose: () => void;
}
```

**Reusable Patterns**:
- Modal overlay with backdrop blur
- Status badge system with color coding
- Conditional rendering based on CLI state
- Responsive grid layout for options

### 2. ChatInterface Component

**File**: `/apps/web/components/chat/ChatInterface.tsx`

**Key Features**:
- Dual mode support (chat/act)
- Integrated CLI selection for Act mode
- Fallback mechanism display
- Comprehensive state management

**State Management Pattern**:
```typescript
const {
  messages,
  isLoading,
  isConnected,
  currentSession,
  sendMessage,
  executeAct,
  clearMessages
} = useChat({ projectId, conversationId });
```

**Integration Insights**:
- Clean separation between chat and act modes
- Unified message handling for both modes
- Context-aware placeholder text based on session status

### 3. MessageInput Component

**File**: `/apps/web/components/chat/MessageInput.tsx`

**Key Features**:
- Multi-image upload with drag & drop
- Base64 encoding for image data
- Image preview with remove functionality
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

**Image Upload Implementation**:
```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  const newImages: ImageAttachment[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    
    const imageData = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    newImages.push({
      name: file.name,
      url: imageData,
      base64_data: imageData.split(',')[1],
      mime_type: file.type
    });
  }

  setUploadedImages(prev => [...prev, ...newImages]);
};
```

**Reusable Patterns**:
- Async file processing with Promise-based FileReader
- Image preview grid with hover effects
- Proper cleanup of file input references

## Hook Analysis

### 1. useChat Hook

**File**: `/apps/web/hooks/useChat.ts`

**Advanced Features**:
- Smart message merging within 5-second windows
- Request ID tracking for WebSocket correlation
- Adaptive polling for active request status
- Error boundary integration

**Message Merging Logic**:
```typescript
// Merge if:
// 1. Same role and conversation
// 2. Within 5 seconds 
// 3. Last message is not tool_use and current is chat
if (
  lastMessage.role === message.role && 
  lastMessage.conversation_id === message.conversation_id &&
  timeDiff < 5000 && 
  lastMessage.message_type !== 'tool_use' &&
  message.message_type === 'chat'
) {
  const mergedMessage = {
    ...lastMessage,
    content: lastMessage.content + '\n\n' + message.content,
    created_at: message.created_at,
    id: message.id
  };
  return [...prev.slice(0, -1), mergedMessage];
}
```

### 2. useWebSocket Hook

**File**: `/apps/web/hooks/useWebSocket.ts`

**Robust Features**:
- Exponential backoff reconnection (up to 5 attempts)
- Comprehensive message type handling
- Request ID correlation for status updates
- Graceful degradation on connection failure

**Reconnection Strategy**:
```typescript
if (shouldReconnectRef.current) {
  const attempts = connectionAttemptsRef.current + 1;
  connectionAttemptsRef.current = attempts;
  
  if (attempts < 5) {
    const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }
}
```

### 3. useCLI Hook

**File**: `/apps/web/hooks/useCLI.ts`

**Dynamic Features**:
- Real-time CLI status checking
- Model preference management
- Fallback configuration
- Status caching and optimization

## TypeScript Definitions

### Chat Types

**File**: `/apps/web/types/chat.ts`

**Comprehensive Type System**:
```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  message_type?: 'chat' | 'error' | 'info' | 'tool_use';
  content: string;
  metadata_json?: Record<string, any>;
  parent_message_id?: string;
  session_id?: string;
  conversation_id?: string;
  cli_source?: string;
  request_id?: string;
  created_at: string;
}

export interface ImageAttachment {
  name: string;
  url: string;
  base64_data?: string;
  mime_type?: string;
}
```

### CLI Types

**File**: `/apps/web/types/cli.ts`

**Flexible CLI System**:
```typescript
export interface CLIOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
  available: boolean;
  configured: boolean;
  models?: CLIModel[];
  enabled?: boolean;
}
```

## Styling Patterns

### Tailwind Configuration

**File**: `/apps/web/tailwind.config.ts`

**Custom Design System**:
- Brand color palette with 50-900 variants
- Bolt-specific color tokens for dark theme
- Custom border and background colors
- Consistent spacing and typography scales

**Key Patterns**:
```typescript
colors: {
  brand: {
    50: '#f2f7ff', 100: '#e6efff', 200: '#cce0ff', 
    300: '#99c2ff', 400: '#66a3ff', 500: '#3385ff',
    600: '#1a73e8', 700: '#1557b0', 800: '#0f3b78', 900: '#0a2550'
  },
  'bolt-bg-primary': '#0c0a14',
  'bolt-bg-secondary': '#15111e',
  'bolt-bg-tertiary': '#1e1a2a'
}
```

## Integration Recommendations

### 1. Immediate Wins

**High-Priority Integrations**:
- **Image Upload System**: Direct integration of drag-and-drop functionality
- **CLI Selection Modal**: Adapt for our terminal launcher use case
- **Message Merging Logic**: Improve user experience for rapid responses
- **Status Indicators**: Connection and session status display
- **Dark Mode Support**: Complete theme system

### 2. Component Reuse Strategy

**Recommended Integration Order**:
1. **MessageInput** → Enhance our chat input with image support
2. **CLISelector** → Adapt for terminal/command selection
3. **MessageList** → Improve message display with grouping
4. **ChatHeader** → Add mode switching and status indicators
5. **WebSocket Hook** → Upgrade real-time communication

### 3. Advanced Features

**Future Enhancements**:
- **Request Tracking**: Implement useUserRequests for operation monitoring
- **Session Management**: Add persistent session state
- **Fallback Mechanisms**: CLI preference and fallback handling
- **Performance Optimization**: Message virtualization for large conversations

### 4. Code Patterns to Adopt

**State Management**:
```typescript
// Centralized hook pattern
const {
  data,
  isLoading,
  error,
  actions: { create, update, delete }
} = useCustomHook({ config });
```

**Error Boundary Integration**:
```typescript
// Comprehensive error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  setError('User-friendly error message');
  throw error;
}
```

**Responsive Design Pattern**:
```typescript
// Consistent responsive classes
className={`
  flex items-center gap-2
  px-4 py-2
  bg-white dark:bg-gray-800
  border border-gray-200 dark:border-gray-700
  rounded-lg
  hover:bg-gray-50 dark:hover:bg-gray-700
  transition-colors
`}
```

## Potential Issues to Avoid

### 1. Performance Concerns

**WebSocket Connection Management**:
- Ensure proper cleanup of WebSocket connections
- Implement connection pooling for multiple project contexts
- Add rate limiting for message sending

**Memory Leaks**:
- Clear intervals and timeouts in useEffect cleanup
- Remove event listeners properly
- Manage file upload references correctly

### 2. Type Safety Issues

**Missing Types**:
- Ensure all API responses have proper TypeScript interfaces
- Add runtime validation for WebSocket messages
- Type image upload file constraints

### 3. User Experience Issues

**Loading States**:
- Add skeleton loading for message list
- Implement optimistic updates for message sending
- Show progress indicators for file uploads

**Error Recovery**:
- Implement retry mechanisms for failed operations
- Provide clear error messages with actionable solutions
- Add offline state detection and handling

## Implementation Priority Matrix

### High Priority (Immediate Integration)
1. **Image Upload Component** - Critical for chat functionality
2. **WebSocket Reconnection** - Essential for reliability
3. **Message Grouping** - Improves user experience
4. **Status Indicators** - Provides user feedback

### Medium Priority (Next Sprint)
1. **CLI Selection Modal** - Enhance terminal launcher
2. **Dark Mode Support** - User preference feature
3. **Request Tracking** - Operation monitoring
4. **Error Boundaries** - Robust error handling

### Low Priority (Future Enhancement)
1. **Animation System** - Polish and user delight
2. **Performance Optimization** - Scalability improvements
3. **Advanced Theming** - Brand customization
4. **Session Persistence** - Cross-tab synchronization

## Conclusion

The Claudable reference implementation demonstrates sophisticated patterns for building a robust chat interface. The most valuable aspects for immediate integration are the image upload system, WebSocket reliability patterns, and the comprehensive type system. The modular architecture makes it straightforward to adopt specific components while maintaining our simplified approach.

**Next Steps**:
1. Implement image upload functionality in our MessageInput component
2. Enhance WebSocket reliability with reconnection logic
3. Add CLI selection modal for our terminal launcher
4. Integrate dark mode support across the application
5. Implement comprehensive error handling patterns

The codebase follows modern React best practices and provides excellent patterns for scalable chat application development.