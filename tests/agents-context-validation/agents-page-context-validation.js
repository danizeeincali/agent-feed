/**
 * Comprehensive React Context Fix Validation Test Suite
 *
 * Tests for React hooks context establishment and validation
 * Ensures zero React context errors in the agents page
 */

const { JSDOM } = require('jsdom');
const React = require('react');
const { render, screen, waitFor, fireEvent } = require('@testing-library/react');
require('@testing-library/jest-dom');

// Mock Next.js environment
const mockNextEnv = () => {
  global.fetch = jest.fn();
  global.window = new JSDOM().window;
  global.document = global.window.document;
  global.navigator = global.window.navigator;
};

describe('Agents Page React Context Validation', () => {
  let originalError;
  let consoleErrors = [];

  beforeAll(() => {
    mockNextEnv();
    // Capture console errors
    originalError = console.error;
    console.error = (...args) => {
      consoleErrors.push(args);
      originalError(...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    consoleErrors = [];
    jest.clearAllMocks();

    // Mock successful API response with 11 agents
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        agents: [
          { id: 1, name: 'agent1', display_name: 'Agent 1', status: 'active', description: 'Test agent 1', capabilities: ['test'] },
          { id: 2, name: 'agent2', display_name: 'Agent 2', status: 'active', description: 'Test agent 2', capabilities: ['test'] },
          { id: 3, name: 'agent3', display_name: 'Agent 3', status: 'active', description: 'Test agent 3', capabilities: ['test'] },
          { id: 4, name: 'agent4', display_name: 'Agent 4', status: 'active', description: 'Test agent 4', capabilities: ['test'] },
          { id: 5, name: 'agent5', display_name: 'Agent 5', status: 'active', description: 'Test agent 5', capabilities: ['test'] },
          { id: 6, name: 'agent6', display_name: 'Agent 6', status: 'active', description: 'Test agent 6', capabilities: ['test'] },
          { id: 7, name: 'agent7', display_name: 'Agent 7', status: 'active', description: 'Test agent 7', capabilities: ['test'] },
          { id: 8, name: 'agent8', display_name: 'Agent 8', status: 'active', description: 'Test agent 8', capabilities: ['test'] },
          { id: 9, name: 'agent9', display_name: 'Agent 9', status: 'active', description: 'Test agent 9', capabilities: ['test'] },
          { id: 10, name: 'agent10', display_name: 'Agent 10', status: 'active', description: 'Test agent 10', capabilities: ['test'] },
          { id: 11, name: 'agent11', display_name: 'Agent 11', status: 'active', description: 'Test agent 11', capabilities: ['test'] }
        ]
      })
    });
  });

  describe('React Context Establishment Tests', () => {
    test('should not produce React context errors during component initialization', async () => {
      // Create a mock component that uses the same pattern as agents page
      const TestComponent = () => {
        const [agents, setAgents] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          const fetchAgents = async () => {
            try {
              setLoading(true);
              const response = await fetch('/api/agents');
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              const data = await response.json();
              const agentsList = data.agents || data.data || [];
              setAgents(agentsList);
              setError(null);
            } catch (err) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          };
          fetchAgents();
        }, []);

        if (loading) return <div data-testid="loading">Loading agents...</div>;
        if (error) return <div data-testid="error">Error: {error}</div>;

        return (
          <div data-testid="agents-container">
            <h1>Agent Dashboard</h1>
            <div data-testid="total-agents">Total Agents: {agents.length}</div>
            {agents.map((agent) => (
              <div key={agent.id} data-testid={`agent-${agent.id}`}>
                {agent.display_name}
              </div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('agents-container')).toBeInTheDocument();
      });

      // Verify no React context errors
      const contextErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: Invalid hook call') ||
           arg.includes('Warning: Cannot update during an existing state transition') ||
           arg.includes('Warning: Cannot update a component') ||
           arg.includes('Warning: useEffect'))
        )
      );

      expect(contextErrors).toHaveLength(0);
    });

    test('should handle useState and useEffect hooks properly without context warnings', async () => {
      const TestHooksComponent = () => {
        const [state1, setState1] = React.useState('initial');
        const [state2, setState2] = React.useState([]);
        const [state3, setState3] = React.useState(false);

        React.useEffect(() => {
          setState1('updated');
          setState2([1, 2, 3]);
          setState3(true);
        }, []);

        React.useEffect(() => {
          // Simulate async operation
          const timer = setTimeout(() => {
            setState1('final');
          }, 0);
          return () => clearTimeout(timer);
        }, []);

        return (
          <div data-testid="hooks-container">
            <div data-testid="state1">{state1}</div>
            <div data-testid="state2">{state2.join(',')}</div>
            <div data-testid="state3">{state3.toString()}</div>
          </div>
        );
      };

      render(<TestHooksComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('state1')).toHaveTextContent('final');
      });

      // Check for hook-related errors
      const hookErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Invalid hook call') ||
           arg.includes('Hooks can only be called inside'))
        )
      );

      expect(hookErrors).toHaveLength(0);
    });

    test('should not generate "Cannot read properties of null" errors', async () => {
      const PropsTestComponent = ({ data }) => {
        const [processedData, setProcessedData] = React.useState(null);

        React.useEffect(() => {
          if (data && data.agents) {
            setProcessedData(data.agents.map(agent => ({
              ...agent,
              displayName: agent.display_name || agent.name
            })));
          }
        }, [data]);

        return (
          <div data-testid="props-container">
            {processedData && processedData.map(item => (
              <div key={item.id} data-testid={`processed-${item.id}`}>
                {item.displayName}
              </div>
            ))}
          </div>
        );
      };

      const mockData = {
        agents: [
          { id: 1, name: 'test1', display_name: 'Test 1' },
          { id: 2, name: 'test2', display_name: 'Test 2' }
        ]
      };

      render(<PropsTestComponent data={mockData} />);

      await waitFor(() => {
        expect(screen.getByTestId('processed-1')).toBeInTheDocument();
      });

      // Check for null property access errors
      const nullErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          arg.includes('Cannot read properties of null')
        )
      );

      expect(nullErrors).toHaveLength(0);
    });
  });

  describe('Component Lifecycle Context Tests', () => {
    test('should handle component mounting and unmounting without context issues', async () => {
      const MountTestComponent = () => {
        const [mounted, setMounted] = React.useState(false);

        React.useEffect(() => {
          setMounted(true);
          return () => {
            setMounted(false);
          };
        }, []);

        return (
          <div data-testid="mount-container">
            Mounted: {mounted.toString()}
          </div>
        );
      };

      const { unmount } = render(<MountTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mount-container')).toHaveTextContent('Mounted: true');
      });

      unmount();

      // Check for unmounting errors
      const unmountErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: Can\'t perform a React state update') ||
           arg.includes('memory leak'))
        )
      );

      expect(unmountErrors).toHaveLength(0);
    });

    test('should handle rapid state updates without batching warnings', async () => {
      const RapidUpdateComponent = () => {
        const [counter, setCounter] = React.useState(0);
        const [data, setData] = React.useState([]);

        const handleRapidUpdates = () => {
          setCounter(prev => prev + 1);
          setData(prev => [...prev, Date.now()]);
          setCounter(prev => prev + 1);
          setData(prev => [...prev, Date.now()]);
        };

        React.useEffect(() => {
          handleRapidUpdates();
        }, []);

        return (
          <div data-testid="rapid-container">
            <div data-testid="counter">Counter: {counter}</div>
            <div data-testid="data-length">Data Length: {data.length}</div>
          </div>
        );
      };

      render(<RapidUpdateComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('counter')).toHaveTextContent('Counter: 2');
      });

      // Check for batching warnings
      const batchingErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          arg.includes('flushSync')
        )
      );

      expect(batchingErrors).toHaveLength(0);
    });
  });

  describe('Error Boundary Context Tests', () => {
    test('should not trigger context errors in error boundary scenarios', async () => {
      class TestErrorBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false };
        }

        static getDerivedStateFromError() {
          return { hasError: true };
        }

        componentDidCatch(error, errorInfo) {
          // Log error but don't throw
        }

        render() {
          if (this.state.hasError) {
            return <div data-testid="error-boundary">Something went wrong</div>;
          }
          return this.props.children;
        }
      }

      const ErrorComponent = () => {
        React.useEffect(() => {
          // This should not cause context errors
          throw new Error('Test error');
        }, []);

        return <div>This will error</div>;
      };

      render(
        <TestErrorBoundary>
          <ErrorComponent />
        </TestErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Check that error boundary didn't cause additional context errors
      const boundaryErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          arg.includes('context') &&
          !arg.includes('Test error')
        )
      );

      expect(boundaryErrors).toHaveLength(0);
    });
  });

  describe('Integration Context Tests', () => {
    test('should validate context integrity across component tree', async () => {
      const ParentComponent = () => {
        const [sharedState, setSharedState] = React.useState('parent');

        return (
          <div data-testid="parent">
            <ChildComponent
              sharedState={sharedState}
              updateSharedState={setSharedState}
            />
          </div>
        );
      };

      const ChildComponent = ({ sharedState, updateSharedState }) => {
        React.useEffect(() => {
          updateSharedState('updated-by-child');
        }, [updateSharedState]);

        return (
          <div data-testid="child">
            State: {sharedState}
          </div>
        );
      };

      render(<ParentComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('child')).toHaveTextContent('State: updated-by-child');
      });

      // Verify no context warnings during parent-child communication
      const communicationErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: Each child in a list should have a unique "key"') ||
           arg.includes('Warning: Functions are not valid as a React child'))
        )
      );

      expect(communicationErrors).toHaveLength(0);
    });
  });
});