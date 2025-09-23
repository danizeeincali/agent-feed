/**
 * TDD London School: Shared Mock Definitions
 * Centralized mock definitions for component validation testing
 */

import React from 'react';

// Mock Component Registry
export const createMockComponentRegistry = () => ({
  // Core validation methods
  validateComponentSpec: jest.fn(),
  getSecurityPolicy: jest.fn(),
  hasComponent: jest.fn(),
  sanitizeProps: jest.fn(),
  
  // Component mappers
  Button: createMockComponentMapper('Button'),
  Input: createMockComponentMapper('Input'),
  Card: createMockComponentMapper('Card'),
  Badge: createMockComponentMapper('Badge'),
  Alert: createMockComponentMapper('Alert'),
  Avatar: createMockComponentMapper('Avatar'),
  Progress: createMockComponentMapper('Progress'),
  
  // Custom components
  CapabilityList: createMockComponentMapper('CapabilityList'),
  PerformanceMetrics: createMockComponentMapper('PerformanceMetrics'),
  Timeline: createMockComponentMapper('Timeline'),
  ProfileHeader: createMockComponentMapper('ProfileHeader'),
  ActivityFeed: createMockComponentMapper('ActivityFeed'),
  
  // Utility methods
  getComponentDocs: jest.fn(),
  getPerformanceHints: jest.fn(),
  getAccessibilityInfo: jest.fn()
});

// Helper to create component mappers
function createMockComponentMapper(componentName) {
  const MockComponent = (props) => (
    <div data-testid={`mock-${componentName.toLowerCase()}`} {...props}>
      {componentName} Component
      {props.children}
    </div>
  );
  
  return {
    component: MockComponent,
    validator: jest.fn(),
    sanitizer: jest.fn(),
    security: createMockSecurityPolicy(componentName),
    performance: createMockPerformanceHints(),
    accessibility: createMockAccessibilityInfo(),
    documentation: createMockDocumentation(componentName)
  };
}

// Mock Security Sanitizer
export const createMockSecuritySanitizer = () => ({
  sanitizeProps: jest.fn((props, allowedProps) => {
    if (!props || !allowedProps) return props;
    
    const sanitized = {};
    Object.keys(props).forEach(key => {
      if (allowedProps.includes(key) && 
          !key.startsWith('__') && 
          key !== 'constructor' &&
          !key.startsWith('on') || key === 'onChange' || key === 'onClick') {
        sanitized[key] = props[key];
      }
    });
    return sanitized;
  }),
  
  sanitizeString: jest.fn((value) => {
    if (typeof value !== 'string') return value;
    
    // Basic HTML entity encoding
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }),
  
  sanitizeObject: jest.fn((obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      if (!key.startsWith('__') && key !== 'constructor') {
        sanitized[key] = obj[key];
      }
    });
    return sanitized;
  }),
  
  validateUrl: jest.fn((url) => {
    if (typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      return allowedProtocols.includes(urlObj.protocol);
    } catch {
      return false;
    }
  })
});

// Mock Security Policies
export function createMockSecurityPolicy(componentType) {
  const basePolicy = {
    sanitizeHtml: true,
    validateUrls: false,
    allowExternalContent: false,
    maxDataSize: 1024
  };
  
  const policies = {
    Button: {
      ...basePolicy,
      allowedProps: [
        'id', 'className', 'style', 'data-testid', 'aria-label', 'aria-describedby', 'role',
        'variant', 'size', 'disabled', 'loading', 'type', 'children', 'onClick'
      ],
      blockedProps: ['dangerouslySetInnerHTML', 'onLoad', 'onError', 'href']
    },
    
    Input: {
      ...basePolicy,
      allowedProps: [
        'id', 'className', 'style', 'data-testid', 'aria-label', 'aria-describedby', 'role',
        'type', 'placeholder', 'value', 'defaultValue', 'disabled', 'readonly', 'required',
        'pattern', 'minLength', 'maxLength', 'min', 'max', 'step', 'autoComplete', 'autoFocus',
        'error', 'helperText', 'label', 'onChange', 'onBlur', 'onFocus'
      ],
      blockedProps: ['dangerouslySetInnerHTML', 'onLoad', 'onError']
    },
    
    Card: {
      ...basePolicy,
      allowedProps: [
        'id', 'className', 'style', 'data-testid', 'aria-label', 'aria-describedby', 'role',
        'title', 'description', 'children', 'variant', 'padding', 'elevation', 'interactive'
      ],
      blockedProps: ['dangerouslySetInnerHTML', 'onClick', 'onLoad'],
      allowedChildren: ['Button', 'Input', 'Badge', 'Avatar', 'Progress']
    },
    
    CapabilityList: {
      ...basePolicy,
      allowedProps: [
        'title', 'capabilities', 'showProgress', 'layout', 'groupBy', 'sortBy',
        'onCapabilityClick', 'onProgressUpdate', 'className', 'data-testid'
      ],
      blockedProps: ['dangerouslySetInnerHTML', 'onLoad', 'onError']
    },
    
    PerformanceMetrics: {
      ...basePolicy,
      allowedProps: [
        'title', 'metrics', 'layout', 'showTrends', 'refreshInterval', 'thresholds',
        'onMetricClick', 'onRefresh', 'className', 'data-testid'
      ],
      blockedProps: ['dangerouslySetInnerHTML', 'onLoad', 'onError']
    },
    
    Timeline: {
      ...basePolicy,
      allowedProps: [
        'title', 'events', 'orientation', 'showDates', 'showIcons', 'groupByDate',
        'allowFiltering', 'maxEvents', 'onEventClick', 'className', 'data-testid'
      ],
      blockedProps: ['dangerouslySetInnerHTML', 'onLoad', 'onError']
    },
    
    ProfileHeader: {
      ...basePolicy,
      validateUrls: true,
      allowedProps: [
        'name', 'title', 'description', 'avatar', 'status', 'capabilities', 'stats',
        'badges', 'showStatus', 'showStats', 'showCapabilities', 'layout', 'size',
        'interactive', 'onInteract', 'onConfigure', 'className', 'data-testid'
      ],
      blockedProps: ['dangerouslySetInnerHTML', 'onLoad', 'onError']
    },
    
    ActivityFeed: {
      ...basePolicy,
      validateUrls: true,
      allowedProps: [
        'title', 'activities', 'showFilters', 'showSearch', 'showTimestamps', 'showAvatars',
        'groupByDate', 'maxItems', 'refreshInterval', 'enableRealTime', 'layout',
        'itemsPerPage', 'showPagination', 'onActivityClick', 'onFilter', 'className', 'data-testid'
      ],
      blockedProps: ['dangerouslySetInnerHTML', 'onLoad', 'onError']
    }
  };
  
  return policies[componentType] || basePolicy;
}

// Mock Performance Hints
export function createMockPerformanceHints() {
  return {
    lazy: false,
    memoize: true,
    virtualize: false,
    preload: false,
    priority: 'normal',
    maxRenderTime: 100,
    memoryUsage: 'low'
  };
}

// Mock Accessibility Information
export function createMockAccessibilityInfo() {
  return {
    requiredProps: ['aria-label'],
    ariaSupport: true,
    keyboardNavigation: true,
    screenReaderFriendly: true,
    focusManagement: true,
    highContrast: true
  };
}

// Mock Component Documentation
export function createMockDocumentation(componentName) {
  return {
    name: componentName,
    description: `Mock ${componentName} component for testing`,
    category: 'Test',
    examples: [
      {
        name: `Basic ${componentName}`,
        description: `Simple ${componentName} example`,
        code: `{ "type": "${componentName}", "props": {} }`,
        props: {}
      }
    ],
    props: [],
    accessibility: ['Mock accessibility features'],
    browserSupport: ['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+']
  };
}

// Mock API Service
export const createMockApiService = () => ({
  // Agent methods
  getAgentWorkspace: jest.fn(),
  getAgentList: jest.fn(),
  getAgentById: jest.fn(),
  updateAgent: jest.fn(),
  deleteAgent: jest.fn(),
  
  // Page methods
  getAgentPages: jest.fn(),
  getAgentPageById: jest.fn(),
  createAgentPage: jest.fn(),
  updateAgentPage: jest.fn(),
  deleteAgentPage: jest.fn(),
  
  // Component methods
  validateComponent: jest.fn(),
  renderComponent: jest.fn(),
  getComponentLibrary: jest.fn(),
  
  // Real-time methods
  subscribeToUpdates: jest.fn(),
  unsubscribeFromUpdates: jest.fn(),
  sendPageUpdate: jest.fn()
});

// Mock Hook Returns
export const createMockUseAgentPageData = () => ({
  // Data properties
  agent: null,
  pages: [],
  currentPage: null,
  
  // State properties
  loading: false,
  error: null,
  hasPages: false,
  isPageFound: false,
  isReady: true,
  
  // Action properties
  retry: jest.fn(),
  refresh: jest.fn(),
  createPage: jest.fn(),
  updatePage: jest.fn(),
  deletePage: jest.fn()
});

// Test Data Factories
export const createMockAgent = (overrides = {}) => ({
  id: 'test-agent',
  name: 'Test Agent',
  type: 'assistant',
  status: 'active',
  capabilities: ['code-review', 'testing', 'documentation'],
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
  ...overrides
});

export const createMockPage = (type = 'CapabilityList', overrides = {}) => ({
  id: `page-${Date.now()}`,
  title: `${type} Page`,
  content_value: {
    type,
    props: createMockComponentProps(type)
  },
  content_metadata: {
    version: 1,
    created_by: 'test-user',
    updated_by: 'test-user'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockComponentProps = (type) => {
  const propFactories = {
    CapabilityList: () => ({
      title: 'Test Capabilities',
      capabilities: [
        { name: 'Code Generation', level: 'Expert', progress: 95 },
        { name: 'Testing', level: 'Advanced', progress: 85 }
      ],
      showProgress: true
    }),
    
    PerformanceMetrics: () => ({
      title: 'Performance Dashboard',
      metrics: [
        { name: 'CPU Usage', value: 45, unit: '%', type: 'progress' },
        { name: 'Memory Usage', value: 1.2, unit: 'GB', type: 'gauge' }
      ],
      showTrends: true,
      layout: 'grid'
    }),
    
    Timeline: () => ({
      title: 'Activity Timeline',
      events: [
        {
          title: 'Task Completed',
          description: 'Code review task finished',
          timestamp: new Date().toISOString(),
          type: 'success',
          status: 'completed'
        }
      ],
      orientation: 'vertical',
      showDates: true,
      showIcons: true
    }),
    
    ProfileHeader: () => ({
      name: 'AI Assistant',
      title: 'Code Review Specialist',
      description: 'Specialized in JavaScript and Python development',
      status: 'online',
      avatar: { url: 'https://example.com/avatar.jpg', fallback: 'AI' },
      badges: [{ label: 'Expert', variant: 'success' }],
      stats: { 'Tasks Completed': 1247, 'Success Rate': '98.5%' },
      capabilities: [{ name: 'Code Review', level: 'Expert', confidence: 95 }],
      interactive: true
    }),
    
    ActivityFeed: () => ({
      title: 'Recent Activities',
      activities: [
        {
          title: 'Code Review Completed',
          description: 'Successfully reviewed authentication module',
          type: 'task_completed',
          timestamp: new Date().toISOString(),
          actor: { id: 'agent-1', name: 'AI Assistant', avatar: 'https://example.com/avatar.jpg' },
          metadata: { duration: '30 minutes', filesReviewed: 12 }
        }
      ],
      showFilters: true,
      showSearch: true,
      showTimestamps: true,
      maxItems: 50
    })
  };
  
  const factory = propFactories[type];
  return factory ? factory() : {};
};

// Validation Result Factories
export const createValidationResult = (valid = true, errors = [], warnings = []) => ({
  valid,
  data: valid ? {} : undefined,
  errors: errors.map(error => ({
    field: error.field || 'unknown',
    message: error.message || 'Validation error',
    code: error.code || 'VALIDATION_ERROR',
    severity: error.severity || 'error'
  })),
  warnings: warnings.map(warning => ({
    field: warning.field || 'unknown',
    message: warning.message || 'Validation warning',
    suggestion: warning.suggestion
  }))
});

export const createSecurityViolation = (type, prop, message) => ({
  type,
  prop,
  message,
  severity: 'high',
  blocked: true
});

// Test Scenario Generators
export const generateLargeDataset = (type, count = 100) => {
  switch (type) {
    case 'capabilities':
      return Array.from({ length: count }, (_, i) => ({
        name: `Capability ${i}`,
        level: ['Beginner', 'Intermediate', 'Advanced', 'Expert'][i % 4],
        progress: Math.floor(Math.random() * 100)
      }));
      
    case 'metrics':
      return Array.from({ length: count }, (_, i) => ({
        name: `Metric ${i}`,
        value: Math.floor(Math.random() * 100),
        unit: ['%', 'MB', 'ms', 'req/s'][i % 4],
        type: ['progress', 'gauge', 'value'][i % 3]
      }));
      
    case 'events':
      return Array.from({ length: count }, (_, i) => ({
        title: `Event ${i}`,
        description: `Description for event ${i}`,
        timestamp: new Date(Date.now() - i * 60 * 1000).toISOString(),
        type: ['info', 'success', 'warning', 'error'][i % 4],
        status: ['completed', 'in-progress', 'failed', 'pending'][i % 4]
      }));
      
    case 'activities':
      return Array.from({ length: count }, (_, i) => ({
        title: `Activity ${i}`,
        description: `Description for activity ${i}`,
        type: ['task_assigned', 'task_completed', 'code_committed', 'error_occurred'][i % 4],
        timestamp: new Date(Date.now() - i * 60 * 1000).toISOString(),
        actor: {
          id: `actor-${i}`,
          name: `Actor ${i}`,
          avatar: `https://example.com/avatar-${i}.jpg`
        }
      }));
      
    case 'pages':
      return Array.from({ length: count }, (_, i) => 
        createMockPage(['CapabilityList', 'PerformanceMetrics', 'Timeline', 'ProfileHeader', 'ActivityFeed'][i % 5], {
          id: `page-${i}`,
          title: `Page ${i}`
        })
      );
      
    default:
      return [];
  }
};

// Error Simulation Helpers
export const simulateNetworkError = (message = 'Network request failed') => {
  const error = new Error(message);
  error.code = 'NETWORK_ERROR';
  error.status = 500;
  return error;
};

export const simulateValidationError = (field, message) => {
  return {
    field,
    message,
    code: 'VALIDATION_ERROR',
    severity: 'error'
  };
};

export const simulateSecurityError = (prop, message) => {
  return createSecurityViolation('blocked_prop', prop, message);
};

// Performance Testing Helpers
export const measureRenderTime = (renderFunction) => {
  const startTime = performance.now();
  const result = renderFunction();
  const endTime = performance.now();
  
  return {
    result,
    renderTime: endTime - startTime
  };
};

export const createPerformanceBaseline = () => ({
  maxRenderTime: 100, // milliseconds
  maxMemoryUsage: 10, // MB
  maxComponentCount: 1000,
  maxPropsSize: 1024 * 10 // 10KB
});

// Accessibility Testing Helpers
export const createAccessibilityChecker = () => ({
  checkAriaLabels: (container) => {
    const elementsNeedingLabels = container.querySelectorAll('button, input, select, textarea');
    const violations = [];
    
    elementsNeedingLabels.forEach((element, index) => {
      if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
        violations.push({
          element: element.tagName.toLowerCase(),
          index,
          issue: 'Missing aria-label or aria-labelledby'
        });
      }
    });
    
    return violations;
  },
  
  checkKeyboardNavigation: (container) => {
    const interactiveElements = container.querySelectorAll('button, input, select, textarea, a[href]');
    const violations = [];
    
    interactiveElements.forEach((element, index) => {
      if (element.tabIndex === -1 && !element.getAttribute('aria-hidden')) {
        violations.push({
          element: element.tagName.toLowerCase(),
          index,
          issue: 'Element not keyboard accessible'
        });
      }
    });
    
    return violations;
  },
  
  checkColorContrast: () => {
    // Mock implementation - in real tests, use actual contrast checking libraries
    return [];
  }
});

// Export commonly used mock setups
export const setupBasicMocks = () => {
  const componentRegistry = createMockComponentRegistry();
  const securitySanitizer = createMockSecuritySanitizer();
  const apiService = createMockApiService();
  const useAgentPageData = createMockUseAgentPageData();
  
  // Setup default successful behaviors
  componentRegistry.hasComponent.mockReturnValue(true);
  componentRegistry.validateComponentSpec.mockReturnValue(createValidationResult(true));
  componentRegistry.getSecurityPolicy.mockReturnValue(createMockSecurityPolicy('Button'));
  
  securitySanitizer.sanitizeProps.mockImplementation((props, allowed) => props);
  securitySanitizer.validateUrl.mockReturnValue(true);
  
  apiService.getAgentWorkspace.mockResolvedValue({
    agent: createMockAgent(),
    pages: [createMockPage()]
  });
  
  return {
    componentRegistry,
    securitySanitizer,
    apiService,
    useAgentPageData
  };
};

export const setupFailureMocks = () => {
  const mocks = setupBasicMocks();
  
  // Setup failure behaviors
  mocks.componentRegistry.validateComponentSpec.mockReturnValue(
    createValidationResult(false, [{ field: 'test', message: 'Test error' }])
  );
  
  mocks.apiService.getAgentWorkspace.mockRejectedValue(simulateNetworkError());
  
  mocks.useAgentPageData.error = 'Failed to load agent data';
  mocks.useAgentPageData.loading = false;
  mocks.useAgentPageData.isReady = false;
  
  return mocks;
};