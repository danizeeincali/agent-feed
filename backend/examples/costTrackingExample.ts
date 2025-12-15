/**
 * Cost Tracking System Example Implementation
 *
 * This example demonstrates how to integrate and use the Claude Code SDK
 * cost tracking system in a real application.
 */

import express from 'express';
import { getCostTrackingServiceManager } from '../services/CostTrackingServiceManager';
import { getCostTrackingConfig } from '../config/costTrackingConfig';
import costTrackingRoutes, { setCostTrackingServices } from '../api/routes/costTrackingRoutes';

// Example usage class
export class CostTrackingExample {
  private serviceManager: any;
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupExpress();
  }

  private setupExpress(): void {
    this.app.use(express.json());

    // Add CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });
  }

  /**
   * Initialize the cost tracking system
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing cost tracking system...');

      // Get configuration
      const config = getCostTrackingConfig();
      console.log('Configuration loaded:', JSON.stringify(config, null, 2));

      // Initialize service manager
      this.serviceManager = getCostTrackingServiceManager(config);
      await this.serviceManager.initialize();

      // Set up API routes
      const services = this.serviceManager.getServices();
      setCostTrackingServices(services.costTracker, services.monitoring);
      this.app.use('/api/cost-tracking', costTrackingRoutes);

      // Set up event listeners
      this.setupEventListeners();

      // Start health check endpoint
      this.setupHealthCheck();

      console.log('Cost tracking system initialized successfully');

    } catch (error) {
      console.error('Failed to initialize cost tracking system:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for monitoring
   */
  private setupEventListeners(): void {
    // Listen for cost tracking events
    this.serviceManager.on('stepTracked', (stepUsage: any) => {
      console.log(`Step tracked: ${stepUsage.stepId} - $${stepUsage.cost.toFixed(4)}`);
    });

    this.serviceManager.on('sessionStarted', (session: any) => {
      console.log(`Session started: ${session.sessionId} for user ${session.userId}`);
    });

    this.serviceManager.on('sessionEnded', (sessionInfo: any) => {
      console.log(`Session ended: ${sessionInfo.sessionId}`);
    });

    // Listen for alerts
    this.serviceManager.on('alert', (alert: any) => {
      console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
      console.log(`   Description: ${alert.description}`);
      console.log(`   Threshold: ${alert.threshold}, Current: ${alert.currentValue}`);

      // In a real application, you would send notifications here
      this.handleAlert(alert);
    });

    // Listen for billing events
    this.serviceManager.on('chargeProcessed', (charge: any) => {
      console.log(`Charge processed: $${charge.cost.toFixed(4)} for session ${charge.sessionId}`);
    });

    this.serviceManager.on('billingPeriodCreated', (period: any) => {
      console.log(`New billing period created for user ${period.userId}: ${period.id}`);
    });

    this.serviceManager.on('invoiceGenerated', (invoice: any) => {
      console.log(`Invoice generated: ${invoice.invoiceNumber} - $${invoice.summary.total.toFixed(2)}`);
    });

    // Listen for WebSocket events
    this.serviceManager.on('clientConnected', (client: any) => {
      console.log(`WebSocket client connected: ${client.clientId}`);
    });

    this.serviceManager.on('clientDisconnected', (client: any) => {
      console.log(`WebSocket client disconnected: ${client.clientId}`);
    });

    // Listen for error events
    this.serviceManager.on('operationError', (error: any) => {
      console.error(`Operation error: ${error.operationType} - ${error.error.message}`);
    });

    this.serviceManager.on('retrySuccess', (retry: any) => {
      console.log(`Retry successful: ${retry.operationType} after ${retry.totalAttempts} attempts`);
    });

    this.serviceManager.on('circuitBreakerOpen', (cb: any) => {
      console.warn(`Circuit breaker opened for ${cb.operationType}`);
    });
  }

  /**
   * Handle alerts (send notifications, etc.)
   */
  private async handleAlert(alert: any): Promise<void> {
    switch (alert.severity) {
      case 'emergency':
        await this.sendEmergencyNotification(alert);
        break;
      case 'critical':
        await this.sendCriticalNotification(alert);
        break;
      case 'warning':
        await this.sendWarningNotification(alert);
        break;
      default:
        console.log(`Info alert: ${alert.title}`);
    }
  }

  private async sendEmergencyNotification(alert: any): Promise<void> {
    // In a real application, send immediate notifications (SMS, phone calls, etc.)
    console.log('🚨 EMERGENCY NOTIFICATION SENT');
    // Example: await twilioClient.calls.create({ ... });
  }

  private async sendCriticalNotification(alert: any): Promise<void> {
    // In a real application, send Slack/Teams notifications
    console.log('🔴 CRITICAL NOTIFICATION SENT');
    // Example: await slackClient.chat.postMessage({ ... });
  }

  private async sendWarningNotification(alert: any): Promise<void> {
    // In a real application, send email notifications
    console.log('⚠️ WARNING NOTIFICATION SENT');
    // Example: await emailService.send({ ... });
  }

  /**
   * Set up health check endpoint
   */
  private setupHealthCheck(): void {
    this.app.get('/health', (req, res) => {
      const health = this.serviceManager.getHealthStatus();
      const statusCode = health.overall === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    });
  }

  /**
   * Example: Simulate Claude Code SDK usage
   */
  public async simulateUsage(): Promise<void> {
    console.log('\n🧪 Starting usage simulation...\n');

    const userId = 'user-123';
    const sessionId = 'session-456';

    try {
      // Start a session
      console.log('1. Starting session...');
      const session = this.serviceManager.startSession(sessionId, userId, {
        source: 'simulation',
        environment: 'development'
      });
      console.log(`Session started: ${session.sessionId}`);

      // Simulate multiple steps
      const steps = [
        {
          stepId: 'step-1',
          messageId: 'msg-001',
          tool: 'Read',
          stepType: 'tool_use',
          tokens: { inputTokens: 500, outputTokens: 200, totalTokens: 700 },
          model: 'claude-3-5-sonnet-20241022',
          duration: 1500
        },
        {
          stepId: 'step-2',
          messageId: 'msg-002',
          tool: 'Write',
          stepType: 'tool_use',
          tokens: { inputTokens: 300, outputTokens: 800, totalTokens: 1100 },
          model: 'claude-3-5-sonnet-20241022',
          duration: 2200
        },
        {
          stepId: 'step-3',
          messageId: 'msg-003',
          tool: 'Bash',
          stepType: 'tool_use',
          tokens: { inputTokens: 200, outputTokens: 150, totalTokens: 350 },
          model: 'claude-3-5-sonnet-20241022',
          duration: 3000
        }
      ];

      console.log('2. Tracking step usage...');
      for (const step of steps) {
        const stepUsage = {
          ...step,
          sessionId,
          userId,
          timestamp: new Date(),
          retryAttempt: 0
        };

        await this.serviceManager.trackStepUsage(stepUsage);
        console.log(`   Tracked step: ${step.stepId} (${step.tokens.totalTokens} tokens)`);

        // Small delay between steps
        await this.delay(100);
      }

      // Test deduplication by trying to track the same step again
      console.log('3. Testing deduplication...');
      const duplicateStep = {
        ...steps[0],
        sessionId,
        userId,
        timestamp: new Date(),
        retryAttempt: 0
      };

      const tracked = await this.serviceManager.trackStepUsage(duplicateStep);
      console.log(`   Duplicate step tracked: ${tracked}`);

      // Get session cost
      console.log('4. Getting session cost...');
      const sessionCost = this.serviceManager.getSessionCost(sessionId);
      if (sessionCost) {
        console.log(`   Session cost: $${sessionCost.totalCost.toFixed(4)}`);
        console.log(`   Total tokens: ${sessionCost.totalTokens.totalTokens}`);
        console.log(`   Step count: ${sessionCost.stepCount}`);
      }

      // End session
      console.log('5. Ending session...');
      this.serviceManager.endSession(sessionId, 'completed');
      console.log(`   Session ended: ${sessionId}`);

      // Get analytics
      console.log('6. Getting analytics...');
      const analytics = this.serviceManager.getUsageAnalytics({
        userId,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate: new Date(),
        granularity: 'hour'
      });
      console.log(`   Analytics records: ${analytics.length}`);

      // Get billing information
      console.log('7. Getting billing information...');
      const billingPeriod = this.serviceManager.getBillingPeriod(userId);
      if (billingPeriod) {
        console.log(`   Current billing period: ${billingPeriod.id}`);
        console.log(`   Period cost: $${billingPeriod.usage.totalCost.toFixed(4)}`);
      }

      const billingStats = this.serviceManager.getBillingStats(userId);
      console.log(`   Total charges: ${billingStats.totalCharges}`);
      console.log(`   Total cost: $${billingStats.totalCost.toFixed(4)}`);

      console.log('\n✅ Usage simulation completed successfully!\n');

    } catch (error) {
      console.error('❌ Usage simulation failed:', error);
    }
  }

  /**
   * Example: Demonstrate error handling
   */
  public async demonstrateErrorHandling(): Promise<void> {
    console.log('\n🔧 Demonstrating error handling...\n');

    const services = this.serviceManager.getServices();
    const errorService = services.errorHandling;

    try {
      // Test successful retry
      console.log('1. Testing successful retry...');
      let attemptCount = 0;
      const result = await errorService.executeWithRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return 'Success!';
        },
        'testOperation',
        { maxRetries: 3 }
      );
      console.log(`   Result: ${result} (after ${attemptCount} attempts)`);

      // Test circuit breaker
      console.log('2. Testing circuit breaker...');
      for (let i = 0; i < 6; i++) {
        try {
          await errorService.executeWithRetry(
            async () => {
              throw new Error('Persistent failure');
            },
            'circuitBreakerTest',
            { maxRetries: 1 }
          );
        } catch (error) {
          console.log(`   Attempt ${i + 1}: ${error.message}`);
        }
      }

      // Check circuit breaker status
      const cbStatus = errorService.getCircuitBreakerStatus();
      console.log('   Circuit breaker status:', cbStatus);

      // Get error metrics
      const metrics = errorService.getMetrics();
      console.log('   Error metrics:', {
        totalErrors: metrics.totalErrors,
        retryAttempts: metrics.retryAttempts,
        successfulRetries: metrics.successfulRetries
      });

    } catch (error) {
      console.error('Error handling demonstration failed:', error);
    }

    console.log('\n✅ Error handling demonstration completed!\n');
  }

  /**
   * Example: Generate comprehensive report
   */
  public async generateReport(): Promise<void> {
    console.log('\n📊 Generating comprehensive report...\n');

    try {
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date()
      };

      const report = this.serviceManager.generateReport(timeRange);

      console.log('Report Summary:');
      console.log(`  Time Range: ${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`);
      console.log(`  Total Cost: $${report.summary.totalCost.toFixed(4)}`);
      console.log(`  Total Tokens: ${report.summary.totalTokens.toLocaleString()}`);
      console.log(`  Total Steps: ${report.summary.totalSteps}`);
      console.log(`  Total Charges: ${report.summary.totalCharges}`);

      console.log('\nHealth Status:');
      console.log(`  Overall: ${report.health.overall}`);
      console.log(`  Active Sessions: ${report.health.services.costTracker.activeSessions}`);
      console.log(`  Active Alerts: ${report.health.services.monitoring.activeAlerts}`);
      console.log(`  WebSocket Connections: ${report.health.services.webSocket.activeConnections}`);

      console.log('\n✅ Report generated successfully!\n');

    } catch (error) {
      console.error('Report generation failed:', error);
    }
  }

  /**
   * Start the Express server
   */
  public async start(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🚀 Cost tracking server running on port ${port}`);
        console.log(`   Health check: http://localhost:${port}/health`);
        console.log(`   API docs: http://localhost:${port}/api/cost-tracking`);
        console.log(`   WebSocket: ws://localhost:8081/ws/cost-tracking`);
        resolve();
      });
    });
  }

  /**
   * Gracefully shutdown the system
   */
  public async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down cost tracking system...');

    if (this.serviceManager) {
      await this.serviceManager.shutdown();
    }

    console.log('✅ Cost tracking system shut down successfully');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Example usage
async function runExample(): Promise<void> {
  const example = new CostTrackingExample();

  try {
    // Initialize the system
    await example.initialize();

    // Start the server
    await example.start(3000);

    // Run simulations
    await example.simulateUsage();
    await example.demonstrateErrorHandling();
    await example.generateReport();

    // Keep the server running
    console.log('💡 Server is running. Press Ctrl+C to shutdown.');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await example.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await example.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Example failed:', error);
    await example.shutdown();
    process.exit(1);
  }
}

// Export for use in other modules
export { runExample };

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}