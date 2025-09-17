# Claude Code SDK Cost Tracking System

A comprehensive cost tracking and billing system for the Claude Code SDK with real-time monitoring, deduplication, and accurate billing calculation.

## Overview

The cost tracking system provides:

- **Message ID Deduplication**: Prevents double-charging through message tracking
- **Real-time Cost Monitoring**: Live cost updates via WebSocket
- **Usage Analytics**: Detailed token and cost analytics
- **Billing Management**: Automated billing periods and invoice generation
- **Error Handling**: Robust retry logic with circuit breakers
- **Historical Data**: Long-term storage and trend analysis

## Architecture

### Core Components

1. **CostTracker**: Main tracking service with deduplication
2. **CostMonitoringService**: Real-time monitoring and alerting
3. **WebSocketCostService**: Live updates via WebSocket
4. **ErrorHandlingService**: Retry logic and circuit breakers
5. **BillingService**: Billing calculation and invoice generation
6. **CostDatabaseManager**: Database operations and models

### Service Manager

The `CostTrackingServiceManager` orchestrates all services and provides a unified interface.

## Features

### 1. Message ID Deduplication

Prevents double-charging by tracking processed message IDs:

```typescript
// Automatic deduplication
const tracked = await costTracker.trackStepUsage({
  messageId: 'unique-message-id',
  sessionId: 'session-123',
  // ... other data
});

if (!tracked) {
  console.log('Message already processed, skipped');
}
```

### 2. Token Consumption Calculation

Accurate cost calculation based on Claude 3.5 Sonnet pricing:

```typescript
const cost = {
  inputTokens: (tokens.inputTokens / 1_000_000) * 3.00,
  outputTokens: (tokens.outputTokens / 1_000_000) * 15.00,
  cacheCreation: (tokens.cacheCreationTokens / 1_000_000) * 3.75,
  cacheRead: (tokens.cacheReadTokens / 1_000_000) * 0.30
};
```

### 3. Real-time Monitoring

Live cost monitoring with configurable thresholds:

```typescript
// Monitor cost thresholds
monitoringService.on('alert', (alert) => {
  if (alert.severity === 'critical') {
    // Handle critical cost threshold
  }
});
```

### 4. WebSocket Support

Real-time updates for client applications:

```javascript
// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:8081/ws/cost-tracking');

ws.on('message', (data) => {
  const message = JSON.parse(data);

  switch (message.type) {
    case 'stepTracked':
      updateCostDisplay(message.data);
      break;
    case 'alert':
      showAlert(message.data);
      break;
  }
});

// Subscribe to session updates
ws.send(JSON.stringify({
  type: 'subscribe',
  data: { type: 'session', target: 'session-123' }
}));
```

### 5. Error Handling & Retry Logic

Robust error handling with circuit breakers:

```typescript
// Automatic retry with backoff
const result = await errorService.executeWithRetry(
  () => trackStepUsage(data),
  'trackStepUsage',
  {
    maxRetries: 3,
    userImpact: 'high'
  }
);
```

### 6. Billing & Invoicing

Automated billing periods and invoice generation:

```typescript
// Get current billing period
const billingPeriod = billingService.getBillingPeriod(userId);

// Generate invoice
const invoice = await billingService.generateInvoice(billingPeriod);
```

## API Endpoints

### Session Management

```http
POST /api/cost-tracking/sessions
GET /api/cost-tracking/sessions/:sessionId
POST /api/cost-tracking/sessions/:sessionId/end
GET /api/cost-tracking/sessions
```

### Cost Tracking

```http
POST /api/cost-tracking/sessions/:sessionId/track
```

### Analytics

```http
GET /api/cost-tracking/analytics
GET /api/cost-tracking/metrics
GET /api/cost-tracking/metrics/history
```

### Alerts

```http
GET /api/cost-tracking/alerts
GET /api/cost-tracking/alerts/history
```

### Reports

```http
GET /api/cost-tracking/reports/summary
GET /api/cost-tracking/reports/billing
```

### Health

```http
GET /api/cost-tracking/health
```

## Configuration

### Environment Variables

```env
# Database
COST_TRACKING_DB_PATH=./data/cost_tracking.db

# Pricing (per 1M tokens)
INPUT_TOKEN_PRICE=3.00
OUTPUT_TOKEN_PRICE=15.00
CACHE_CREATION_PRICE=3.75
CACHE_READ_PRICE=0.30

# Deduplication
ENABLE_DEDUPLICATION=true
RETENTION_DAYS=90

# Monitoring Thresholds
COST_WARNING_THRESHOLD=50.00
COST_CRITICAL_THRESHOLD=100.00
COST_EMERGENCY_THRESHOLD=200.00

TOKEN_WARNING_THRESHOLD=100000
TOKEN_CRITICAL_THRESHOLD=500000
TOKEN_EMERGENCY_THRESHOLD=1000000

# WebSocket
WEBSOCKET_PORT=8081
WEBSOCKET_MAX_CONNECTIONS=1000

# Alerts
ALERT_WEBHOOKS=https://hooks.slack.com/...
ALERT_EMAILS=admin@example.com,billing@example.com

# Error Handling
ERROR_MAX_RETRIES=3
ERROR_INITIAL_DELAY=1000
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=60000

# Billing
BILLING_CYCLE_PERIOD=monthly
```

### Programmatic Configuration

```typescript
import { getCostTrackingServiceManager } from './backend/services/CostTrackingServiceManager';

const serviceManager = getCostTrackingServiceManager({
  costTracker: {
    inputTokenPrice: 3.00,
    outputTokenPrice: 15.00,
    enableDeduplication: true,
    retentionDays: 90
  },
  monitoring: {
    alerting: {
      costThresholds: {
        warning: 50.00,
        critical: 100.00,
        emergency: 200.00
      }
    }
  }
});

await serviceManager.initialize();
```

## Usage Examples

### Basic Cost Tracking

```typescript
// Initialize service manager
const serviceManager = getCostTrackingServiceManager();
await serviceManager.initialize();

// Start a session
const session = serviceManager.startSession('session-123', 'user-456');

// Track step usage
await serviceManager.trackStepUsage({
  stepId: 'step-789',
  messageId: 'msg-abc123',
  sessionId: 'session-123',
  userId: 'user-456',
  tool: 'Read',
  stepType: 'tool_use',
  tokens: {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500
  },
  model: 'claude-3-5-sonnet-20241022',
  duration: 2500,
  timestamp: new Date()
});

// End session
serviceManager.endSession('session-123', 'completed');
```

### Analytics and Reporting

```typescript
// Get usage analytics
const analytics = serviceManager.getUsageAnalytics({
  userId: 'user-456',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  granularity: 'day'
});

// Get current metrics
const metrics = serviceManager.getCurrentMetrics();

// Generate comprehensive report
const report = serviceManager.generateReport(
  {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  'user-456'
);
```

### Billing Management

```typescript
// Get current billing period
const billingPeriod = serviceManager.getBillingPeriod('user-456');

// Get billing statistics
const stats = serviceManager.getBillingStats('user-456');

// Close billing period and generate invoice
const invoice = await serviceManager.getServices().billing.closeBillingPeriod(billingPeriod.id);
```

### Monitoring and Alerts

```typescript
// Listen for alerts
serviceManager.on('alert', (alert) => {
  console.log(`Alert: ${alert.title} - ${alert.description}`);

  if (alert.severity === 'critical') {
    // Send notification
    sendSlackNotification(alert);
  }
});

// Get active alerts
const alerts = serviceManager.getActiveAlerts();

// Broadcast system message
serviceManager.broadcastSystemMessage('System maintenance in 30 minutes', 'warning');
```

## Database Schema

### Tables

- **cost_sessions**: Session tracking and totals
- **step_usage**: Individual step cost records
- **processed_messages**: Deduplication tracking
- **alerts**: Alert history
- **billing_periods**: Billing period management

### Indexes

Optimized indexes for:
- Session and user lookups
- Time-based queries
- Cost analytics
- Deduplication checks

## Security Considerations

1. **Access Control**: API endpoints require authentication
2. **Data Isolation**: Users can only access their own data
3. **Rate Limiting**: Prevents abuse of tracking endpoints
4. **Input Validation**: All inputs are validated and sanitized
5. **Audit Logging**: All cost tracking events are logged

## Performance

### Optimizations

- In-memory caching for active sessions
- Database indexes for fast queries
- Connection pooling
- Circuit breakers for fault tolerance
- Background processing for non-critical operations

### Scalability

- Horizontal scaling via service separation
- Database sharding by user ID
- WebSocket clustering support
- Queue-based retry processing

## Monitoring & Observability

### Metrics

- Cost tracking accuracy
- Deduplication effectiveness
- API response times
- Error rates
- WebSocket connection health

### Health Checks

```http
GET /api/cost-tracking/health
```

Returns comprehensive health status for all services.

### Maintenance

```typescript
// Perform maintenance
const result = await serviceManager.performMaintenance();
console.log(`Cleaned up ${result.cleanedUpRecords} old records`);
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Initialize database
npm run db:migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000 8081
CMD ["npm", "start"]
```

### Environment Configuration

Ensure all required environment variables are set for production deployment.

## Troubleshooting

### Common Issues

1. **Duplicate Charges**: Check deduplication settings and message ID uniqueness
2. **High Error Rates**: Review circuit breaker thresholds and retry policies
3. **Performance Issues**: Check database indexes and connection pooling
4. **WebSocket Connection Issues**: Verify port accessibility and connection limits

### Debugging

Enable debug logging:

```env
LOG_LEVEL=debug
```

Check service health:

```bash
curl http://localhost:3000/api/cost-tracking/health
```

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review system logs
3. Check health endpoints
4. Contact support with detailed error information