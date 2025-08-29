/**
 * WebSocket Failure Patterns Database
 * 
 * NLD-powered database documenting real-world WebSocket dependency failures
 * and anti-patterns identified from the TokenCostAnalytics component migration.
 * 
 * Created: 2025-01-27
 * Component: TokenCostAnalytics WebSocket Dependency Analysis
 * Purpose: Document failures when WebSocket is removed but dependencies remain
 */

export interface WebSocketFailurePattern {
  id: string;
  pattern: string;
  description: string;
  category: 'dependency_chain' | 'real_time_updates' | 'error_boundaries' | 'state_management';
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggerConditions: string[];
  failureSymptoms: string[];
  affectedComponents: string[];
  rootCause: string;
  preventionStrategy: string;
  detectionMethod: string;
  exampleCode?: string;
  fixedCode?: string;
  tddTestCase?: string;
  neuralTrainingData: {
    inputPatterns: string[];
    expectedOutcome: string;
    failureIndicators: string[];
  };
}

/**
 * Comprehensive database of WebSocket dependency failure patterns
 * identified from TokenCostAnalytics component analysis
 */
export const websocketFailurePatterns: WebSocketFailurePattern[] = [
  {
    id: 'WSF-001',
    pattern: 'Phantom WebSocket Hook Dependency',
    description: 'Component imports useWebSocketSingleton but WebSocket is mocked/removed',
    category: 'dependency_chain',
    severity: 'high',
    triggerConditions: [
      'useWebSocketSingleton hook called',
      'WebSocket implementation is mocked',
      'Real-time updates expected but not functional',
      'Component assumes live connection'
    ],
    failureSymptoms: [
      'isConnected shows false despite mock returning true',
      'Real-time token updates never arrive',
      'Loading states persist indefinitely',
      'Mock console logs instead of real data flow',
      'Component shows "disconnected" status permanently'
    ],
    affectedComponents: [
      'TokenCostAnalytics',
      'useTokenCostTracking',
      'ConnectionStatus',
      'RealTimeNotifications'
    ],
    rootCause: 'Hook dependency chain expects real WebSocket but receives mock implementation',
    preventionStrategy: 'Implement graceful degradation patterns and mock detection',
    detectionMethod: 'Check for mock console logs and non-functional real-time features',
    exampleCode: `
// ANTI-PATTERN: Expecting real WebSocket functionality
const { socket, isConnected } = useWebSocketSingleton({
  url: getSocketIOUrl(),
  autoConnect: true
});

// Component logic assumes real connection
if (isConnected && socket) {
  socket.emit('token-usage', newUsage); // This is mocked!
}
    `,
    fixedCode: `
// FIXED: Detect mock and implement fallback
const { socket, isConnected } = useWebSocketSingleton({
  url: getSocketIOUrl(),
  autoConnect: true
});

// Detect mock implementation
const isMockSocket = socket?.id?.includes('http-sse');
const realConnection = isConnected && !isMockSocket;

if (realConnection && socket) {
  socket.emit('token-usage', newUsage);
} else {
  // Fallback: Store locally or use HTTP API
  await httpAPI.trackTokenUsage(newUsage);
}
    `,
    tddTestCase: `
it('should detect mock WebSocket and use fallback', () => {
  const { result } = renderHook(() => useTokenCostTracking());
  
  expect(result.current.isConnected).toBe(true); // Mock shows connected
  expect(result.current.socket.id).toContain('http-sse'); // But it's mocked
  
  // Should use fallback mechanisms
  expect(mockHttpAPI.trackTokenUsage).toHaveBeenCalled();
});
    `,
    neuralTrainingData: {
      inputPatterns: [
        'useWebSocketSingleton import with mock implementation',
        'socket.emit calls that produce console.log output',
        'isConnected true but no real data flow'
      ],
      expectedOutcome: 'Component should detect mock and implement fallback strategy',
      failureIndicators: [
        'Mock console logs in production',
        'Real-time features not working',
        'Infinite loading states'
      ]
    }
  },

  {
    id: 'WSF-002',
    pattern: 'Real-time Update Dependency Without Fallback',
    description: 'Component depends on real-time WebSocket events but has no HTTP fallback',
    category: 'real_time_updates',
    severity: 'critical',
    triggerConditions: [
      'WebSocket real-time updates removed',
      'No HTTP polling fallback implemented',
      'Component expects live data streams',
      'User interactions require immediate updates'
    ],
    failureSymptoms: [
      'Token cost data never updates',
      'Stale data displayed indefinitely',
      'Budget alerts not triggered',
      'Cost metrics remain at zero',
      'Loading states that never resolve'
    ],
    affectedComponents: [
      'TokenCostAnalytics',
      'useTokenCostTracking',
      'Budget monitoring system'
    ],
    rootCause: 'No alternative data fetching mechanism when WebSocket unavailable',
    preventionStrategy: 'Implement HTTP polling fallback and data refresh mechanisms',
    detectionMethod: 'Monitor for stale timestamps and non-updating metrics',
    exampleCode: `
// ANTI-PATTERN: Only WebSocket updates, no fallback
useEffect(() => {
  if (socket && isConnected) {
    socket.on('token-usage-update', handleTokenUpdate);
  }
  // No fallback when WebSocket unavailable!
}, [socket, isConnected]);
    `,
    fixedCode: `
// FIXED: HTTP fallback when WebSocket unavailable
useEffect(() => {
  if (socket && isConnected && !isMockSocket) {
    socket.on('token-usage-update', handleTokenUpdate);
  } else {
    // HTTP polling fallback
    const interval = setInterval(async () => {
      try {
        const data = await fetchTokenUsageData();
        setTokenUsages(data);
      } catch (error) {
        setError(error);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }
}, [socket, isConnected]);
    `,
    tddTestCase: `
it('should implement HTTP fallback when WebSocket unavailable', async () => {
  mockWebSocket.mockImplementation(() => ({ 
    isConnected: false,
    socket: null 
  }));
  
  const { result } = renderHook(() => useTokenCostTracking());
  
  await waitFor(() => {
    expect(mockFetchTokenUsageData).toHaveBeenCalled();
  });
  
  expect(result.current.tokenUsages.length).toBeGreaterThan(0);
});
    `,
    neuralTrainingData: {
      inputPatterns: [
        'WebSocket event listeners without fallback',
        'Real-time data expectations',
        'Missing HTTP polling implementation'
      ],
      expectedOutcome: 'Implement HTTP polling when WebSocket unavailable',
      failureIndicators: [
        'Stale data timestamps',
        'Non-updating metrics',
        'Permanent loading states'
      ]
    }
  },

  {
    id: 'WSF-003',
    pattern: 'Context Provider Chain Disruption',
    description: 'WebSocket context provides mock data but child components expect real functionality',
    category: 'state_management',
    severity: 'high',
    triggerConditions: [
      'WebSocketSingletonProvider provides mock socket',
      'Child components use useWebSocketSingletonContext',
      'Context switching from real to mock implementation',
      'Multiple components sharing same context'
    ],
    failureSymptoms: [
      'Context value inconsistencies',
      '55 components affected by mock context',
      'Connection status shows wrong state',
      'Notifications system non-functional',
      'System stats always null'
    ],
    affectedComponents: [
      'WebSocketSingletonProvider',
      'ConnectionStatus',
      'RealTimeNotifications',
      '55 components using useWebSocketSingletonContext'
    ],
    rootCause: 'Context provides mock implementation but consumers expect real WebSocket functionality',
    preventionStrategy: 'Implement context migration pattern with feature flags',
    detectionMethod: 'Count affected components and monitor context state consistency',
    exampleCode: `
// ANTI-PATTERN: Context provides mock but consumers expect real functionality
const contextValue = {
  socket: mockSocket, // Mock object
  isConnected: true,  // Misleading - not really connected
  notifications: [],  // Always empty
  systemStats: null   // Always null
};
    `,
    fixedCode: `
// FIXED: Context indicates mock status and provides alternatives
const contextValue = {
  socket: mockSocket,
  isConnected: false, // Honest about mock status
  isMockMode: true,   // Explicit mock flag
  notifications: demoNotifications, // Demo data
  systemStats: demoStats,          // Demo stats
  alternativeDataSource: httpAPI   // HTTP fallback
};
    `,
    tddTestCase: `
it('should handle context transition from real to mock', () => {
  const TestComponent = () => {
    const { isConnected, isMockMode } = useWebSocketSingletonContext();
    return <div data-testid="status">{isConnected ? 'connected' : 'disconnected'}</div>;
  };
  
  const { rerender, getByTestId } = render(
    <WebSocketSingletonProvider config={{ mockMode: true }}>
      <TestComponent />
    </WebSocketSingletonProvider>
  );
  
  expect(getByTestId('status')).toHaveTextContent('disconnected');
});
    `,
    neuralTrainingData: {
      inputPatterns: [
        'Context provider with mock implementation',
        'Multiple components using same context',
        'Transition from real to mock WebSocket'
      ],
      expectedOutcome: 'Context should clearly indicate mock status and provide alternatives',
      failureIndicators: [
        'Context value inconsistencies',
        'Large number of affected components',
        'Misleading connection status'
      ]
    }
  },

  {
    id: 'WSF-004',
    pattern: 'Error Boundary Inadequacy for WebSocket Failures',
    description: 'Error boundaries not configured to handle WebSocket dependency failures gracefully',
    category: 'error_boundaries',
    severity: 'medium',
    triggerConditions: [
      'WebSocket connection fails',
      'Real-time components throw errors',
      'Error boundary catches WebSocket errors',
      'No specific WebSocket error handling'
    ],
    failureSymptoms: [
      'Generic error boundary fallback UI',
      'Loss of entire component tree',
      'No recovery mechanism for WebSocket failures',
      'User sees technical error messages',
      'No graceful degradation'
    ],
    affectedComponents: [
      'ErrorBoundary',
      'WebSocketErrorBoundary',
      'TokenCostAnalytics wrapper components'
    ],
    rootCause: 'Error boundaries not specialized for WebSocket-related failures',
    preventionStrategy: 'Implement specialized WebSocket error boundaries with recovery',
    detectionMethod: 'Monitor error boundary activation and WebSocket error types',
    exampleCode: `
// ANTI-PATTERN: Generic error boundary for WebSocket errors
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Generic handling - doesn't distinguish WebSocket errors
    this.setState({ hasError: true });
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>; // Generic message
    }
    return this.props.children;
  }
}
    `,
    fixedCode: `
// FIXED: Specialized WebSocket error boundary
class WebSocketErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    if (error.message.includes('WebSocket') || error.stack.includes('useWebSocketSingleton')) {
      this.setState({ 
        hasWebSocketError: true,
        canRecover: true 
      });
    } else {
      this.setState({ hasError: true });
    }
  }
  
  render() {
    if (this.state.hasWebSocketError) {
      return (
        <div className="websocket-error-fallback">
          <p>Real-time features unavailable. Using cached data.</p>
          <button onClick={this.retry}>Retry Connection</button>
        </div>
      );
    }
    return this.props.children;
  }
}
    `,
    tddTestCase: `
it('should handle WebSocket errors gracefully', () => {
  const ThrowError = () => {
    throw new Error('WebSocket connection failed');
  };
  
  const { getByText } = render(
    <WebSocketErrorBoundary>
      <ThrowError />
    </WebSocketErrorBoundary>
  );
  
  expect(getByText(/real-time features unavailable/i)).toBeInTheDocument();
  expect(getByText(/retry connection/i)).toBeInTheDocument();
});
    `,
    neuralTrainingData: {
      inputPatterns: [
        'Error boundary catching WebSocket errors',
        'Generic error handling for connection failures',
        'No recovery mechanism implementation'
      ],
      expectedOutcome: 'Specialized error boundary with WebSocket recovery options',
      failureIndicators: [
        'Generic error messages for WebSocket failures',
        'No retry/recovery options',
        'Complete component tree failure'
      ]
    }
  },

  {
    id: 'WSF-005',
    pattern: 'Demo Data Confusion in Production',
    description: 'Component loads demo data when WebSocket unavailable, confusing users about real vs mock data',
    category: 'state_management',
    severity: 'medium',
    triggerConditions: [
      'WebSocket connection unavailable',
      'Component loads demo/fallback data',
      'No clear indication of demo mode',
      'User cannot distinguish real from mock data'
    ],
    failureSymptoms: [
      'Demo data shown as real data',
      'Confusing token cost metrics',
      'Budget alerts based on fake data',
      'Users making decisions on incorrect information',
      'Small "Demo Mode" indicator easily missed'
    ],
    affectedComponents: [
      'TokenCostAnalytics',
      'useTokenCostTracking demo data',
      'Budget status indicators'
    ],
    rootCause: 'Insufficient visual distinction between real and demo data modes',
    preventionStrategy: 'Implement clear demo mode indicators and user education',
    detectionMethod: 'Monitor for demo data being displayed without clear indicators',
    exampleCode: `
// ANTI-PATTERN: Demo data without clear indication
if (!isConnected) {
  const demoData = [...]; // Demo data loaded
  setTokenUsages(demoData);
  // Small indicator easily missed:
  // <span className="text-amber-600">Demo Mode</span>
}
    `,
    fixedCode: `
// FIXED: Clear demo mode indication
if (!isConnected) {
  const demoData = [...];
  setTokenUsages(demoData);
  setDemoMode(true);
}

// In component render:
{demoMode && (
  <div className="demo-mode-banner">
    <AlertTriangle className="w-5 h-5" />
    <strong>DEMO MODE:</strong> This is sample data for demonstration purposes.
    Real-time updates are currently unavailable.
  </div>
)}
    `,
    tddTestCase: `
it('should clearly indicate demo mode when WebSocket unavailable', () => {
  mockWebSocket.mockReturnValue({ isConnected: false });
  
  const { getByText } = render(<TokenCostAnalytics />);
  
  expect(getByText(/demo mode/i)).toBeVisible();
  expect(getByText(/sample data/i)).toBeInTheDocument();
  expect(getByText(/real-time updates.*unavailable/i)).toBeInTheDocument();
});
    `,
    neuralTrainingData: {
      inputPatterns: [
        'Demo data loading without clear indication',
        'Small or hidden demo mode indicators',
        'User confusion about data authenticity'
      ],
      expectedOutcome: 'Prominent demo mode indicator with clear user education',
      failureIndicators: [
        'Demo data presented as real',
        'Missed or small demo indicators',
        'User confusion reports'
      ]
    }
  }
];

/**
 * WebSocket Dependency Chain Analysis
 * Maps the complete dependency chain that was affected by WebSocket removal
 */
export interface ComponentDependencyMap {
  component: string;
  directDependencies: string[];
  indirectDependencies: string[];
  failureImpact: 'high' | 'medium' | 'low';
  recoveryStrategy: string;
}

export const websocketDependencyChain: ComponentDependencyMap[] = [
  {
    component: 'TokenCostAnalytics',
    directDependencies: [
      'useTokenCostTracking',
      'useWebSocketSingleton'
    ],
    indirectDependencies: [
      'WebSocketSingletonContext',
      'getSocketIOUrl',
      'websocket-url.ts'
    ],
    failureImpact: 'high',
    recoveryStrategy: 'Implement HTTP polling fallback and demo data with clear indicators'
  },
  {
    component: 'useTokenCostTracking',
    directDependencies: [
      'useWebSocketSingleton',
      'getSocketIOUrl'
    ],
    indirectDependencies: [
      'WebSocketSingletonProvider',
      'socket.emit/on methods'
    ],
    failureImpact: 'high',
    recoveryStrategy: 'Mock detection and localStorage-based persistence'
  },
  {
    component: 'ConnectionStatus',
    directDependencies: [
      'useWebSocketSingletonContext'
    ],
    indirectDependencies: [
      'WebSocketSingletonProvider context value'
    ],
    failureImpact: 'medium',
    recoveryStrategy: 'Display honest connection status and alternative indicators'
  },
  {
    component: 'RealTimeNotifications',
    directDependencies: [
      'useWebSocketSingletonContext'
    ],
    indirectDependencies: [
      'WebSocket notification events'
    ],
    failureImpact: 'medium',
    recoveryStrategy: 'Local notification management with HTTP sync'
  }
];

/**
 * Neural Training Export Function
 * Exports patterns in format suitable for claude-flow neural training
 */
export function exportNeuralTrainingData() {
  return websocketFailurePatterns.map(pattern => ({
    patternId: pattern.id,
    category: pattern.category,
    severity: pattern.severity,
    inputFeatures: [
      ...pattern.triggerConditions,
      ...pattern.neuralTrainingData.inputPatterns
    ],
    expectedOutput: pattern.neuralTrainingData.expectedOutcome,
    failureSignals: [
      ...pattern.failureSymptoms,
      ...pattern.neuralTrainingData.failureIndicators
    ],
    preventionCode: pattern.fixedCode,
    testValidation: pattern.tddTestCase
  }));
}

/**
 * Pattern Detection Function
 * Analyzes code to detect WebSocket anti-patterns
 */
export function detectWebSocketAntiPatterns(codeString: string): string[] {
  const detectedPatterns: string[] = [];
  
  // WSF-001: Phantom WebSocket Hook Dependency
  if (codeString.includes('useWebSocketSingleton') && 
      codeString.includes('socket.emit') &&
      codeString.includes('console.log')) {
    detectedPatterns.push('WSF-001');
  }
  
  // WSF-002: No fallback for real-time updates
  if (codeString.includes('socket.on(') && 
      !codeString.includes('setInterval') &&
      !codeString.includes('fetch')) {
    detectedPatterns.push('WSF-002');
  }
  
  // WSF-003: Context provider with mock
  if (codeString.includes('WebSocketSingletonContext') &&
      codeString.includes('mockSocket')) {
    detectedPatterns.push('WSF-003');
  }
  
  // WSF-004: Generic error boundary
  if (codeString.includes('ErrorBoundary') &&
      !codeString.includes('WebSocket') &&
      codeString.includes('componentDidCatch')) {
    detectedPatterns.push('WSF-004');
  }
  
  // WSF-005: Demo data without indication
  if (codeString.includes('demoData') &&
      !codeString.includes('Demo Mode') &&
      !codeString.includes('demo-mode-banner')) {
    detectedPatterns.push('WSF-005');
  }
  
  return detectedPatterns;
}

export default {
  patterns: websocketFailurePatterns,
  dependencyChain: websocketDependencyChain,
  exportNeuralTrainingData,
  detectWebSocketAntiPatterns
};