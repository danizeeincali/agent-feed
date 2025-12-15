/**
 * Test Data Factories
 * London School TDD - Test Data Generation
 */

const { faker } = require('@faker-js/faker');

/**
 * Agent Data Factory
 */
class AgentDataFactory {
  /**
   * Create a complete agent data structure
   */
  static create(overrides = {}) {
    const baseAgent = {
      id: faker.string.uuid(),
      name: faker.commerce.productName() + ' Agent',
      description: faker.lorem.sentence(),
      version: faker.system.semver(),
      author: faker.person.fullName(),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      status: faker.helpers.arrayElement(['active', 'inactive', 'error']),
      type: faker.helpers.arrayElement(['posting-agent', 'monitoring-agent', 'utility-agent']),
      tags: faker.helpers.arrayElements([
        'productivity', 'meetings', 'todos', 'ideas', 
        'follow-up', 'automation', 'intelligence'
      ], { min: 1, max: 4 }),
      capabilities: faker.helpers.arrayElements([
        'task-creation', 'data-analysis', 'meeting-processing',
        'idea-generation', 'status-tracking', 'notification-sending',
        'calendar-integration', 'priority-management'
      ], { min: 2, max: 5 }),
      dependencies: faker.helpers.arrayElements([
        'posting-intelligence', 'calendar-integration', 
        'notification-service', 'pattern-recognition'
      ], { min: 0, max: 3 }),
      configuration: {
        maxItems: faker.number.int({ min: 10, max: 100 }),
        priority: faker.helpers.arrayElement(['P1', 'P2', 'P3', 'P4']),
        autoStart: faker.datatype.boolean(),
        refreshInterval: faker.number.int({ min: 30, max: 3600 })
      },
      metrics: {
        performance: faker.number.float({ min: 0.1, max: 1.0, precision: 0.01 }),
        reliability: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
        tasksCompleted: faker.number.int({ min: 0, max: 1000 }),
        averageProcessingTime: faker.number.float({ min: 0.1, max: 10.0, precision: 0.1 }),
        successRate: faker.number.float({ min: 0.7, max: 1.0, precision: 0.01 }),
        lastActivity: faker.date.recent().toISOString()
      },
      health: {
        status: faker.helpers.arrayElement(['healthy', 'warning', 'error']),
        checks: {
          connectivity: faker.datatype.boolean(),
          dependencies: faker.datatype.boolean(),
          resources: faker.datatype.boolean(),
          permissions: faker.datatype.boolean()
        },
        lastCheckTime: faker.date.recent().toISOString()
      }
    };

    return { ...baseAgent, ...overrides };
  }

  /**
   * Create multiple agents
   */
  static createMany(count = 5, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create active agent
   */
  static createActive(overrides = {}) {
    return this.create({
      status: 'active',
      health: {
        status: 'healthy',
        checks: {
          connectivity: true,
          dependencies: true,
          resources: true,
          permissions: true
        },
        lastCheckTime: new Date().toISOString()
      },
      metrics: {
        performance: faker.number.float({ min: 0.8, max: 1.0, precision: 0.01 }),
        reliability: faker.number.float({ min: 0.9, max: 1.0, precision: 0.01 }),
        successRate: faker.number.float({ min: 0.85, max: 1.0, precision: 0.01 })
      },
      ...overrides
    });
  }

  /**
   * Create inactive agent
   */
  static createInactive(overrides = {}) {
    return this.create({
      status: 'inactive',
      health: {
        status: 'healthy',
        checks: {
          connectivity: false,
          dependencies: true,
          resources: true,
          permissions: true
        }
      },
      metrics: {
        lastActivity: faker.date.past({ days: 30 }).toISOString()
      },
      ...overrides
    });
  }

  /**
   * Create agent with error state
   */
  static createWithError(overrides = {}) {
    return this.create({
      status: 'error',
      health: {
        status: 'error',
        checks: {
          connectivity: false,
          dependencies: false,
          resources: true,
          permissions: false
        }
      },
      metrics: {
        performance: faker.number.float({ min: 0.1, max: 0.5, precision: 0.01 }),
        reliability: faker.number.float({ min: 0.1, max: 0.6, precision: 0.01 }),
        successRate: faker.number.float({ min: 0.1, max: 0.5, precision: 0.01 })
      },
      ...overrides
    });
  }

  /**
   * Create specific agent types
   */
  static createPersonalTodosAgent(overrides = {}) {
    return this.create({
      id: 'personal-todos-agent',
      name: 'Personal TODOs Agent',
      description: 'Manages and tracks personal tasks and objectives with intelligent prioritization',
      type: 'posting-agent',
      tags: ['productivity', 'personal', 'todos'],
      capabilities: ['task-creation', 'priority-management', 'completion-tracking', 'deadline-monitoring'],
      dependencies: ['posting-intelligence'],
      configuration: {
        maxTasks: 50,
        priorityLevels: ['P1', 'P2', 'P3', 'P4'],
        autoArchive: true,
        reminderThreshold: 24
      },
      metrics: {
        tasksCompleted: 127,
        averageCompletionTime: 2.3,
        successRate: 0.92,
        activeTaskCount: 15
      },
      ...overrides
    });
  }

  static createMeetingNextStepsAgent(overrides = {}) {
    return this.create({
      id: 'meeting-next-steps-agent',
      name: 'Meeting Next Steps Agent',
      description: 'Captures and tracks action items from meetings with automatic follow-up',
      type: 'posting-agent',
      tags: ['meetings', 'action-items', 'follow-up'],
      capabilities: ['action-extraction', 'assignment-tracking', 'deadline-management', 'follow-up-automation'],
      dependencies: ['posting-intelligence', 'calendar-integration'],
      configuration: {
        maxActionItems: 100,
        defaultDeadlineDays: 7,
        followUpInterval: 'daily'
      },
      metrics: {
        meetingsProcessed: 45,
        actionItemsTracked: 234,
        completionRate: 0.87,
        averageItemsPerMeeting: 5.2
      },
      ...overrides
    });
  }

  static createAgentIdeasAgent(overrides = {}) {
    return this.create({
      id: 'agent-ideas-agent',
      name: 'Agent Ideas Generator',
      description: 'Generates and refines agent enhancement ideas with feasibility analysis',
      type: 'utility-agent',
      tags: ['innovation', 'ideas', 'enhancement', 'analysis'],
      capabilities: ['idea-generation', 'feasibility-analysis', 'impact-assessment', 'trend-analysis'],
      dependencies: ['posting-intelligence', 'pattern-recognition'],
      configuration: {
        ideaCategories: ['efficiency', 'features', 'integration', 'automation'],
        minViabilityScore: 0.6,
        evaluationCriteria: ['impact', 'feasibility', 'resources', 'timeline']
      },
      metrics: {
        ideasGenerated: 89,
        implementedIdeas: 12,
        averageImpactScore: 0.74,
        ideaSuccessRate: 0.13
      },
      ...overrides
    });
  }
}

/**
 * Agent Discovery Result Factory
 */
class AgentDiscoveryResultFactory {
  static create(agentCount = 5, overrides = {}) {
    const agents = AgentDataFactory.createMany(agentCount);
    
    return {
      timestamp: new Date().toISOString(),
      totalFound: agents.length,
      agents: agents,
      scanDuration: faker.number.int({ min: 100, max: 2000 }),
      errors: [],
      warnings: [],
      ...overrides
    };
  }

  static createWithErrors(errors = ['Agent validation failed']) {
    return this.create(3, {
      errors,
      warnings: ['Some agents have outdated configurations']
    });
  }

  static createEmpty() {
    return this.create(0, {
      totalFound: 0,
      agents: []
    });
  }
}

/**
 * WebSocket Event Factory
 */
class WebSocketEventFactory {
  static createAgentStatusChange(agentId = null, status = 'active') {
    return {
      type: 'agent-status-change',
      timestamp: new Date().toISOString(),
      data: {
        agentId: agentId || faker.string.uuid(),
        status,
        previousStatus: status === 'active' ? 'inactive' : 'active',
        reason: faker.lorem.sentence(),
        metrics: {
          responseTime: faker.number.float({ min: 50, max: 500, precision: 1 }),
          memoryUsage: faker.number.float({ min: 0.1, max: 0.9, precision: 0.01 })
        }
      }
    };
  }

  static createAgentMetricsUpdate(agentId = null) {
    return {
      type: 'agent-metrics-update',
      timestamp: new Date().toISOString(),
      data: {
        agentId: agentId || faker.string.uuid(),
        metrics: {
          performance: faker.number.float({ min: 0.1, max: 1.0, precision: 0.01 }),
          reliability: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
          tasksCompleted: faker.number.int({ min: 0, max: 100 }),
          averageProcessingTime: faker.number.float({ min: 0.1, max: 10.0, precision: 0.1 })
        }
      }
    };
  }

  static createAgentDiscovered(agentData = null) {
    return {
      type: 'agent-discovered',
      timestamp: new Date().toISOString(),
      data: agentData || AgentDataFactory.create()
    };
  }

  static createAgentRemoved(agentId = null) {
    return {
      type: 'agent-removed',
      timestamp: new Date().toISOString(),
      data: {
        agentId: agentId || faker.string.uuid(),
        reason: 'Agent directory removed'
      }
    };
  }
}

/**
 * User Interaction Factory
 */
class UserInteractionFactory {
  static createSearchInteraction(searchTerm = null) {
    return {
      type: 'search',
      timestamp: new Date().toISOString(),
      data: {
        searchTerm: searchTerm || faker.lorem.word(),
        resultCount: faker.number.int({ min: 0, max: 20 }),
        duration: faker.number.int({ min: 50, max: 500 })
      }
    };
  }

  static createFilterInteraction(filters = null) {
    return {
      type: 'filter',
      timestamp: new Date().toISOString(),
      data: {
        selectedFilters: filters || faker.helpers.arrayElements([
          'active', 'inactive', 'productivity', 'meetings'
        ], { min: 1, max: 3 }),
        resultCount: faker.number.int({ min: 0, max: 15 })
      }
    };
  }

  static createAgentSelectInteraction(agentId = null) {
    return {
      type: 'agent-select',
      timestamp: new Date().toISOString(),
      data: {
        agentId: agentId || faker.string.uuid(),
        interactionType: 'click',
        source: 'agent-card'
      }
    };
  }
}

/**
 * Performance Metrics Factory
 */
class PerformanceMetricsFactory {
  static createPageLoadMetrics() {
    return {
      timestamp: new Date().toISOString(),
      pageLoadTime: faker.number.int({ min: 500, max: 3000 }),
      agentDiscoveryTime: faker.number.int({ min: 100, max: 1000 }),
      renderTime: faker.number.int({ min: 50, max: 300 }),
      memoryUsage: faker.number.float({ min: 10, max: 100, precision: 0.1 }),
      bundleSize: faker.number.int({ min: 1000, max: 5000 }),
      componentCount: faker.number.int({ min: 5, max: 50 })
    };
  }

  static createInteractionMetrics() {
    return {
      timestamp: new Date().toISOString(),
      searchResponseTime: faker.number.int({ min: 10, max: 200 }),
      filterResponseTime: faker.number.int({ min: 5, max: 100 }),
      agentCardRenderTime: faker.number.int({ min: 1, max: 50 }),
      webSocketLatency: faker.number.int({ min: 20, max: 150 })
    };
  }
}

/**
 * Error Factory
 */
class ErrorFactory {
  static createNetworkError(message = 'Network request failed') {
    const error = new Error(message);
    error.name = 'NetworkError';
    error.code = 'NETWORK_ERROR';
    error.status = 500;
    return error;
  }

  static createValidationError(message = 'Validation failed') {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.code = 'VALIDATION_ERROR';
    error.details = {
      invalidFields: ['name', 'configuration']
    };
    return error;
  }

  static createPermissionError(message = 'Permission denied') {
    const error = new Error(message);
    error.name = 'PermissionError';
    error.code = 'PERMISSION_DENIED';
    error.status = 403;
    return error;
  }

  static createTimeoutError(message = 'Request timeout') {
    const error = new Error(message);
    error.name = 'TimeoutError';
    error.code = 'TIMEOUT';
    error.timeout = 30000;
    return error;
  }
}

module.exports = {
  AgentDataFactory,
  AgentDiscoveryResultFactory,
  WebSocketEventFactory,
  UserInteractionFactory,
  PerformanceMetricsFactory,
  ErrorFactory
};