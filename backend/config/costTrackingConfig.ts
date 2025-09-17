/**
 * Cost Tracking Configuration
 *
 * Default configuration for the Claude Code SDK cost tracking system
 */

import { CostTrackingConfig } from '../services/CostTrackingServiceManager';

export const defaultCostTrackingConfig: CostTrackingConfig = {
  database: {
    path: process.env.COST_TRACKING_DB_PATH || './data/cost_tracking.db'
  },

  costTracker: {
    // Claude 3.5 Sonnet pricing (per 1M tokens)
    inputTokenPrice: parseFloat(process.env.INPUT_TOKEN_PRICE || '3.00'),
    outputTokenPrice: parseFloat(process.env.OUTPUT_TOKEN_PRICE || '15.00'),
    cacheCreationPrice: parseFloat(process.env.CACHE_CREATION_PRICE || '3.75'),
    cacheReadPrice: parseFloat(process.env.CACHE_READ_PRICE || '0.30'),

    // Deduplication settings
    enableDeduplication: process.env.ENABLE_DEDUPLICATION !== 'false',
    retentionDays: parseInt(process.env.RETENTION_DAYS || '90'),
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),

    // Alert thresholds
    alertThresholds: {
      costPerSession: parseFloat(process.env.ALERT_COST_PER_SESSION || '10.00'),
      costPerHour: parseFloat(process.env.ALERT_COST_PER_HOUR || '100.00'),
      tokenPerMinute: parseInt(process.env.ALERT_TOKEN_PER_MINUTE || '10000')
    }
  },

  monitoring: {
    alerting: {
      costThresholds: {
        warning: parseFloat(process.env.COST_WARNING_THRESHOLD || '50.00'),
        critical: parseFloat(process.env.COST_CRITICAL_THRESHOLD || '100.00'),
        emergency: parseFloat(process.env.COST_EMERGENCY_THRESHOLD || '200.00')
      },
      tokenThresholds: {
        warning: parseInt(process.env.TOKEN_WARNING_THRESHOLD || '100000'),
        critical: parseInt(process.env.TOKEN_CRITICAL_THRESHOLD || '500000'),
        emergency: parseInt(process.env.TOKEN_EMERGENCY_THRESHOLD || '1000000')
      }
    },
    notifications: {
      webhooks: process.env.ALERT_WEBHOOKS ? process.env.ALERT_WEBHOOKS.split(',') : [],
      emailRecipients: process.env.ALERT_EMAILS ? process.env.ALERT_EMAILS.split(',') : []
    }
  },

  webSocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '8081'),
    maxConnections: parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS || '1000')
  },

  errorHandling: {
    retryPolicy: {
      maxRetries: parseInt(process.env.ERROR_MAX_RETRIES || '3'),
      initialDelay: parseInt(process.env.ERROR_INITIAL_DELAY || '1000')
    },
    circuitBreaker: {
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000')
    }
  },

  billing: {
    pricing: {
      inputTokenPrice: parseFloat(process.env.INPUT_TOKEN_PRICE || '3.00'),
      outputTokenPrice: parseFloat(process.env.OUTPUT_TOKEN_PRICE || '15.00'),
      cacheCreationPrice: parseFloat(process.env.CACHE_CREATION_PRICE || '3.75'),
      cacheReadPrice: parseFloat(process.env.CACHE_READ_PRICE || '0.30')
    },
    cyclePeriod: (process.env.BILLING_CYCLE_PERIOD as 'monthly' | 'weekly' | 'daily') || 'monthly'
  }
};

// Development configuration
export const developmentConfig: Partial<CostTrackingConfig> = {
  database: {
    path: './data/cost_tracking_dev.db'
  },
  monitoring: {
    alerting: {
      costThresholds: {
        warning: 5.00,
        critical: 10.00,
        emergency: 20.00
      },
      tokenThresholds: {
        warning: 10000,
        critical: 50000,
        emergency: 100000
      }
    },
    notifications: {
      webhooks: [],
      emailRecipients: []
    }
  },
  webSocket: {
    port: 8082,
    maxConnections: 100
  }
};

// Test configuration
export const testConfig: Partial<CostTrackingConfig> = {
  database: {
    path: ':memory:' // In-memory database for tests
  },
  costTracker: {
    retentionDays: 1, // Short retention for tests
    maxRetryAttempts: 1
  },
  monitoring: {
    alerting: {
      costThresholds: {
        warning: 0.01,
        critical: 0.02,
        emergency: 0.05
      },
      tokenThresholds: {
        warning: 100,
        critical: 500,
        emergency: 1000
      }
    },
    notifications: {
      webhooks: [],
      emailRecipients: []
    }
  },
  webSocket: {
    port: 8083,
    maxConnections: 10
  },
  errorHandling: {
    retryPolicy: {
      maxRetries: 1,
      initialDelay: 100
    },
    circuitBreaker: {
      failureThreshold: 2,
      resetTimeout: 1000
    }
  }
};

// Production configuration
export const productionConfig: Partial<CostTrackingConfig> = {
  database: {
    path: process.env.COST_TRACKING_DB_PATH || '/data/cost_tracking_prod.db'
  },
  costTracker: {
    retentionDays: 365, // Keep data for 1 year in production
    maxRetryAttempts: 5
  },
  monitoring: {
    alerting: {
      costThresholds: {
        warning: 500.00,
        critical: 1000.00,
        emergency: 2000.00
      },
      tokenThresholds: {
        warning: 1000000,
        critical: 5000000,
        emergency: 10000000
      }
    },
    notifications: {
      webhooks: process.env.ALERT_WEBHOOKS?.split(',') || [],
      emailRecipients: process.env.ALERT_EMAILS?.split(',') || []
    }
  },
  webSocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '8081'),
    maxConnections: parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS || '5000')
  },
  errorHandling: {
    retryPolicy: {
      maxRetries: 5,
      initialDelay: 2000
    },
    circuitBreaker: {
      failureThreshold: 10,
      resetTimeout: 300000 // 5 minutes
    }
  }
};

/**
 * Get configuration based on environment
 */
export function getCostTrackingConfig(): CostTrackingConfig {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return { ...defaultCostTrackingConfig, ...productionConfig };
    case 'test':
      return { ...defaultCostTrackingConfig, ...testConfig };
    case 'development':
    default:
      return { ...defaultCostTrackingConfig, ...developmentConfig };
  }
}

/**
 * Validate configuration
 */
export function validateCostTrackingConfig(config: CostTrackingConfig): string[] {
  const errors: string[] = [];

  // Validate pricing
  if (config.costTracker.inputTokenPrice <= 0) {
    errors.push('Input token price must be greater than 0');
  }

  if (config.costTracker.outputTokenPrice <= 0) {
    errors.push('Output token price must be greater than 0');
  }

  // Validate thresholds
  const { costThresholds } = config.monitoring.alerting;
  if (costThresholds.warning >= costThresholds.critical) {
    errors.push('Cost warning threshold must be less than critical threshold');
  }

  if (costThresholds.critical >= costThresholds.emergency) {
    errors.push('Cost critical threshold must be less than emergency threshold');
  }

  // Validate WebSocket configuration
  if (config.webSocket.port < 1000 || config.webSocket.port > 65535) {
    errors.push('WebSocket port must be between 1000 and 65535');
  }

  // Validate retry configuration
  if (config.errorHandling.retryPolicy.maxRetries < 0) {
    errors.push('Max retries must be non-negative');
  }

  if (config.errorHandling.retryPolicy.initialDelay < 0) {
    errors.push('Initial delay must be non-negative');
  }

  return errors;
}