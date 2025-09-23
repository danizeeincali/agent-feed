/**
 * TDD London School - Mock Factory
 * Centralized mock creation following London School principles
 */

import { jest } from '@jest/globals';

// Component Mock Factory
export const createComponentMock = (componentType: string) => ({
  type: componentType,
  props: {},
  render: jest.fn().mockReturnValue(`<${componentType}></${componentType}>`),
  validate: jest.fn().mockReturnValue(true),
  serialize: jest.fn().mockReturnValue(JSON.stringify({ type: componentType }))
});

// Shadcn/UI Component Mocks
export const createShadcnMocks = () => ({
  Button: jest.fn(({ children, onClick, variant, ...props }) => (
    <button 
      data-testid="shadcn-button" 
      data-variant={variant}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )),
  Input: jest.fn((props) => (
    <input 
      data-testid="shadcn-input" 
      {...props}
    />
  )),
  Card: jest.fn(({ children, ...props }) => (
    <div data-testid="shadcn-card" {...props}>
      {children}
    </div>
  )),
  CardHeader: jest.fn(({ children, ...props }) => (
    <div data-testid="shadcn-card-header" {...props}>
      {children}
    </div>
  )),
  CardContent: jest.fn(({ children, ...props }) => (
    <div data-testid="shadcn-card-content" {...props}>
      {children}
    </div>
  )),
  Select: jest.fn(({ children, onValueChange, ...props }) => (
    <select 
      data-testid="shadcn-select" 
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    >
      {children}
    </select>
  )),
  Tabs: jest.fn(({ children, ...props }) => (
    <div data-testid="shadcn-tabs" {...props}>
      {children}
    </div>
  )),
  TabsList: jest.fn(({ children, ...props }) => (
    <div data-testid="shadcn-tabs-list" {...props}>
      {children}
    </div>
  )),
  TabsTrigger: jest.fn(({ children, value, ...props }) => (
    <button data-testid="shadcn-tabs-trigger" data-value={value} {...props}>
      {children}
    </button>
  )),
  TabsContent: jest.fn(({ children, value, ...props }) => (
    <div data-testid="shadcn-tabs-content" data-value={value} {...props}>
      {children}
    </div>
  ))
});

// API Mock Factory
export const createWorkspaceApiMock = () => ({
  getPage: jest.fn(),
  createPage: jest.fn(),
  updatePage: jest.fn(),
  deletePage: jest.fn(),
  getPages: jest.fn(),
  getAgent: jest.fn(),
  getAgents: jest.fn()
});

// Component Renderer Mock
export const createComponentRendererMock = () => ({
  renderComponent: jest.fn(),
  validateComponentSpec: jest.fn(),
  serializeComponent: jest.fn(),
  deserializeComponent: jest.fn(),
  getComponentLibrary: jest.fn(),
  registerCustomComponent: jest.fn()
});

// Data Persistence Mock
export const createDataPersistenceMock = () => ({
  saveUserData: jest.fn(),
  loadUserData: jest.fn(),
  preserveDataDuringUpdate: jest.fn(),
  validateDataIntegrity: jest.fn(),
  clearUserData: jest.fn(),
  migrateData: jest.fn()
});

// Agent Page Builder Mock
export const createPageBuilderMock = () => ({
  createPage: jest.fn(),
  updatePage: jest.fn(),
  addComponent: jest.fn(),
  removeComponent: jest.fn(),
  updateComponent: jest.fn(),
  validatePage: jest.fn(),
  savePage: jest.fn(),
  generatePreview: jest.fn()
});

// JSON Spec Parser Mock
export const createSpecParserMock = () => ({
  parseJsonSpec: jest.fn(),
  validateSpec: jest.fn(),
  transformSpecToComponents: jest.fn(),
  extractUserData: jest.fn(),
  validateComponentProps: jest.fn()
});

// Swarm Coordination Mock
export const createSwarmMock = (mockType: string, methods: Record<string, any>) => {
  const mock = {
    ...methods,
    _swarmType: mockType,
    _contractHistory: [],
    _interactions: []
  };
  
  // Track all method calls for contract verification
  Object.keys(methods).forEach(methodName => {
    const originalMethod = methods[methodName];
    mock[methodName] = jest.fn((...args) => {
      mock._interactions.push({
        method: methodName,
        args,
        timestamp: new Date(),
        callCount: mock[methodName].mock.calls.length + 1
      });
      return originalMethod(...args);
    });
  });
  
  return mock;
};

// Contract Validation Mock
export const createContractValidatorMock = () => ({
  validateContract: jest.fn(),
  verifyInteractions: jest.fn(),
  reportViolations: jest.fn(),
  updateContract: jest.fn(),
  getContractHistory: jest.fn()
});

// Test Scenario Factory
export const createTestScenario = (scenarioName: string, config: any = {}) => ({
  name: scenarioName,
  setup: jest.fn(),
  teardown: jest.fn(),
  validate: jest.fn(),
  mocks: {},
  ...config
});

// Mock Data Factory
export const createMockData = {
  todoListSpec: () => ({
    type: "TodoList",
    props: { title: "My Tasks" },
    components: [
      { type: "Button", props: { variant: "default", children: "Add Task" }},
      { type: "Input", props: { placeholder: "Enter task..." }}
    ]
  }),
  
  dashboardSpec: () => ({
    template: 'dashboard',
    layout: 'grid',
    components: [
      {
        type: 'metric',
        props: {
          label: 'Total Users',
          value: '1,234',
          unit: 'users',
          trend: 'up'
        }
      },
      {
        type: 'chart',
        props: {
          title: 'User Growth',
          chartType: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar'],
            values: [100, 200, 300]
          }
        }
      }
    ]
  }),
  
  pageData: (overrides = {}) => ({
    id: 'mock-page-id',
    title: 'Test Page',
    content_type: 'component',
    content_value: JSON.stringify(createMockData.dashboardSpec()),
    page_type: 'dynamic',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  agentData: (overrides = {}) => ({
    id: 'mock-agent-id',
    name: 'Test Agent',
    description: 'Test Agent Description',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  componentConfig: (overrides = {}) => ({
    id: 'mock-component-id',
    type: 'text',
    props: { content: 'Test content' },
    children: [],
    ...overrides
  }),
  
  userDataState: (overrides = {}) => ({
    todos: [
      { id: 1, title: 'Buy milk', completed: false },
      { id: 2, title: 'Walk dog', completed: true }
    ],
    preferences: {
      theme: 'light',
      language: 'en'
    },
    ...overrides
  })
};