/**
 * React Components Mock Factory
 * London School TDD - Component Behavior Verification
 */

const { jest } = require('@jest/globals');

/**
 * Mock React hooks for testing component behavior
 */
const mockReactHooks = {
  useState: jest.fn(),
  useEffect: jest.fn(),
  useContext: jest.fn(),
  useReducer: jest.fn(),
  useCallback: jest.fn(),
  useMemo: jest.fn(),
  useRef: jest.fn()
};

/**
 * Mock AgentsPage component behaviors
 */
class AgentsPageMock {
  constructor() {
    this.render = jest.fn();
    this.handleAgentSelect = jest.fn();
    this.handleSearchChange = jest.fn();
    this.handleFilterChange = jest.fn();
    this.handleRefresh = jest.fn();
    this.handleStatusToggle = jest.fn();
    
    // Component state mocks
    this.state = {
      agents: [],
      loading: false,
      error: null,
      searchTerm: '',
      selectedFilters: [],
      selectedAgent: null
    };

    // Props mocks
    this.props = {
      onAgentSelect: jest.fn(),
      onRefresh: jest.fn(),
      initialFilters: []
    };
  }

  /**
   * Factory for successful component behavior
   */
  static createWithDefaults() {
    const mock = new AgentsPageMock();
    
    // Mock successful agent loading
    mock.render.mockImplementation(() => ({
      type: 'div',
      props: {
        className: 'agents-page',
        'data-testid': 'agents-page'
      },
      children: [
        {
          type: 'div',
          props: { className: 'agents-header' }
        },
        {
          type: 'div',
          props: { className: 'agents-grid' }
        }
      ]
    }));

    mock.handleAgentSelect.mockImplementation((agentId) => {
      mock.state.selectedAgent = agentId;
      mock.props.onAgentSelect(agentId);
    });

    mock.handleSearchChange.mockImplementation((searchTerm) => {
      mock.state.searchTerm = searchTerm;
    });

    mock.handleFilterChange.mockImplementation((filters) => {
      mock.state.selectedFilters = filters;
    });

    mock.handleRefresh.mockImplementation(() => {
      mock.state.loading = true;
      return new Promise((resolve) => {
        setTimeout(() => {
          mock.state.loading = false;
          mock.props.onRefresh();
          resolve();
        }, 100);
      });
    });

    return mock;
  }

  /**
   * Factory for loading state
   */
  static createLoading() {
    const mock = new AgentsPageMock();
    mock.state.loading = true;
    
    mock.render.mockReturnValue({
      type: 'div',
      props: {
        className: 'agents-page loading',
        'data-testid': 'agents-page'
      }
    });

    return mock;
  }

  /**
   * Factory for error state
   */
  static createWithError(error = 'Failed to load agents') {
    const mock = new AgentsPageMock();
    mock.state.error = error;
    
    mock.render.mockReturnValue({
      type: 'div',
      props: {
        className: 'agents-page error',
        'data-testid': 'agents-page'
      }
    });

    return mock;
  }

  /**
   * Verify component interaction patterns
   */
  verifyUserInteractions() {
    expect(this.handleAgentSelect).toHaveBeenCalled();
    expect(this.props.onAgentSelect).toHaveBeenCalled();
  }

  verifySearchBehavior(expectedTerm) {
    expect(this.handleSearchChange).toHaveBeenCalledWith(expectedTerm);
    expect(this.state.searchTerm).toBe(expectedTerm);
  }

  verifyFilterBehavior(expectedFilters) {
    expect(this.handleFilterChange).toHaveBeenCalledWith(expectedFilters);
    expect(this.state.selectedFilters).toEqual(expectedFilters);
  }
}

/**
 * Mock AgentCard component behaviors
 */
class AgentCardMock {
  constructor() {
    this.render = jest.fn();
    this.handleClick = jest.fn();
    this.handleStatusToggle = jest.fn();
    this.handleConfigureClick = jest.fn();

    this.props = {
      agent: null,
      selected: false,
      onClick: jest.fn(),
      onStatusToggle: jest.fn(),
      onConfigure: jest.fn()
    };
  }

  static createWithDefaults(agentData) {
    const mock = new AgentCardMock();
    
    mock.props.agent = agentData || {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'Test agent description',
      status: 'active',
      tags: ['test'],
      metrics: { performance: 0.85 }
    };

    mock.render.mockReturnValue({
      type: 'div',
      props: {
        className: 'agent-card',
        'data-testid': `agent-card-${mock.props.agent.id}`
      }
    });

    mock.handleClick.mockImplementation(() => {
      mock.props.onClick(mock.props.agent.id);
    });

    mock.handleStatusToggle.mockImplementation(() => {
      const newStatus = mock.props.agent.status === 'active' ? 'inactive' : 'active';
      mock.props.agent.status = newStatus;
      mock.props.onStatusToggle(mock.props.agent.id, newStatus);
    });

    return mock;
  }

  verifyClickBehavior() {
    expect(this.handleClick).toHaveBeenCalled();
    expect(this.props.onClick).toHaveBeenCalledWith(this.props.agent.id);
  }

  verifyStatusToggleBehavior() {
    expect(this.handleStatusToggle).toHaveBeenCalled();
    expect(this.props.onStatusToggle).toHaveBeenCalled();
  }
}

/**
 * Mock AgentSearch component behaviors
 */
class AgentSearchMock {
  constructor() {
    this.render = jest.fn();
    this.handleInputChange = jest.fn();
    this.handleClear = jest.fn();
    this.handleSubmit = jest.fn();

    this.props = {
      value: '',
      placeholder: 'Search agents...',
      onChange: jest.fn(),
      onClear: jest.fn()
    };
  }

  static createWithDefaults() {
    const mock = new AgentSearchMock();
    
    mock.render.mockReturnValue({
      type: 'div',
      props: {
        className: 'agent-search',
        'data-testid': 'agent-search'
      }
    });

    mock.handleInputChange.mockImplementation((value) => {
      mock.props.value = value;
      mock.props.onChange(value);
    });

    mock.handleClear.mockImplementation(() => {
      mock.props.value = '';
      mock.props.onChange('');
      mock.props.onClear();
    });

    return mock;
  }

  verifySearchBehavior(searchTerm) {
    expect(this.handleInputChange).toHaveBeenCalledWith(searchTerm);
    expect(this.props.onChange).toHaveBeenCalledWith(searchTerm);
  }

  verifyClearBehavior() {
    expect(this.handleClear).toHaveBeenCalled();
    expect(this.props.onClear).toHaveBeenCalled();
    expect(this.props.value).toBe('');
  }
}

/**
 * Mock AgentFilters component behaviors
 */
class AgentFiltersMock {
  constructor() {
    this.render = jest.fn();
    this.handleFilterChange = jest.fn();
    this.handleClearAll = jest.fn();

    this.props = {
      availableFilters: ['active', 'inactive', 'productivity', 'meetings'],
      selectedFilters: [],
      onChange: jest.fn(),
      onClear: jest.fn()
    };
  }

  static createWithDefaults() {
    const mock = new AgentFiltersMock();
    
    mock.render.mockReturnValue({
      type: 'div',
      props: {
        className: 'agent-filters',
        'data-testid': 'agent-filters'
      }
    });

    mock.handleFilterChange.mockImplementation((filter, selected) => {
      let newFilters = [...mock.props.selectedFilters];
      if (selected) {
        newFilters.push(filter);
      } else {
        newFilters = newFilters.filter(f => f !== filter);
      }
      mock.props.selectedFilters = newFilters;
      mock.props.onChange(newFilters);
    });

    mock.handleClearAll.mockImplementation(() => {
      mock.props.selectedFilters = [];
      mock.props.onChange([]);
      mock.props.onClear();
    });

    return mock;
  }

  verifyFilterBehavior(filter, selected) {
    expect(this.handleFilterChange).toHaveBeenCalledWith(filter, selected);
    expect(this.props.onChange).toHaveBeenCalled();
  }

  verifyClearAllBehavior() {
    expect(this.handleClearAll).toHaveBeenCalled();
    expect(this.props.onClear).toHaveBeenCalled();
    expect(this.props.selectedFilters).toEqual([]);
  }
}

/**
 * Mock AgentDetails component behaviors
 */
class AgentDetailsMock {
  constructor() {
    this.render = jest.fn();
    this.handleClose = jest.fn();
    this.handleConfigure = jest.fn();
    this.handleMetricsRefresh = jest.fn();

    this.props = {
      agent: null,
      visible: false,
      onClose: jest.fn(),
      onConfigure: jest.fn(),
      onMetricsRefresh: jest.fn()
    };
  }

  static createWithDefaults(agentData) {
    const mock = new AgentDetailsMock();
    
    mock.props.agent = agentData || {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'Detailed description',
      capabilities: ['cap1', 'cap2'],
      metrics: { performance: 0.85, reliability: 0.92 },
      configuration: { setting1: 'value1' }
    };
    
    mock.props.visible = true;

    mock.render.mockReturnValue({
      type: 'div',
      props: {
        className: 'agent-details',
        'data-testid': 'agent-details'
      }
    });

    mock.handleClose.mockImplementation(() => {
      mock.props.visible = false;
      mock.props.onClose();
    });

    return mock;
  }

  verifyCloseBehavior() {
    expect(this.handleClose).toHaveBeenCalled();
    expect(this.props.onClose).toHaveBeenCalled();
    expect(this.props.visible).toBe(false);
  }

  verifyConfigureBehavior() {
    expect(this.handleConfigure).toHaveBeenCalled();
    expect(this.props.onConfigure).toHaveBeenCalledWith(this.props.agent.id);
  }
}

/**
 * React Testing Library Mock Utilities
 */
const mockRTL = {
  render: jest.fn(),
  screen: {
    getByTestId: jest.fn(),
    getByText: jest.fn(),
    getByRole: jest.fn(),
    getByLabelText: jest.fn(),
    queryByTestId: jest.fn(),
    queryByText: jest.fn(),
    findByTestId: jest.fn(),
    findByText: jest.fn()
  },
  fireEvent: {
    click: jest.fn(),
    change: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    keyDown: jest.fn(),
    keyUp: jest.fn()
  },
  waitFor: jest.fn(),
  cleanup: jest.fn()
};

/**
 * Custom Hook Mocks
 */
const customHookMocks = {
  useAgentDiscovery: jest.fn(),
  useAgentWebSocket: jest.fn(),
  useAgentFiltering: jest.fn(),
  useAgentSearch: jest.fn()
};

module.exports = {
  mockReactHooks,
  AgentsPageMock,
  AgentCardMock,
  AgentSearchMock,
  AgentFiltersMock,
  AgentDetailsMock,
  mockRTL,
  customHookMocks
};