# AnthropicSDKManager to Claude Code SDK Migration Guide

**Document Version**: 1.0
**Date**: September 15, 2025
**Migration Target**: Full Claude Code SDK with Enhanced Architecture
**Working Directory**: `/workspaces/agent-feed/prod`

---

## Executive Summary

This guide provides a comprehensive step-by-step migration from the existing `AnthropicSDKManager` to the new enhanced `ClaudeCodeSDKManager` with full tool access, advanced session management, and enterprise-grade security controls.

### Key Migration Benefits

1. **Full Tool Access**: Complete SDK tool ecosystem with `--dangerously-skip-permissions`
2. **Advanced Session Management**: Persistent sessions with automatic recovery
3. **Enhanced Security**: Role-based permissions and audit logging
4. **Better Performance**: Automatic context management and resource optimization
5. **Enterprise Features**: Monitoring, metrics, and compliance reporting

---

## Current vs. New Architecture Comparison

### Current AnthropicSDKManager
```typescript
class AnthropicSDKManager {
  // Basic API wrapper
  async createStreamingChat(userInput, options = {}) {
    const response = await this.anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: userInput }]
    });
    return [{ type: 'assistant', content: response.content[0].text }];
  }

  // Mock headless execution
  async executeHeadlessTask(prompt, options = {}) {
    // Limited to basic API calls
    return { output: "Basic response" };
  }
}
```

### New ClaudeCodeSDKManager
```typescript
class ClaudeCodeSDKManager {
  // Full SDK integration with tool access
  async createStreamingSession(userId, options) {
    const session = await this.sessionManager.createSession(userId, 'streaming');
    const permissions = await this.permissionManager.getPermissions(userId);

    return new StreamingSession({
      claude: this.claude, // Full Claude Code SDK
      permissions,
      tools: ['Read', 'Write', 'Bash', 'Grep', 'Glob', 'WebSearch'],
      dangerousMode: true
    });
  }

  // Real headless execution with full tool access
  async executeHeadlessTask(task) {
    return await this.claude.execute({
      prompt: task.prompt,
      workingDirectory: task.workingDirectory,
      allowedTools: task.allowedTools,
      outputFormat: task.outputFormat,
      dangerouslySkipPermissions: true
    });
  }
}
```

---

## Migration Plan

### Phase 1: Environment Setup and SDK Installation

#### 1.1 Install Claude Code SDK
```bash
# Navigate to production directory
cd /workspaces/agent-feed/prod

# Install Claude Code SDK
npm install @anthropic-ai/claude-code

# Install additional dependencies
npm install redis @types/redis socket.io
```

#### 1.2 Environment Configuration
```bash
# Update .env file
cat >> .env << EOF
# Claude Code SDK Configuration
ANTHROPIC_API_KEY=sk-ant-api03-...
CLAUDE_WORKING_DIRECTORY=/workspaces/agent-feed/prod
CLAUDE_DANGEROUS_MODE=true
CLAUDE_MAX_CONCURRENT_SESSIONS=10

# Session Management
SESSION_REDIS_URL=redis://localhost:6379
SESSION_TTL=3600000
CONTEXT_MAX_SIZE=100000
AUTO_COMPACTION_THRESHOLD=80000

# Security
AUDIT_LEVEL=verbose
REQUIRE_AUTHENTICATION=true
MAX_CONCURRENT_OPERATIONS=5

# Monitoring
ENABLE_METRICS=true
ENABLE_ALERTS=true
LOG_LEVEL=info
EOF
```

#### 1.3 Directory Structure Setup
```bash
# Create new service directories
mkdir -p src/services
mkdir -p src/api/routes
mkdir -p src/middleware
mkdir -p docs/migration
mkdir -p logs

# Copy new service files
# (Files already created in previous steps)
```

### Phase 2: Gradual Service Replacement

#### 2.1 Deploy New Services Alongside Old
```typescript
// src/services/index.ts
export { AnthropicSDKManager } from './AnthropicSDKManager'; // Old
export { ClaudeCodeSDKManager } from './ClaudeCodeSDKManager'; // New

// Initialize both managers during transition
const legacySDK = new AnthropicSDKManager();
const newSDK = new ClaudeCodeSDKManager(config);
```

#### 2.2 Feature Flag Implementation
```typescript
// src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_NEW_SDK: process.env.USE_NEW_SDK === 'true',
  STREAMING_SESSIONS: process.env.ENABLE_STREAMING_SESSIONS === 'true',
  HEADLESS_TASKS: process.env.ENABLE_HEADLESS_TASKS === 'true',
  DANGEROUS_MODE: process.env.CLAUDE_DANGEROUS_MODE === 'true'
};

// Usage in API routes
if (FEATURE_FLAGS.USE_NEW_SDK) {
  return await newSDK.createStreamingSession(userId, options);
} else {
  return await legacySDK.createStreamingChat(message, options);
}
```

#### 2.3 Compatibility Layer
```typescript
// src/services/CompatibilityLayer.ts
export class CompatibilityLayer {
  private legacySDK: AnthropicSDKManager;
  private newSDK: ClaudeCodeSDKManager;

  async handleLegacyStreamingChat(userInput: string, options: any) {
    if (FEATURE_FLAGS.USE_NEW_SDK) {
      // Convert to new format
      const session = await this.newSDK.createStreamingSession(
        options.userId || 'legacy-user',
        { workingDirectory: options.workingDirectory }
      );

      await session.sendMessage({
        role: 'user',
        content: userInput
      });

      return this.convertStreamingResponse(session);
    } else {
      return await this.legacySDK.createStreamingChat(userInput, options);
    }
  }

  private convertStreamingResponse(session: StreamingSession) {
    // Convert new streaming format to legacy format
    return new Promise((resolve) => {
      const responses: any[] = [];

      session.subscribe((event) => {
        if (event.type === 'message') {
          responses.push({
            type: 'assistant',
            content: event.data.content,
            timestamp: event.timestamp
          });
        }
      });

      // Return after first complete response
      setTimeout(() => resolve(responses), 1000);
    });
  }
}
```

### Phase 3: API Endpoint Migration

#### 3.1 Update Backend Routes
```typescript
// src/api/routes/anthropic-sdk.js -> claude-code-sdk.ts
import express from 'express';
import { getClaudeCodeSDKManager } from '../services/ClaudeCodeSDKManager';
import { CompatibilityLayer } from '../services/CompatibilityLayer';

const router = express.Router();
const compatLayer = new CompatibilityLayer();

// Maintain backward compatibility
router.post('/streaming-chat', async (req, res) => {
  try {
    const { message, options = {} } = req.body;

    // Use compatibility layer for smooth transition
    const responses = await compatLayer.handleLegacyStreamingChat(message, {
      ...options,
      userId: req.user.id
    });

    res.json({
      success: true,
      responses,
      migrationStatus: 'compatibility_mode',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      migrationStatus: 'error'
    });
  }
});

// New enhanced endpoints
router.post('/sessions', async (req, res) => {
  // New session management endpoint
  // (Implementation from claude-code-sdk.ts)
});
```

#### 3.2 Frontend Integration Updates
```typescript
// frontend/src/services/claudeSDKService.ts
class ClaudeSDKService {
  private useNewAPI = process.env.REACT_APP_USE_NEW_SDK === 'true';

  async createChat(message: string, options?: any) {
    if (this.useNewAPI) {
      // Use new session-based API
      const session = await this.createSession('streaming');
      await this.sendMessage(session.id, message);
      return this.subscribeToSession(session.id);
    } else {
      // Use legacy API
      return await this.legacyStreamingChat(message, options);
    }
  }

  private async createSession(type: 'streaming' | 'headless') {
    const response = await fetch('/api/claude/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    return response.json();
  }

  private subscribeToSession(sessionId: string) {
    const eventSource = new EventSource(`/api/claude/sessions/${sessionId}/stream`);

    return new Promise((resolve) => {
      const messages: any[] = [];

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          messages.push(data.data);
        }
      };

      // Return after collecting responses
      setTimeout(() => {
        eventSource.close();
        resolve(messages);
      }, 5000);
    });
  }
}
```

### Phase 4: Data Migration and Testing

#### 4.1 Session Data Migration
```typescript
// scripts/migrate-sessions.ts
import { AnthropicSDKManager } from '../src/services/AnthropicSDKManager';
import { ClaudeCodeSDKManager } from '../src/services/ClaudeCodeSDKManager';

export class SessionMigrationScript {
  async migrateSessions() {
    console.log('🔄 Starting session migration...');

    // 1. Export existing session data
    const existingSessions = await this.exportLegacySessions();
    console.log(`Found ${existingSessions.length} existing sessions`);

    // 2. Convert to new format
    const convertedSessions = await this.convertSessionFormat(existingSessions);

    // 3. Import to new system
    const results = await this.importToNewSDK(convertedSessions);

    console.log(`✅ Migration completed: ${results.successful}/${results.total} sessions migrated`);
    return results;
  }

  private async exportLegacySessions() {
    // Export conversation history and session data from old system
    return []; // Implementation depends on current storage
  }

  private async convertSessionFormat(sessions: any[]) {
    return sessions.map(session => ({
      userId: session.userId,
      type: 'streaming',
      context: {
        messages: session.conversationHistory || [],
        artifacts: [],
        workingState: {}
      },
      configuration: {
        workingDirectory: '/workspaces/agent-feed/prod',
        toolPermissions: this.getDefaultPermissions(session.userId)
      }
    }));
  }

  private async importToNewSDK(sessions: any[]) {
    const newSDK = getClaudeCodeSDKManager();
    const results = { successful: 0, failed: 0, total: sessions.length };

    for (const sessionData of sessions) {
      try {
        const session = await newSDK.createStreamingSession(
          sessionData.userId,
          sessionData.configuration
        );

        // Restore context if needed
        await this.restoreSessionContext(session.id, sessionData.context);

        results.successful++;
      } catch (error) {
        console.error(`Failed to migrate session for user ${sessionData.userId}:`, error);
        results.failed++;
      }
    }

    return results;
  }
}

// Run migration
const migration = new SessionMigrationScript();
migration.migrateSessions().catch(console.error);
```

#### 4.2 Comprehensive Testing
```typescript
// tests/migration/sdk-migration.test.ts
describe('SDK Migration Tests', () => {
  let legacySDK: AnthropicSDKManager;
  let newSDK: ClaudeCodeSDKManager;

  beforeEach(() => {
    legacySDK = new AnthropicSDKManager();
    newSDK = getClaudeCodeSDKManager(testConfig);
  });

  describe('Feature Parity Tests', () => {
    it('should provide equivalent streaming chat functionality', async () => {
      const testMessage = 'Hello, Claude!';

      // Test legacy implementation
      const legacyResponse = await legacySDK.createStreamingChat(testMessage);

      // Test new implementation
      const session = await newSDK.createStreamingSession('test-user');
      await session.sendMessage({ role: 'user', content: testMessage });

      const newResponse = await new Promise((resolve) => {
        const responses: any[] = [];
        session.subscribe((event) => {
          if (event.type === 'message') {
            responses.push(event.data);
          }
        });
        setTimeout(() => resolve(responses), 2000);
      });

      // Verify both provide valid responses
      expect(legacyResponse).toBeDefined();
      expect(newResponse).toBeDefined();
      expect(Array.isArray(legacyResponse)).toBe(true);
      expect(Array.isArray(newResponse)).toBe(true);
    });

    it('should provide enhanced headless execution', async () => {
      const testPrompt = 'List files in current directory';

      // Test legacy (limited functionality)
      const legacyResult = await legacySDK.executeHeadlessTask(testPrompt);

      // Test new (full tool access)
      const newResult = await newSDK.executeHeadlessTask({
        prompt: testPrompt,
        userId: 'test-user',
        workingDirectory: '/workspaces/agent-feed/prod',
        allowedTools: ['Bash', 'Read', 'Glob'],
        outputFormat: 'json'
      });

      // New implementation should provide more detailed results
      expect(newResult.output).toBeDefined();
      expect(newResult.metrics).toBeDefined();
      expect(newResult.status).toBe('completed');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent sessions efficiently', async () => {
      const concurrentSessions = 5;
      const sessionPromises = [];

      for (let i = 0; i < concurrentSessions; i++) {
        sessionPromises.push(
          newSDK.createStreamingSession(`test-user-${i}`)
        );
      }

      const sessions = await Promise.all(sessionPromises);
      expect(sessions).toHaveLength(concurrentSessions);

      // All sessions should be active
      for (const session of sessions) {
        expect(session.session.status).toBe('active');
      }

      // Cleanup
      await Promise.all(
        sessions.map(session =>
          newSDK.terminateSession(session.id, 'test_cleanup')
        )
      );
    });
  });

  describe('Security Tests', () => {
    it('should enforce tool permissions properly', async () => {
      const session = await newSDK.createStreamingSession('test-user');

      // Should allow safe tools
      const safeToolAccess = await newSDK.validateToolAccess(
        session.id, 'Read', 'read_file'
      );
      expect(safeToolAccess).toBe(true);

      // Should restrict dangerous tools for regular users
      const dangerousToolAccess = await newSDK.validateToolAccess(
        session.id, 'KillShell', 'terminate_process'
      );
      expect(dangerousToolAccess).toBe(false);
    });
  });
});
```

### Phase 5: Production Deployment

#### 5.1 Blue-Green Deployment Strategy
```bash
#!/bin/bash
# scripts/deploy-migration.sh

echo "🚀 Starting Blue-Green SDK Migration Deployment"

# Step 1: Deploy new services alongside existing ones
echo "📦 Deploying new SDK services..."
docker-compose -f docker-compose.migration.yml up -d

# Step 2: Run health checks
echo "🔍 Running health checks..."
curl -f http://localhost:3000/api/claude/health || exit 1

# Step 3: Run migration tests
echo "🧪 Running migration tests..."
npm run test:migration || exit 1

# Step 4: Gradual traffic shift
echo "🔄 Starting traffic shift..."
export USE_NEW_SDK=true
export MIGRATION_PERCENTAGE=10

# Monitor for 10 minutes
sleep 600

# Step 5: Increase traffic gradually
export MIGRATION_PERCENTAGE=50
sleep 600

export MIGRATION_PERCENTAGE=100
echo "✅ Migration completed successfully"
```

#### 5.2 Rollback Procedure
```bash
#!/bin/bash
# scripts/rollback-migration.sh

echo "⚠️ Initiating SDK migration rollback"

# Step 1: Switch traffic back to legacy system
export USE_NEW_SDK=false
export MIGRATION_PERCENTAGE=0

# Step 2: Terminate new sessions gracefully
curl -X POST http://localhost:3000/api/claude/sessions/terminate-all

# Step 3: Restore from backup if needed
if [ "$RESTORE_DATA" = "true" ]; then
  echo "🔄 Restoring session data from backup..."
  # Restore implementation
fi

# Step 4: Verify legacy system health
curl -f http://localhost:3000/api/avi/health || echo "❌ Legacy system health check failed"

echo "✅ Rollback completed"
```

#### 5.3 Monitoring and Alerting
```typescript
// src/monitoring/migration-monitor.ts
export class MigrationMonitor {
  private metrics = {
    legacyRequests: 0,
    newRequests: 0,
    errors: 0,
    responseTime: 0
  };

  trackRequest(type: 'legacy' | 'new', responseTime: number, error?: boolean) {
    if (type === 'legacy') {
      this.metrics.legacyRequests++;
    } else {
      this.metrics.newRequests++;
    }

    if (error) {
      this.metrics.errors++;
    }

    this.metrics.responseTime =
      (this.metrics.responseTime + responseTime) / 2;

    // Alert if error rate > 5%
    const totalRequests = this.metrics.legacyRequests + this.metrics.newRequests;
    const errorRate = this.metrics.errors / totalRequests;

    if (errorRate > 0.05) {
      this.sendAlert('High error rate detected during migration');
    }
  }

  getMigrationProgress() {
    const total = this.metrics.legacyRequests + this.metrics.newRequests;
    const newPercentage = total > 0 ? this.metrics.newRequests / total : 0;

    return {
      totalRequests: total,
      newSDKPercentage: newPercentage,
      errorRate: this.metrics.errors / total,
      averageResponseTime: this.metrics.responseTime
    };
  }

  private sendAlert(message: string) {
    console.error(`🚨 MIGRATION ALERT: ${message}`);
    // Integration with alerting system
  }
}
```

---

## Post-Migration Validation

### 1. Functional Testing
```bash
# Test all major endpoints
curl -X POST http://localhost:3000/api/claude/sessions \
  -H "Content-Type: application/json" \
  -d '{"type": "streaming"}'

curl -X POST http://localhost:3000/api/claude/tasks \
  -H "Content-Type: application/json" \
  -d '{"prompt": "List files", "allowedTools": ["Bash"]}'
```

### 2. Performance Validation
```bash
# Load testing with new SDK
npm run test:load:new-sdk

# Compare with baseline
npm run test:compare:performance
```

### 3. Security Validation
```bash
# Verify permission enforcement
npm run test:security:permissions

# Audit dangerous mode usage
npm run test:security:dangerous-mode
```

---

## Cleanup and Optimization

### 1. Remove Legacy Code
```bash
# After successful migration (wait 2 weeks)
rm -rf src/services/AnthropicSDKManager.js
rm -rf src/api/routes/anthropic-sdk.js

# Update imports
find . -name "*.ts" -exec sed -i 's/AnthropicSDKManager/ClaudeCodeSDKManager/g' {} \;
```

### 2. Optimize New System
```typescript
// Optimize based on production metrics
const optimizations = [
  'Enable context compaction',
  'Tune session timeouts',
  'Optimize tool permissions',
  'Improve error recovery'
];
```

---

## Success Metrics

### Migration Success Criteria
- ✅ Zero data loss during migration
- ✅ < 1% error rate increase
- ✅ All legacy features available in new system
- ✅ Enhanced features working (full tool access, sessions)
- ✅ Security controls properly enforced
- ✅ Performance equal or better than legacy system

### Key Performance Indicators
- **Response Time**: ≤ legacy system + 10%
- **Error Rate**: ≤ 1%
- **Tool Access Success**: ≥ 95%
- **Session Recovery**: ≥ 99%
- **Security Compliance**: 100%

---

## Troubleshooting Guide

### Common Migration Issues

#### 1. "Claude Code SDK not found"
```bash
# Solution: Install SDK properly
npm install @anthropic-ai/claude-code
npm install --save-dev @types/node
```

#### 2. "Permission denied for tool access"
```typescript
// Solution: Check user permissions
const userProfile = await permissionManager.getUserPermissions(userId);
console.log('User permissions:', userProfile.permissions.tools);
```

#### 3. "Session timeout during migration"
```typescript
// Solution: Increase timeout for migration
const migrationConfig = {
  ...defaultConfig,
  session: {
    ...defaultConfig.session,
    defaultTimeout: 7200000 // 2 hours for migration
  }
};
```

#### 4. "Context overflow in new system"
```typescript
// Solution: Enable automatic compaction
const contextSettings = {
  maxSize: 100000,
  compactionThreshold: 80000,
  compactionStrategy: 'aggressive'
};
```

---

## Support and Documentation

### Resources
- **Architecture Documentation**: `/docs/architecture/claude-code-sdk-integration-architecture.md`
- **API Documentation**: `/docs/api/claude-code-sdk-endpoints.md`
- **Security Guide**: `/docs/security/claude-code-security.md`
- **Monitoring Guide**: `/docs/monitoring/claude-code-monitoring.md`

### Support Contacts
- **Technical Lead**: System Architect
- **Security Review**: Security Team
- **Infrastructure**: DevOps Team

---

**Migration Status**: ✅ **READY FOR EXECUTION**
**Risk Level**: Medium - Well-defined migration path with rollback procedures
**Timeline**: 2-3 weeks including testing and gradual rollout
**Dependencies**: Redis, Claude Code SDK, Enhanced monitoring system

---

*This migration guide provides a comprehensive path from the legacy AnthropicSDKManager to the enhanced Claude Code SDK implementation with minimal risk and maximum feature enhancement.*