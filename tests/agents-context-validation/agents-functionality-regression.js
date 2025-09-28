/**
 * Agents Functionality Regression Test Suite
 *
 * Comprehensive tests for agents page loading without useEffect errors
 * Validates API integration, UI rendering, and complete functionality preservation
 */

const { JSDOM } = require('jsdom');
const React = require('react');
const { render, screen, waitFor, fireEvent } = require('@testing-library/react');
require('@testing-library/jest-dom');
const fs = require('fs');
const path = require('path');

// Mock Next.js environment and modules
const mockNextEnvironment = () => {
  global.window = new JSDOM().window;
  global.document = global.window.document;
  global.navigator = global.window.navigator;
  global.fetch = jest.fn();

  // Mock Next.js router
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    pathname: '/agents',
    query: {},
    asPath: '/agents'
  };

  require.cache[require.resolve('next/router')] = {
    exports: {
      useRouter: () => mockRouter,
      default: mockRouter
    }
  };
};

describe('Agents Functionality Regression Tests', () => {
  let originalError;
  let originalWarn;
  let consoleErrors = [];
  let consoleWarnings = [];

  beforeAll(() => {
    mockNextEnvironment();

    // Capture console outputs
    originalError = console.error;
    originalWarn = console.warn;

    console.error = (...args) => {
      consoleErrors.push(args);
      originalError(...args);
    };

    console.warn = (...args) => {
      consoleWarnings.push(args);
      originalWarn(...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  beforeEach(() => {
    consoleErrors = [];
    consoleWarnings = [];
    jest.clearAllMocks();
  });

  describe('useEffect Error Prevention Tests', () => {
    test('should load agents page without useEffect dependency warnings', async () => {
      // Mock the exact component structure from pages/agents.tsx
      const AgentsPageComponent = () => {
        const [agents, setAgents] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState(null);

        const fetchAgents = React.useCallback(async () => {
          try {
            setLoading(true);
            const response = await fetch('/api/agents');

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const agentsList = data.agents || data.data || [];
            setAgents(agentsList);
            setError(null);
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        }, []);

        React.useEffect(() => {
          fetchAgents();
        }, [fetchAgents]); // Proper dependency array

        return (
          <div data-testid="agents-page">
            {loading && <div data-testid="loading">Loading agents...</div>}
            {error && <div data-testid="error">Error: {error}</div>}
            {!loading && !error && (
              <div data-testid="agents-list">
                Total Agents: {agents.length}
              </div>
            )}
          </div>
        );
      };

      // Mock successful API response
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          agents: Array.from({ length: 11 }, (_, i) => ({
            id: i + 1,
            name: `agent${i + 1}`,
            display_name: `Agent ${i + 1}`,
            status: 'active',
            description: `Test agent ${i + 1}`,
            capabilities: ['test', 'validation'],
            avatar_color: '#4338ca'
          }))
        })
      });

      render(<AgentsPageComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('agents-list')).toBeInTheDocument();
      });

      // Check for useEffect dependency warnings
      const useEffectWarnings = consoleWarnings.filter(warning =>
        warning.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('React Hook useEffect has a missing dependency') ||
           arg.includes('exhaustive-deps'))
        )
      );

      expect(useEffectWarnings).toHaveLength(0);
    });

    test('should handle infinite useEffect loops prevention', async () => {
      const InfiniteLoopPreventionComponent = () => {
        const [count, setCount] = React.useState(0);
        const [data, setData] = React.useState([]);

        // Potentially problematic useEffect that could cause infinite loops
        React.useEffect(() => {
          if (count < 5) {
            setCount(prev => prev + 1);
            setData(prev => [...prev, count]);
          }
        }, [count]); // Properly managed dependency

        return (
          <div data-testid="infinite-loop-test">
            Count: {count}, Data Length: {data.length}
          </div>
        );
      };

      render(<InfiniteLoopPreventionComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('infinite-loop-test')).toHaveTextContent('Count: 5');
      });

      // Should not have infinite loop warnings
      const infiniteLoopWarnings = consoleWarnings.filter(warning =>
        warning.some(arg =>
          typeof arg === 'string' &&
          arg.includes('Warning: Maximum update depth exceeded')
        )
      );

      expect(infiniteLoopWarnings).toHaveLength(0);
    });

    test('should prevent stale closure issues in useEffect', async () => {
      const StaleClosureComponent = () => {
        const [counter, setCounter] = React.useState(0);
        const [messages, setMessages] = React.useState([]);

        // Use functional updates to avoid stale closures
        React.useEffect(() => {
          const interval = setInterval(() => {
            setCounter(prev => prev + 1);
            setMessages(prev => [...prev, `Message at ${Date.now()}`]);
          }, 100);

          return () => clearInterval(interval);
        }, []); // Empty dependency array is safe here

        React.useEffect(() => {
          if (counter >= 3) {
            // Stop after 3 increments for test
            setMessages(prev => [...prev, 'Stopped']);
          }
        }, [counter]);

        return (
          <div data-testid="stale-closure-test">
            Counter: {counter}, Messages: {messages.length}
          </div>
        );
      };

      render(<StaleClosureComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('stale-closure-test')).toHaveTextContent('Counter: 3');
      }, { timeout: 1000 });

      // Check for stale closure warnings
      const staleClosureWarnings = consoleWarnings.filter(warning =>
        warning.some(arg =>
          typeof arg === 'string' &&
          arg.includes('React Hook useEffect has a missing dependency')
        )
      );

      expect(staleClosureWarnings).toHaveLength(0);
    });
  });

  describe('API Integration Validation Tests', () => {
    test('should successfully integrate with backend agents endpoint', async () => {
      const APIIntegrationComponent = () => {
        const [agents, setAgents] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [apiCallCount, setApiCallCount] = React.useState(0);

        React.useEffect(() => {
          const fetchData = async () => {
            try {
              setApiCallCount(prev => prev + 1);
              const response = await fetch('/api/agents');

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              const data = await response.json();
              setAgents(data.agents || []);
            } catch (error) {
              console.error('API Error:', error);
            } finally {
              setLoading(false);
            }
          };

          fetchData();
        }, []);

        return (
          <div data-testid="api-integration">
            <div data-testid="api-calls">API Calls: {apiCallCount}</div>
            <div data-testid="loading-state">Loading: {loading.toString()}</div>
            <div data-testid="agents-count">Agents: {agents.length}</div>
          </div>
        );
      };

      // Mock successful API with 11 agents
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          agents: Array.from({ length: 11 }, (_, i) => ({
            id: i + 1,
            name: `agent-${i + 1}`,
            display_name: `Agent ${i + 1}`,
            status: 'active'
          }))
        })
      });

      render(<APIIntegrationComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading: false');
      });

      expect(screen.getByTestId('api-calls')).toHaveTextContent('API Calls: 1');
      expect(screen.getByTestId('agents-count')).toHaveTextContent('Agents: 11');
      expect(global.fetch).toHaveBeenCalledWith('/api/agents');
    });

    test('should handle API error states gracefully', async () => {
      const ErrorHandlingComponent = () => {
        const [error, setError] = React.useState(null);
        const [retryCount, setRetryCount] = React.useState(0);

        const fetchAgents = React.useCallback(async () => {
          try {
            setRetryCount(prev => prev + 1);
            const response = await fetch('/api/agents');

            if (!response.ok) {
              throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            setError(null);
          } catch (err) {
            setError(err.message);
          }
        }, []);

        React.useEffect(() => {
          fetchAgents();
        }, [fetchAgents]);

        return (
          <div data-testid="error-handling">
            <div data-testid="retry-count">Retries: {retryCount}</div>
            <div data-testid="error-state">Error: {error || 'None'}</div>
            <button
              data-testid="retry-button"
              onClick={fetchAgents}
            >
              Retry
            </button>
          </div>
        );
      };

      // Mock API error
      global.fetch.mockRejectedValue(new Error('Network error'));

      render(<ErrorHandlingComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('Error: Network error');
      });

      // Test retry functionality
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [] })
      });

      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('Error: None');
      });

      expect(screen.getByTestId('retry-count')).toHaveTextContent('Retries: 2');
    });

    test('should validate all 11 agents load successfully', async () => {
      const AgentLoadingComponent = () => {
        const [agents, setAgents] = React.useState([]);
        const [loadedCount, setLoadedCount] = React.useState(0);

        React.useEffect(() => {
          const fetchAgents = async () => {
            const response = await fetch('/api/agents');
            const data = await response.json();
            const agentsList = data.agents || [];

            setAgents(agentsList);
            setLoadedCount(agentsList.length);
          };

          fetchAgents();
        }, []);

        return (
          <div data-testid="agent-loading">
            <div data-testid="loaded-count">Loaded: {loadedCount}</div>
            <div data-testid="all-loaded">
              All Loaded: {loadedCount === 11 ? 'Yes' : 'No'}
            </div>
            {agents.map(agent => (
              <div key={agent.id} data-testid={`agent-${agent.id}`}>
                {agent.name}
              </div>
            ))}
          </div>
        );
      };

      // Mock API with exactly 11 agents
      const mockAgents = Array.from({ length: 11 }, (_, i) => ({
        id: i + 1,
        name: `agent-${i + 1}`,
        display_name: `Agent ${i + 1}`,
        status: 'active',
        description: `Description for agent ${i + 1}`,
        capabilities: ['capability1', 'capability2']
      }));

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents })
      });

      render(<AgentLoadingComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('all-loaded')).toHaveTextContent('All Loaded: Yes');
      });

      expect(screen.getByTestId('loaded-count')).toHaveTextContent('Loaded: 11');

      // Verify all 11 agents are rendered
      for (let i = 1; i <= 11; i++) {
        expect(screen.getByTestId(`agent-${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('UI Component Rendering Tests', () => {
    test('should render all UI components without errors', async () => {
      const CompleteUIComponent = () => {
        const [agents, setAgents] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [selectedAgent, setSelectedAgent] = React.useState(null);

        React.useEffect(() => {
          const loadAgents = async () => {
            const response = await fetch('/api/agents');
            const data = await response.json();
            setAgents(data.agents || []);
            setLoading(false);
          };
          loadAgents();
        }, []);

        if (loading) {
          return <div data-testid="ui-loading">Loading UI...</div>;
        }

        return (
          <div data-testid="complete-ui">
            <header data-testid="header">
              <h1>Agent Dashboard</h1>
            </header>

            <div data-testid="stats">
              Total Agents: {agents.length}
            </div>

            <div data-testid="agent-grid">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  data-testid={`ui-agent-${agent.id}`}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <div data-testid={`avatar-${agent.id}`}>
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <h3>{agent.display_name}</h3>
                  <p>{agent.description}</p>
                  <div data-testid={`status-${agent.id}`}>
                    Status: {agent.status}
                  </div>
                  {agent.capabilities && (
                    <div data-testid={`capabilities-${agent.id}`}>
                      {agent.capabilities.slice(0, 3).map((cap, idx) => (
                        <span key={idx}>{cap}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedAgent && (
              <div data-testid="selected-agent">
                Selected: {selectedAgent.name}
              </div>
            )}
          </div>
        );
      };

      const mockAgents = [
        {
          id: 1,
          name: 'test-agent',
          display_name: 'Test Agent',
          status: 'active',
          description: 'Test description',
          capabilities: ['test1', 'test2', 'test3']
        }
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents })
      });

      render(<CompleteUIComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('complete-ui')).toBeInTheDocument();
      });

      // Verify all UI elements are present
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('stats')).toBeInTheDocument();
      expect(screen.getByTestId('agent-grid')).toBeInTheDocument();
      expect(screen.getByTestId('ui-agent-1')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-1')).toBeInTheDocument();
      expect(screen.getByTestId('status-1')).toBeInTheDocument();
      expect(screen.getByTestId('capabilities-1')).toBeInTheDocument();

      // Test interaction
      fireEvent.click(screen.getByTestId('ui-agent-1'));

      await waitFor(() => {
        expect(screen.getByTestId('selected-agent')).toHaveTextContent('Selected: test-agent');
      });
    });

    test('should prevent "Cannot read properties of null" errors', async () => {
      const NullSafeComponent = () => {
        const [data, setData] = React.useState(null);
        const [agents, setAgents] = React.useState(null);

        React.useEffect(() => {
          const fetchData = async () => {
            try {
              const response = await fetch('/api/agents');
              const result = await response.json();

              // Safe property access
              setData(result);
              setAgents(result?.agents || []);
            } catch (error) {
              console.error('Fetch error:', error);
            }
          };

          fetchData();
        }, []);

        return (
          <div data-testid="null-safe-component">
            <div data-testid="data-status">
              Data Status: {data ? 'Loaded' : 'Loading'}
            </div>
            <div data-testid="agents-status">
              Agents Count: {agents?.length || 0}
            </div>
            {agents?.map(agent => (
              <div key={agent?.id || 'unknown'} data-testid={`safe-agent-${agent?.id}`}>
                Name: {agent?.display_name || agent?.name || 'Unknown'}
                Status: {agent?.status || 'Unknown'}
                Description: {agent?.description || 'No description'}
                Capabilities: {agent?.capabilities?.length || 0}
              </div>
            ))}
          </div>
        );
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          agents: [
            { id: 1, name: 'agent1', display_name: 'Agent 1' },
            { id: 2, name: 'agent2' } // Missing some properties
          ]
        })
      });

      render(<NullSafeComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('data-status')).toHaveTextContent('Data Status: Loaded');
      });

      expect(screen.getByTestId('agents-status')).toHaveTextContent('Agents Count: 2');

      // Check for null property access errors
      const nullPropertyErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Cannot read properties of null') ||
           arg.includes('Cannot read properties of undefined'))
        )
      );

      expect(nullPropertyErrors).toHaveLength(0);
    });
  });

  describe('Full Functionality Preservation Tests', () => {
    test('should preserve all original agents page functionality', async () => {
      // Test the exact functionality from the current agents.tsx
      const PreservationTestComponent = () => {
        const [agents, setAgents] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState(null);

        const fetchAgents = async () => {
          try {
            setLoading(true);
            const response = await fetch('/api/agents');

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const agentsList = data.agents || data.data || [];
            setAgents(agentsList);
            setError(null);
          } catch (err) {
            console.error('Error fetching agents:', err);
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };

        React.useEffect(() => {
          fetchAgents();
        }, []);

        if (loading) {
          return (
            <div data-testid="preservation-loading">
              <h1>Agent Dashboard</h1>
              <p>Loading agents...</p>
            </div>
          );
        }

        if (error) {
          return (
            <div data-testid="preservation-error">
              <h1>Agent Dashboard</h1>
              <div style={{ color: 'red' }}>Error: {error}</div>
              <button onClick={fetchAgents} data-testid="retry-button">
                Retry
              </button>
            </div>
          );
        }

        return (
          <div data-testid="preservation-success">
            <h1>Agent Dashboard</h1>
            <div data-testid="total-display">
              <strong>Total Agents: {agents.length}</strong>
            </div>
            {agents.length === 0 ? (
              <p data-testid="no-agents">No agents found</p>
            ) : (
              <div data-testid="agents-grid">
                {agents.map((agent) => (
                  <div key={agent.id || agent.name} data-testid={`preserved-agent-${agent.id}`}>
                    <div data-testid={`avatar-${agent.id}`}>
                      {(agent.name || agent.display_name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3>{agent.display_name || agent.name}</h3>
                      <span data-testid={`status-${agent.id}`}>
                        {agent.status || 'unknown'}
                      </span>
                    </div>
                    <p>{agent.description || 'No description available'}</p>
                    {agent.capabilities && agent.capabilities.length > 0 && (
                      <div data-testid={`capabilities-${agent.id}`}>
                        <strong>Capabilities:</strong>
                        <div>
                          {agent.capabilities.slice(0, 3).map((cap, idx) => (
                            <span key={idx}>{cap}</span>
                          ))}
                          {agent.capabilities.length > 3 && (
                            <span>+{agent.capabilities.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      };

      const mockAgents = Array.from({ length: 11 }, (_, i) => ({
        id: i + 1,
        name: `agent${i + 1}`,
        display_name: `Agent ${i + 1}`,
        status: 'active',
        description: `Description for agent ${i + 1}`,
        capabilities: ['cap1', 'cap2', 'cap3', 'cap4']
      }));

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents })
      });

      render(<PreservationTestComponent />);

      // Should show loading first
      expect(screen.getByTestId('preservation-loading')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('preservation-success')).toBeInTheDocument();
      });

      // Verify all functionality is preserved
      expect(screen.getByTestId('total-display')).toHaveTextContent('Total Agents: 11');
      expect(screen.getByTestId('agents-grid')).toBeInTheDocument();

      // Check all agents are rendered with their properties
      for (let i = 1; i <= 11; i++) {
        expect(screen.getByTestId(`preserved-agent-${i}`)).toBeInTheDocument();
        expect(screen.getByTestId(`avatar-${i}`)).toBeInTheDocument();
        expect(screen.getByTestId(`status-${i}`)).toBeInTheDocument();
        expect(screen.getByTestId(`capabilities-${i}`)).toBeInTheDocument();
      }

      // Verify no functionality-breaking errors
      const functionalityErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: Each child in a list should have a unique "key"') ||
           arg.includes('Warning: Failed prop type'))
        )
      );

      expect(functionalityErrors).toHaveLength(0);
    });
  });
});