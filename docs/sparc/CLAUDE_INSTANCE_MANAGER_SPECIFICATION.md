# SPARC SPECIFICATION: Claude Instance Management UI Integration

## Executive Summary

This specification defines the integration of Claudable's UI patterns into the existing agent-feed system, creating a streamlined Claude instance management interface with enhanced chat capabilities, image upload support, and real-time WebSocket communication.

## 1. FUNCTIONAL REQUIREMENTS

### 1.1 Core Features Required

**PRIMARY**: Claude-only multi-instance management
- Launch multiple Claude CLI instances with different configurations
- Switch between instances seamlessly
- Monitor instance status and health

**SECONDARY**: Enhanced chat interface with image upload
- Support drag-and-drop image uploads
- Clipboard image paste functionality
- Real-time message exchange with Claude instances

**TERTIARY**: Real-time WebSocket communication
- Live status updates for all instances
- Real-time terminal output streaming
- Bidirectional command/response handling

### 1.2 Features Explicitly Excluded

- Project management functionality
- Multi-CLI support (non-Claude CLIs)
- Global settings/preferences
- Act mode (code modification capabilities)
- API key management (using existing auth)

## 2. COMPONENT ARCHITECTURE

### 2.1 Primary Components

#### 2.1.1 ClaudeInstanceSelector
```typescript
interface ClaudeInstanceSelectorProps {
  instances: ClaudeInstance[];
  selectedInstance: string | null;
  onInstanceSelect: (instanceId: string) => void;
  onInstanceCreate: (config: InstanceConfig) => Promise<void>;
  onInstanceTerminate: (instanceId: string) => Promise<void>;
}
```

**Responsibilities:**
- Display available Claude instances in a sidebar/panel
- Show instance status indicators (running, stopped, error)
- Provide quick launch buttons for common configurations
- Handle instance lifecycle management

#### 2.1.2 EnhancedChatInterface
```typescript
interface EnhancedChatInterfaceProps {
  instanceId: string | null;
  messages: ChatMessage[];
  onSendMessage: (content: string, images?: ImageAttachment[]) => void;
  isConnected: boolean;
  status: InstanceStatus;
}
```

**Responsibilities:**
- Render chat history with Claude instance
- Handle text input with enhanced formatting
- Support image upload via drag-and-drop, clipboard, and file selection
- Show typing indicators and connection status

#### 2.1.3 ImageUploadManager
```typescript
interface ImageUploadManagerProps {
  onImagesSelected: (images: ImageAttachment[]) => void;
  maxImages?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}
```

**Responsibilities:**
- Handle multiple image upload methods (drag-drop, paste, file selection)
- Validate file types and sizes
- Generate thumbnails and previews
- Manage image state until message send

#### 2.1.4 InstanceStatusIndicator
```typescript
interface InstanceStatusIndicatorProps {
  instance: ClaudeInstance;
  showDetails?: boolean;
  onDetailsToggle?: () => void;
}
```

**Responsibilities:**
- Display real-time status (running, starting, stopped, error)
- Show performance metrics (CPU, memory, uptime)
- Indicate connection quality and latency
- Provide status history and logs access

### 2.2 Component Integration Flow

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│ ClaudeInstanceMgr   │    │ EnhancedChatInterface│    │ WebSocketProvider   │
│                     │    │                      │    │                     │
│ ┌─────────────────┐ │    │ ┌──────────────────┐ │    │ ┌─────────────────┐ │
│ │ InstanceSelector│ │◄──►│ │ ChatMessages     │ │◄──►│ │ ConnectionMgr   │ │
│ │                 │ │    │ │                  │ │    │ │                 │ │
│ │ StatusIndicator │ │    │ │ ImageUploadMgr   │ │    │ │ MessageRouter   │ │
│ │                 │ │    │ │                  │ │    │ │                 │ │
│ │ LaunchButtons   │ │    │ │ MessageInput     │ │    │ │ StatusUpdater   │ │
│ └─────────────────┘ │    │ └──────────────────┘ │    │ └─────────────────┘ │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## 3. ENHANCED CHAT INTERFACE SPECIFICATIONS

### 3.1 Message Input Component

#### 3.1.1 Text Input Features
- Multi-line textarea with auto-resize (max 200px)
- Shift+Enter for new lines, Enter to send
- Syntax highlighting for code blocks
- Markdown preview support

#### 3.1.2 Image Upload Integration
```typescript
interface ImageAttachment {
  id: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  type: string;
  uploaded: boolean;
}
```

**Upload Methods:**
1. **Drag and Drop**: Visual drop zone with hover effects
2. **File Selection**: Traditional file picker button
3. **Clipboard Paste**: Ctrl+V image paste support
4. **URL Input**: Optional URL-based image addition

#### 3.1.3 Image Upload Flow
```
1. Image Selection → 2. Validation → 3. Upload → 4. Thumbnail → 5. Attach to Message
     (File/Drop/Paste)     (Size/Type)     (To Server)    (Preview)      (Send with Text)
```

### 3.2 Message Display Component

#### 3.2.1 Message Types
- **User messages**: Text + attached images
- **Claude responses**: Formatted text with code blocks
- **System messages**: Status updates, errors, notifications
- **Image messages**: Inline image display with metadata

#### 3.2.2 Message Formatting
- Markdown rendering for Claude responses
- Code syntax highlighting
- Image galleries for multiple attachments
- Timestamp and status indicators
- Copy/share functionality

### 3.3 Real-time Features

#### 3.3.1 Typing Indicators
- Show when Claude is processing
- Estimated response time
- Cancel/interrupt capabilities

#### 3.3.2 Live Status Updates
- Connection status in header
- Instance health monitoring
- Error state handling and recovery

## 4. WEBSOCKET MESSAGE HANDLING

### 4.1 Message Protocol

#### 4.1.1 Client to Server Messages
```typescript
// Instance Management
{
  type: 'instance_create',
  data: {
    command: string[],
    workingDirectory: string,
    environment?: Record<string, string>
  }
}

{
  type: 'instance_terminate',
  data: { instanceId: string }
}

// Chat Communication
{
  type: 'chat_message',
  data: {
    instanceId: string,
    content: string,
    images?: ImageAttachment[],
    timestamp: string
  }
}

// Status Requests
{
  type: 'status_request',
  data: { instanceId?: string }
}
```

#### 4.1.2 Server to Client Messages
```typescript
// Instance Updates
{
  type: 'instance_status',
  data: {
    instanceId: string,
    status: 'starting' | 'running' | 'stopped' | 'error',
    pid?: number,
    uptime?: number,
    resources?: {
      cpu: number,
      memory: number
    }
  }
}

// Chat Responses
{
  type: 'chat_response',
  data: {
    instanceId: string,
    content: string,
    timestamp: string,
    messageId: string
  }
}

// System Events
{
  type: 'system_event',
  data: {
    event: 'connection_lost' | 'reconnected' | 'instance_crashed',
    instanceId?: string,
    message: string
  }
}
```

### 4.2 WebSocket Connection Management

#### 4.2.1 Connection Strategy
- Use existing RobustWebSocketProvider
- Add Claude-specific message handlers
- Implement automatic reconnection with exponential backoff
- Maintain connection state per instance

#### 4.2.2 Error Handling
- Connection timeout recovery
- Message queue during disconnections
- User notification for connection issues
- Graceful degradation to polling

## 5. STATUS INDICATOR SYSTEM

### 5.1 Instance Status Types

#### 5.1.1 Primary States
```typescript
type InstanceStatus = 
  | 'starting'    // Initial launch, connecting
  | 'running'     // Active and responsive
  | 'idle'        // Running but no recent activity
  | 'busy'        // Processing request
  | 'stopping'    // Graceful shutdown
  | 'stopped'     // Not running
  | 'error'       // Failed or crashed
  | 'unknown';    // Status unclear
```

#### 5.1.2 Status Indicators

**Visual Design:**
- Color-coded dots (green=running, yellow=busy, red=error)
- Pulsing animation for transitional states
- Progress bars for long operations
- Tooltip with detailed information

**Information Displayed:**
- Current status with timestamp
- Uptime and last activity
- Resource usage (CPU, memory)
- Error messages if applicable
- Connection latency to instance

### 5.2 Health Monitoring

#### 5.2.1 Metrics Tracked
```typescript
interface InstanceHealth {
  status: InstanceStatus;
  uptime: number;
  lastActivity: Date;
  responseTime: number;
  errorCount: number;
  resources: {
    cpu: number;
    memory: number;
    threads: number;
  };
  connection: {
    quality: 'excellent' | 'good' | 'poor' | 'disconnected';
    latency: number;
    reconnections: number;
  };
}
```

#### 5.2.2 Alerting System
- Visual alerts for critical issues
- Notification badges for warnings
- Auto-recovery attempts
- User action suggestions

## 6. TERMINAL COMMAND INTEGRATION

### 6.1 Existing Command Support

#### 6.1.1 Current Commands
Based on analysis, the system supports:
- `claude` - Basic Claude CLI launch
- `claude -c` - Continue conversation mode
- `claude --resume` - Resume previous session
- `claude --dangerously-skip-permissions` - Skip permission prompts

#### 6.1.2 Command Mapping
```typescript
interface CommandConfiguration {
  id: string;
  name: string;
  description: string;
  command: string[];
  workingDirectory: string;
  icon: string;
  category: 'basic' | 'advanced' | 'development';
}

const PRESET_COMMANDS: CommandConfiguration[] = [
  {
    id: 'prod-claude',
    name: 'Production Claude',
    description: 'Launch Claude in production directory',
    command: ['claude'],
    workingDirectory: '/workspaces/agent-feed/prod',
    icon: '🚀',
    category: 'basic'
  },
  {
    id: 'skip-permissions',
    name: 'Skip Permissions',
    description: 'Launch with permission prompts skipped',
    command: ['claude', '--dangerously-skip-permissions'],
    workingDirectory: '/workspaces/agent-feed/prod',
    icon: '⚡',
    category: 'advanced'
  },
  // ... more configurations
];
```

### 6.2 Launch Button Interface

#### 6.2.1 Button Layout
- Quick access buttons for common commands
- Grouped by category (Basic, Advanced, Debug)
- Tooltip descriptions for each option
- Icon indicators for command type
- Disabled state for unavailable commands

#### 6.2.2 Custom Command Support
- Allow users to define custom launch configurations
- Save frequently used command combinations
- Environment variable support
- Working directory customization

## 7. API INTEGRATION POINTS

### 7.1 Backend Endpoints

#### 7.1.1 Instance Management
```typescript
// GET /api/claude/instances
Response: {
  success: boolean;
  instances: ClaudeInstance[];
}

// POST /api/claude/instances
Request: {
  command: string[];
  workingDirectory: string;
  environment?: Record<string, string>;
}
Response: {
  success: boolean;
  instanceId: string;
  error?: string;
}

// DELETE /api/claude/instances/:id
Response: {
  success: boolean;
  error?: string;
}
```

#### 7.1.2 Image Upload
```typescript
// POST /api/claude/instances/:id/upload
Request: FormData with image files
Response: {
  success: boolean;
  files: Array<{
    filename: string;
    path: string;
    url: string;
    size: number;
  }>;
  error?: string;
}
```

### 7.2 WebSocket Integration

#### 7.2.1 Namespace Configuration
```typescript
// Use existing WebSocket infrastructure
// Add Claude-specific event handlers
const claudeNamespace = io.of('/claude-instances');

claudeNamespace.on('connection', (socket) => {
  // Handle Claude instance communication
  socket.on('chat_message', handleChatMessage);
  socket.on('instance_command', handleInstanceCommand);
  socket.on('status_request', handleStatusRequest);
});
```

## 8. TDD TEST SCENARIOS

### 8.1 Component Unit Tests

#### 8.1.1 ClaudeInstanceSelector Tests
```typescript
describe('ClaudeInstanceSelector', () => {
  test('displays available instances correctly', () => {
    // Test instance list rendering
  });

  test('handles instance selection', () => {
    // Test selection state management
  });

  test('launches new instance with correct config', () => {
    // Test instance creation flow
  });

  test('terminates instance safely', () => {
    // Test instance termination
  });

  test('shows status indicators accurately', () => {
    // Test status display logic
  });
});
```

#### 8.1.2 ImageUploadManager Tests
```typescript
describe('ImageUploadManager', () => {
  test('handles drag and drop uploads', () => {
    // Test drag-drop functionality
  });

  test('validates file types and sizes', () => {
    // Test validation logic
  });

  test('generates image previews', () => {
    // Test thumbnail generation
  });

  test('manages upload progress', () => {
    // Test upload state management
  });

  test('handles clipboard paste images', () => {
    // Test paste functionality
  });
});
```

### 8.2 Integration Tests

#### 8.2.1 WebSocket Communication Tests
```typescript
describe('WebSocket Integration', () => {
  test('connects to Claude instance websocket', () => {
    // Test connection establishment
  });

  test('sends chat messages correctly', () => {
    // Test message sending
  });

  test('receives Claude responses', () => {
    // Test response handling
  });

  test('handles connection interruptions', () => {
    // Test reconnection logic
  });

  test('maintains message queue during disconnection', () => {
    // Test message queuing
  });
});
```

#### 8.2.2 Instance Management Tests
```typescript
describe('Instance Management', () => {
  test('creates instance with correct configuration', () => {
    // Test instance creation
  });

  test('monitors instance health', () => {
    // Test health monitoring
  });

  test('handles instance crashes gracefully', () => {
    // Test error recovery
  });

  test('cleans up resources on termination', () => {
    // Test cleanup procedures
  });
});
```

### 8.3 End-to-End Test Scenarios

#### 8.3.1 Complete User Workflows
```typescript
describe('E2E User Workflows', () => {
  test('launch instance and send chat message', () => {
    // Test complete interaction flow
  });

  test('upload image and send to Claude', () => {
    // Test image upload workflow
  });

  test('switch between multiple instances', () => {
    // Test multi-instance management
  });

  test('handle instance failure and recovery', () => {
    // Test error scenarios
  });

  test('reconnect after network interruption', () => {
    // Test network resilience
  });
});
```

### 8.4 Performance Tests

#### 8.4.1 Load Testing Scenarios
```typescript
describe('Performance Tests', () => {
  test('handles multiple concurrent instances', () => {
    // Test scalability
  });

  test('manages large image uploads efficiently', () => {
    // Test upload performance
  });

  test('maintains responsive UI during heavy load', () => {
    // Test UI responsiveness
  });

  test('WebSocket message throughput', () => {
    // Test message handling performance
  });
});
```

## 9. SUCCESS CRITERIA

### 9.1 Functional Success Metrics

#### 9.1.1 Core Functionality
- ✅ Users can launch multiple Claude instances with different configurations
- ✅ Users can switch between instances seamlessly
- ✅ Users can send text messages and receive responses in real-time
- ✅ Users can upload images via drag-drop, clipboard, or file selection
- ✅ System shows accurate status indicators for all instances

#### 9.1.2 User Experience
- ✅ Interface is intuitive and requires no training
- ✅ Response times are under 500ms for UI interactions
- ✅ Image uploads complete within 5 seconds for typical files
- ✅ Connection interruptions are handled gracefully
- ✅ Error messages are clear and actionable

### 9.2 Technical Success Metrics

#### 9.2.1 Performance Requirements
- WebSocket connection establishment: < 2 seconds
- Message send/receive latency: < 200ms
- Image upload processing: < 5 seconds for files under 10MB
- UI rendering performance: 60fps, no blocking operations
- Memory usage: < 100MB per instance in browser

#### 9.2.2 Reliability Requirements
- 99.9% uptime for WebSocket connections
- Automatic recovery from connection failures
- No data loss during network interruptions
- Graceful degradation when backend is unavailable
- Zero memory leaks during extended usage

### 9.3 Compatibility Requirements

#### 9.3.1 Browser Support
- Chrome 90+ (primary target)
- Firefox 88+ (secondary)
- Safari 14+ (secondary)
- Mobile browsers (responsive design)

#### 9.3.2 Integration Requirements
- Seamless integration with existing agent-feed UI
- No conflicts with current WebSocket infrastructure
- Backward compatibility with existing terminal commands
- Clean separation from project management features

## 10. IMPLEMENTATION PRIORITY

### 10.1 Phase 1: Core Instance Management (Week 1)
- Basic ClaudeInstanceSelector component
- Instance creation and termination
- Status indicators
- WebSocket connection setup

### 10.2 Phase 2: Chat Interface (Week 2)
- EnhancedChatInterface component
- Message sending and receiving
- Real-time updates
- Error handling

### 10.3 Phase 3: Image Upload (Week 3)
- ImageUploadManager component
- Multiple upload methods
- File validation and processing
- Integration with chat interface

### 10.4 Phase 4: Polish and Testing (Week 4)
- Comprehensive test suite
- Performance optimization
- UI/UX refinements
- Documentation completion

## CONCLUSION

This specification provides a comprehensive foundation for implementing the Claude Instance Management UI integration. The design leverages proven patterns from Claudable while adapting them to the agent-feed system's architecture and constraints. The modular component design ensures maintainability and testability, while the phased implementation approach allows for iterative development and validation.

The focus on simplified, Claude-only functionality ensures the implementation stays within scope while delivering maximum value to users who need efficient Claude instance management with enhanced communication capabilities.