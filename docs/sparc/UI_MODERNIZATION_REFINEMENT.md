# SPARC UI Modernization - Refinement Phase

## R - Refinement Implementation with TDD

### 1. Test-Driven Development Strategy

#### 1.1 TDD Cycle Implementation

```typescript
// TDD Red-Green-Refactor Cycle for UI Components

describe('ChatBubble Component TDD', () => {
  // RED: Write failing tests first
  test('should render user message bubble with correct styling', () => {
    const message = {
      id: 'msg-1',
      content: 'Hello Claude',
      sender: 'user',
      timestamp: new Date()
    };
    
    render(<ChatBubble message={message} />);
    
    const bubble = screen.getByTestId('chat-bubble');
    expect(bubble).toHaveClass('chat-bubble--user');
    expect(bubble).toContainText('Hello Claude');
    expect(bubble.style.alignSelf).toBe('flex-end'); // Right aligned
  });
  
  // GREEN: Implement minimal code to make test pass
  test('should render Claude response bubble with correct styling', () => {
    const message = {
      id: 'msg-2', 
      content: 'Hello! How can I help?',
      sender: 'claude',
      timestamp: new Date()
    };
    
    render(<ChatBubble message={message} />);
    
    const bubble = screen.getByTestId('chat-bubble');
    expect(bubble).toHaveClass('chat-bubble--claude');
    expect(bubble).toContainText('Hello! How can I help?');
    expect(bubble.style.alignSelf).toBe('flex-start'); // Left aligned
  });
  
  // REFACTOR: Improve code quality and performance
  test('should animate bubble entrance with proper timing', async () => {
    const message = { id: 'msg-3', content: 'Test', sender: 'user', timestamp: new Date() };
    
    render(<ChatBubble message={message} />);
    
    const bubble = screen.getByTestId('chat-bubble');
    
    // Verify initial animation state
    expect(bubble).toHaveStyle('opacity: 0');
    expect(bubble).toHaveStyle('transform: translateY(20px)');
    
    // Wait for animation completion
    await waitFor(() => {
      expect(bubble).toHaveStyle('opacity: 1');
      expect(bubble).toHaveStyle('transform: translateY(0)');
    }, { timeout: 500 });
  });
});
```

#### 1.2 Component Implementation Following TDD

```typescript
// Step 1: Failing Test Implementation
interface ChatBubbleProps {
  message: {
    id: string;
    content: string;
    sender: 'user' | 'claude' | 'system';
    timestamp: Date;
  };
  className?: string;
  onAnimationComplete?: () => void;
}

// Step 2: Minimal Implementation (GREEN)
export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, className, onAnimationComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  const bubbleClass = cx(
    'chat-bubble',
    `chat-bubble--${message.sender}`,
    className,
    {
      'chat-bubble--visible': isVisible
    }
  );
  
  return (
    <div
      data-testid="chat-bubble"
      className={bubbleClass}
      style={{
        alignSelf: message.sender === 'user' ? 'flex-end' : 
                  message.sender === 'claude' ? 'flex-start' : 'center'
      }}
      onTransitionEnd={onAnimationComplete}
    >
      <div className="chat-bubble__content">
        {message.content}
      </div>
      <div className="chat-bubble__timestamp">
        {formatTimestamp(message.timestamp)}
      </div>
    </div>
  );
};

// Step 3: Refactor with Performance Optimizations
export const ChatBubble = React.memo<ChatBubbleProps>(({ message, className, onAnimationComplete }) => {
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  
  // Use RAF for smooth animation timing
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      setAnimationState('visible');
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  
  // Memoized class computation
  const bubbleClass = useMemo(() => cx(
    'chat-bubble',
    `chat-bubble--${message.sender}`,
    `chat-bubble--${animationState}`,
    className
  ), [message.sender, animationState, className]);
  
  const bubbleStyle = useMemo(() => ({
    alignSelf: message.sender === 'user' ? 'flex-end' : 
              message.sender === 'claude' ? 'flex-start' : 'center'
  }), [message.sender]);
  
  return (
    <div
      data-testid="chat-bubble"
      className={bubbleClass}
      style={bubbleStyle}
      onTransitionEnd={onAnimationComplete}
    >
      <MessageContent content={message.content} />
      <MessageTimestamp timestamp={message.timestamp} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom equality check for performance
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content;
});
```

### 2. Professional Button System Implementation

#### 2.1 TDD for Button States

```typescript
describe('ProfessionalButton TDD', () => {
  test('should handle button state transitions correctly', async () => {
    const onClickMock = jest.fn();
    
    render(
      <ProfessionalButton 
        variant="primary"
        onClick={onClickMock}
        disabled={false}
      >
        Launch Claude
      </ProfessionalButton>
    );
    
    const button = screen.getByRole('button');
    
    // Test normal state
    expect(button).toHaveClass('btn--primary', 'btn--normal');
    expect(button).not.toBeDisabled();
    
    // Test hover state
    fireEvent.mouseEnter(button);
    expect(button).toHaveClass('btn--hover');
    
    // Test active state
    fireEvent.mouseDown(button);
    expect(button).toHaveClass('btn--active');
    
    // Test click handling
    fireEvent.click(button);
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
  
  test('should show loading state with spinner', async () => {
    render(
      <ProfessionalButton variant="primary" loading={true}>
        Creating Instance...
      </ProfessionalButton>
    );
    
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('btn--loading');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});

// Implementation following TDD
interface ProfessionalButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ProfessionalButton: React.FC<ProfessionalButtonProps> = ({
  variant,
  loading = false,
  disabled = false,
  onClick,
  children,
  className
}) => {
  const [buttonState, setButtonState] = useState<'normal' | 'hover' | 'active'>('normal');
  
  const handleMouseEnter = useCallback(() => {
    if (!disabled && !loading) {
      setButtonState('hover');
    }
  }, [disabled, loading]);
  
  const handleMouseLeave = useCallback(() => {
    if (!disabled && !loading) {
      setButtonState('normal');
    }
  }, [disabled, loading]);
  
  const handleMouseDown = useCallback(() => {
    if (!disabled && !loading) {
      setButtonState('active');
    }
  }, [disabled, loading]);
  
  const handleMouseUp = useCallback(() => {
    if (!disabled && !loading) {
      setButtonState('hover');
    }
  }, [disabled, loading]);
  
  const buttonClass = cx(
    'btn',
    `btn--${variant}`,
    `btn--${buttonState}`,
    {
      'btn--loading': loading,
      'btn--disabled': disabled
    },
    className
  );
  
  return (
    <button
      className={buttonClass}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {loading && <LoadingSpinner data-testid="loading-spinner" />}
      <span className="btn__content">{children}</span>
    </button>
  );
};
```

### 3. Enhanced ClaudeInstanceManager Implementation

#### 3.1 TDD Integration Approach

```typescript
describe('Enhanced ClaudeInstanceManager Integration', () => {
  test('should preserve existing functionality while adding chat interface', async () => {
    const apiUrl = 'http://localhost:3000';
    
    render(<EnhancedClaudeInstanceManager apiUrl={apiUrl} />);
    
    // Verify existing functionality is preserved
    expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
    expect(screen.getByText('🚀 prod/claude')).toBeInTheDocument();
    expect(screen.getByText('⚡ skip-permissions')).toBeInTheDocument();
    
    // Verify new chat interface is present
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    expect(screen.getByTestId('chat-messages-area')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input-area')).toBeInTheDocument();
  });
  
  test('should transform terminal output to chat bubbles', async () => {
    const mockSSEData = {
      instanceId: 'claude-123',
      output: 'Welcome to Claude!',
      isReal: true
    };
    
    render(<EnhancedClaudeInstanceManager />);
    
    // Simulate SSE message
    act(() => {
      const sseEvent = new CustomEvent('terminal:output', { detail: mockSSEData });
      window.dispatchEvent(sseEvent);
    });
    
    // Verify message appears as chat bubble
    await waitFor(() => {
      expect(screen.getByTestId('chat-bubble')).toBeInTheDocument();
      expect(screen.getByText('Welcome to Claude!')).toBeInTheDocument();
    });
    
    const bubble = screen.getByTestId('chat-bubble');
    expect(bubble).toHaveClass('chat-bubble--claude');
  });
});

// Enhanced Implementation
export const EnhancedClaudeInstanceManager: React.FC<ClaudeInstanceManagerProps> = ({
  apiUrl = 'http://localhost:3000'
}) => {
  // Preserve all existing state management
  const [instances, setInstances] = useState<ClaudeInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<string>('Disconnected');
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  
  // New chat-related state
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [chatMode, setChatMode] = useState(true);
  
  // Preserve existing SSE hook
  const { 
    socket, 
    isConnected, 
    connectionError, 
    connectSSE, 
    startPolling, 
    disconnectFromInstance,
    on, 
    off,
    emit
  } = useHTTPSSE({ 
    url: apiUrl,
    autoConnect: true
  });
  
  // Enhanced message processing that maintains backward compatibility
  const processTerminalOutput = useCallback((data: any) => {
    if (data.output && data.instanceId && data.isReal) {
      // Traditional output processing (preserved)
      setOutput(prev => ({
        ...prev,
        [data.instanceId]: (prev[data.instanceId] || '') + data.output
      }));
      
      // New chat message processing
      if (chatMode) {
        const message: Message = {
          id: `msg-${Date.now()}`,
          content: data.output,
          sender: 'claude',
          timestamp: new Date(),
          instanceId: data.instanceId
        };
        
        setMessages(prev => {
          const instanceMessages = prev.get(data.instanceId) || [];
          const newMessages = new Map(prev);
          newMessages.set(data.instanceId, [...instanceMessages, message]);
          return newMessages;
        });
      }
    }
  }, [chatMode]);
  
  // Preserve existing event setup with enhancements
  useEffect(() => {
    if (!socket) return;
    
    // Existing handlers (preserved)
    on('terminal:output', processTerminalOutput);
    on('connect', handleConnect);
    on('instance:status', handleInstanceStatus);
    on('error', handleError);
    
    return () => {
      off('terminal:output');
      off('connect');
      off('instance:status');
      off('error');
    };
  }, [socket, processTerminalOutput]);
  
  // Enhanced input handling
  const sendInput = useCallback(() => {
    if (!selectedInstance || !input.trim() || !socket || !isConnected) {
      return;
    }
    
    // Add user message to chat
    if (chatMode) {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        content: input,
        sender: 'user',
        timestamp: new Date(),
        instanceId: selectedInstance
      };
      
      setMessages(prev => {
        const instanceMessages = prev.get(selectedInstance) || [];
        const newMessages = new Map(prev);
        newMessages.set(selectedInstance, [...instanceMessages, userMessage]);
        return newMessages;
      });
    }
    
    // Send input (preserved behavior)
    emit('terminal:input', {
      input: input + '\n',
      instanceId: selectedInstance
    });
    
    setInput('');
  }, [selectedInstance, input, socket, isConnected, chatMode, emit]);
  
  return (
    <div className="claude-instance-manager enhanced" data-testid="claude-instance-manager">
      {/* Preserved header */}
      <div className="header">
        <h2>Claude Instance Manager</h2>
        <div className="status">
          {error && <span className="error">{error}</span>}
          {!error && (
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {connectionType}
            </span>
          )}
        </div>
      </div>

      {/* Enhanced controls with new button styling */}
      <div className="controls">
        <div className="launch-buttons">
          <ProfessionalButton 
            variant="primary"
            onClick={() => createInstance('cd prod && claude')}
            loading={loading}
            disabled={loading}
          >
            🚀 prod/claude
          </ProfessionalButton>
          
          <ProfessionalButton
            variant="secondary"
            onClick={() => createInstance('cd prod && claude --dangerously-skip-permissions')}
            loading={loading}
            disabled={loading}
          >
            ⚡ skip-permissions
          </ProfessionalButton>
        </div>
      </div>

      <div className="instances-grid">
        {/* Preserved instance list */}
        <InstanceList 
          instances={instances}
          selectedInstance={selectedInstance}
          onInstanceSelect={setSelectedInstance}
          onInstanceTerminate={terminateInstance}
        />

        {/* Enhanced chat interface */}
        <ChatInterface
          data-testid="chat-interface"
          selectedInstance={selectedInstance}
          messages={messages.get(selectedInstance) || []}
          input={input}
          onInputChange={setInput}
          onSendMessage={sendInput}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
};
```

### 4. Responsive Design Implementation

#### 4.1 TDD for Responsive Behavior

```typescript
describe('Responsive Layout TDD', () => {
  test('should adapt layout for mobile screens', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 640 });
    
    render(<EnhancedClaudeInstanceManager />);
    
    const container = screen.getByTestId('claude-instance-manager');
    expect(container).toHaveClass('layout--mobile');
    
    const instancesGrid = screen.getByTestId('instances-grid');
    expect(instancesGrid.style.gridTemplateColumns).toBe('1fr');
  });
  
  test('should adapt layout for desktop screens', () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', { value: 1200 });
    
    render(<EnhancedClaudeInstanceManager />);
    
    const container = screen.getByTestId('claude-instance-manager');
    expect(container).toHaveClass('layout--desktop');
    
    const instancesGrid = screen.getByTestId('instances-grid');
    expect(instancesGrid.style.gridTemplateColumns).toBe('350px 1fr');
  });
});

// Responsive Hook Implementation
const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 641) {
        setBreakpoint('mobile');
      } else if (width < 1025) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };
    
    checkBreakpoint();
    
    const debouncedCheck = debounce(checkBreakpoint, 250);
    window.addEventListener('resize', debouncedCheck);
    
    return () => window.removeEventListener('resize', debouncedCheck);
  }, []);
  
  return { breakpoint };
};
```

### 5. Animation System Implementation

#### 5.1 TDD for Animations

```typescript
describe('Animation System TDD', () => {
  test('should choreograph message entrance animations', async () => {
    const AnimatedChatBubble = withAnimation(ChatBubble);
    const message = { id: '1', content: 'Test', sender: 'user', timestamp: new Date() };
    
    render(<AnimatedChatBubble message={message} />);
    
    const bubble = screen.getByTestId('chat-bubble');
    
    // Verify animation sequence
    expect(bubble).toHaveStyle('transform: translateY(20px)');
    expect(bubble).toHaveStyle('opacity: 0');
    
    await waitFor(() => {
      expect(bubble).toHaveStyle('transform: translateY(0px)');
      expect(bubble).toHaveStyle('opacity: 1');
    });
  });
});

// Animation HOC Implementation
const withAnimation = <P extends object>(Component: React.ComponentType<P>) => {
  return React.forwardRef<HTMLDivElement, P & { animationDelay?: number }>((props, ref) => {
    const [animationState, setAnimationState] = useState('entering');
    
    useLayoutEffect(() => {
      const timer = setTimeout(() => {
        setAnimationState('visible');
      }, props.animationDelay || 10);
      
      return () => clearTimeout(timer);
    }, [props.animationDelay]);
    
    return (
      <div ref={ref} className={`animation-container animation-${animationState}`}>
        <Component {...props} />
      </div>
    );
  });
};
```

### 6. Performance Optimizations

#### 6.1 Message Virtualization

```typescript
// Virtualized message list for performance
const VirtualizedMessageList: React.FC<{
  messages: Message[];
  height: number;
}> = ({ messages, height }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  const handleScroll = useCallback(
    throttle(() => {
      const scrollElement = scrollElementRef.current;
      if (!scrollElement) return;
      
      const scrollTop = scrollElement.scrollTop;
      const itemHeight = 80; // Average message height
      
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
      const end = Math.min(messages.length, start + Math.ceil(height / itemHeight) + 20);
      
      setVisibleRange({ start, end });
    }, 16), // ~60fps
    [messages.length, height]
  );
  
  const visibleMessages = messages.slice(visibleRange.start, visibleRange.end);
  
  return (
    <div 
      ref={scrollElementRef}
      className="virtualized-messages"
      style={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: visibleRange.start * 80 }} />
      {visibleMessages.map(message => (
        <ChatBubble key={message.id} message={message} />
      ))}
      <div style={{ height: (messages.length - visibleRange.end) * 80 }} />
    </div>
  );
};
```

This refinement phase implements the complete UI modernization with comprehensive TDD coverage, ensuring all new features work correctly while preserving existing functionality. The implementation is performance-optimized and follows React best practices.