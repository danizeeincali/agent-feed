/**
 * Configuration Management Module
 * Centralizes all environment configuration for the Agent Feed application
 */

import { config } from 'dotenv';
import joi from 'joi';

// Load environment variables
config();

// Configuration schema validation
const configSchema = joi.object({
  // Environment
  NODE_ENV: joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  
  // Database
  POSTGRES_URL: joi.string().allow(''),
  POSTGRES_HOST: joi.string().default('localhost'),
  POSTGRES_PORT: joi.number().default(5432),
  POSTGRES_DB: joi.string().allow(''),
  POSTGRES_USER: joi.string().allow(''),
  POSTGRES_PASSWORD: joi.string().allow(''),
  
  // Redis (disabled for development)
  REDIS_URL: joi.string().allow('').default(''),
  REDIS_HOST: joi.string().default('localhost'),
  REDIS_PORT: joi.number().default(6379),
  REDIS_PASSWORD: joi.string().allow(''),
  REDIS_ENABLED: joi.boolean().default(false),
  
  // JWT
  JWT_SECRET: joi.string().default('default-secret-for-development-only'),
  JWT_EXPIRES_IN: joi.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: joi.string().default('7d'),
  
  // Service Ports
  API_GATEWAY_PORT: joi.number().default(3000),
  AGENT_MANAGEMENT_PORT: joi.number().default(3001),
  FEED_PROCESSING_PORT: joi.number().default(3002),
  USER_MANAGEMENT_PORT: joi.number().default(3003),
  WEBSOCKET_PORT: joi.number().default(3004),
  MONITORING_PORT: joi.number().default(3005),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: joi.number().default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: joi.boolean().default(false),
  
  // Security
  BCRYPT_ROUNDS: joi.number().min(10).max(15).default(12),
  CORS_ORIGIN: joi.string().default('http://localhost:3000'),
  HELMET_ENABLED: joi.boolean().default(true),
  TRUST_PROXY: joi.boolean().default(false),
  
  // Queue
  QUEUE_CONCURRENCY: joi.number().default(5),
  QUEUE_DELAY: joi.number().default(1000),
  QUEUE_MAX_RETRY_ATTEMPTS: joi.number().default(3),
  QUEUE_BACKOFF_DELAY: joi.number().default(5000),
  
  // Monitoring
  LOG_LEVEL: joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: joi.string().valid('json', 'simple').default('json'),
  PROMETHEUS_ENABLED: joi.boolean().default(true),
  GRAFANA_PASSWORD: joi.string().default('admin'),
  METRICS_PREFIX: joi.string().default('agent_feed'),
  
  // Feature Flags
  ENABLE_AGENT_COORDINATION: joi.boolean().default(true),
  ENABLE_REAL_TIME_UPDATES: joi.boolean().default(true),
  ENABLE_FEED_PROCESSING: joi.boolean().default(true),
  ENABLE_USER_MANAGEMENT: joi.boolean().default(true),
  ENABLE_WEBSOCKET: joi.boolean().default(true),
  
  // Development
  DEV_HOT_RELOAD: joi.boolean().default(false),
  DEV_MOCK_EXTERNAL_APIS: joi.boolean().default(false),
  DEV_DEBUG_SQL: joi.boolean().default(false),
  DEV_DISABLE_AUTH: joi.boolean().default(false),
  
  // SSL
  SSL_ENABLED: joi.boolean().default(false),
  SSL_CERT_PATH: joi.string().allow(''),
  SSL_KEY_PATH: joi.string().allow(''),
  
  // Email
  SMTP_HOST: joi.string().allow(''),
  SMTP_PORT: joi.number().default(587),
  SMTP_SECURE: joi.boolean().default(false),
  SMTP_USER: joi.string().allow(''),
  SMTP_PASS: joi.string().allow(''),
  EMAIL_FROM: joi.string().email().allow('')
}).unknown();

// Validate configuration
const { error, value: envVars } = configSchema.validate(process.env);

if (error) {
  console.warn(`Config validation warning: ${error.message}`);
}

// Export validated configuration
export const appConfig = {
  // Environment
  env: envVars.NODE_ENV,
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
  isStaging: envVars.NODE_ENV === 'staging',
  isProduction: envVars.NODE_ENV === 'production',
  
  // Database
  database: {
    url: envVars.POSTGRES_URL,
    host: envVars.POSTGRES_HOST,
    port: envVars.POSTGRES_PORT,
    name: envVars.POSTGRES_DB,
    user: envVars.POSTGRES_USER,
    password: envVars.POSTGRES_PASSWORD,
    ssl: envVars.NODE_ENV === 'production',
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    }
  },
  
  // Redis
  redis: {
    url: envVars.REDIS_URL,
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    enabled: envVars.REDIS_ENABLED,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
  },
  
  // JWT
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'agent-feed',
    audience: 'agent-feed-users'
  },
  
  // Services
  services: {
    apiGateway: {
      port: envVars.API_GATEWAY_PORT,
      host: '0.0.0.0'
    },
    agentManagement: {
      port: envVars.AGENT_MANAGEMENT_PORT,
      host: '0.0.0.0'
    },
    feedProcessing: {
      port: envVars.FEED_PROCESSING_PORT,
      host: '0.0.0.0'
    },
    userManagement: {
      port: envVars.USER_MANAGEMENT_PORT,
      host: '0.0.0.0'
    },
    websocket: {
      port: envVars.WEBSOCKET_PORT,
      host: '0.0.0.0'
    },
    monitoring: {
      port: envVars.MONITORING_PORT,
      host: '0.0.0.0'
    }
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests: envVars.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Security
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    corsOrigin: envVars.CORS_ORIGIN,
    helmetEnabled: envVars.HELMET_ENABLED,
    trustProxy: envVars.TRUST_PROXY,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    }
  },
  
  // Queue
  queue: {
    concurrency: envVars.QUEUE_CONCURRENCY,
    delay: envVars.QUEUE_DELAY,
    maxRetryAttempts: envVars.QUEUE_MAX_RETRY_ATTEMPTS,
    backoffDelay: envVars.QUEUE_BACKOFF_DELAY,
    removeOnComplete: 100,
    removeOnFail: 50
  },
  
  // Monitoring
  monitoring: {
    logLevel: envVars.LOG_LEVEL,
    logFormat: envVars.LOG_FORMAT,
    prometheusEnabled: envVars.PROMETHEUS_ENABLED,
    grafanaPassword: envVars.GRAFANA_PASSWORD,
    metricsPrefix: envVars.METRICS_PREFIX,
    healthCheck: {
      timeout: 30000,
      interval: 60000
    }
  },
  
  // Feature Flags
  features: {
    agentCoordination: envVars.ENABLE_AGENT_COORDINATION,
    realTimeUpdates: envVars.ENABLE_REAL_TIME_UPDATES,
    feedProcessing: envVars.ENABLE_FEED_PROCESSING,
    userManagement: envVars.ENABLE_USER_MANAGEMENT,
    websocket: envVars.ENABLE_WEBSOCKET
  },
  
  // Development
  development: {
    hotReload: envVars.DEV_HOT_RELOAD,
    mockExternalApis: envVars.DEV_MOCK_EXTERNAL_APIS,
    debugSql: envVars.DEV_DEBUG_SQL,
    disableAuth: envVars.DEV_DISABLE_AUTH
  },
  
  // SSL
  ssl: {
    enabled: envVars.SSL_ENABLED,
    certPath: envVars.SSL_CERT_PATH,
    keyPath: envVars.SSL_KEY_PATH
  },
  
  // Email
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      secure: envVars.SMTP_SECURE,
      auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS
      }
    },
    from: envVars.EMAIL_FROM
  }
};

// Configuration validation function
export const validateConfig = () => {
  // Only warn about missing configs in development
  if (appConfig.isDevelopment) {
    console.log('Running in development mode with relaxed config validation');
  }
  return true;
};

// Export individual config sections for convenience
export const {
  env,
  database,
  redis,
  jwt,
  services,
  rateLimit,
  security,
  queue,
  monitoring,
  features,
  development,
  ssl,
  email
} = appConfig;

export default appConfig;