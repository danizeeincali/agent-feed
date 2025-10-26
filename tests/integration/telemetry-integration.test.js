/**
 * TelemetryService Integration Test
 * Verifies that telemetry events are captured, persisted, and broadcast correctly
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { TelemetryService } from '../../src/services/TelemetryService.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('TelemetryService Integration Tests', () => {
  let db;
  let telemetry;
  let broadcastedEvents = [];

  // Mock SSE broadcast function
  const mockSSEBroadcast = (event) => {
    broadcastedEvents.push(event);
    console.log('📡 Mock SSE Broadcast:', event);
  };

  before(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Load schema
    const schemaPath = join(__dirname, '../../src/database/token-analytics-schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema as a whole (better-sqlite3 handles multiple statements)
    try {
      db.exec(schema);
      console.log('✅ Schema loaded successfully');
    } catch (error) {
      console.error('❌ Schema load error:', error.message);
      // Try executing line by line for better error messages
      const lines = schema.split('\n');
      let currentStatement = '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip comments
        if (trimmedLine.startsWith('--') || trimmedLine === '') {
          continue;
        }

        currentStatement += line + '\n';

        // Execute when we hit a semicolon
        if (trimmedLine.endsWith(';')) {
          try {
            db.exec(currentStatement);
          } catch (execError) {
            // Only log errors that matter
            if (!currentStatement.toLowerCase().includes('pragma') &&
                !currentStatement.toLowerCase().includes('insert into sqlite_master')) {
              console.warn('Statement error:', execError.message);
            }
          }
          currentStatement = '';
        }
      }
    }

    // Initialize telemetry service
    telemetry = new TelemetryService(db, { broadcast: mockSSEBroadcast });

    console.log('✅ Test setup complete');
  });

  after(() => {
    db.close();
    console.log('✅ Test cleanup complete');
  });

  it('should initialize TelemetryService with db and sse', () => {
    assert.ok(telemetry, 'TelemetryService should be initialized');
    assert.ok(telemetry.db, 'Database should be set');
    assert.ok(telemetry.sseStream, 'SSE stream should be set');
  });

  it('should capture session_started event', async () => {
    broadcastedEvents = [];

    const sessionId = 'test_session_001';
    const result = await telemetry.captureSessionStarted(sessionId, 'api_request');

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(result.sessionId, sessionId, 'Should return sessionId');

    // Verify database entry
    const session = db.prepare('SELECT * FROM token_sessions WHERE session_id = ?').get(sessionId);
    assert.ok(session, 'Session should exist in database');
    assert.strictEqual(session.session_id, sessionId, 'Session ID should match');
    assert.strictEqual(session.status, 'active', 'Session should be active');

    // Verify SSE broadcast
    assert.strictEqual(broadcastedEvents.length, 1, 'Should broadcast 1 event');
    assert.strictEqual(broadcastedEvents[0].type, 'telemetry_event', 'Event type should be telemetry_event');
    assert.strictEqual(broadcastedEvents[0].data.event, 'session_started', 'Event should be session_started');
    assert.strictEqual(broadcastedEvents[0].data.sessionId, sessionId, 'Event should contain sessionId');

    console.log('✅ session_started event captured successfully');
  });

  it('should capture prompt_submitted event', async () => {
    broadcastedEvents = [];

    const sessionId = 'test_session_001';
    const prompt = 'Write a simple hello world function';
    const model = 'claude-sonnet-4-20250514';

    const result = await telemetry.capturePromptSubmitted(sessionId, prompt, model);

    assert.strictEqual(result.success, true, 'Should return success');
    assert.ok(result.promptHash, 'Should return prompt hash');

    // Verify SSE broadcast
    assert.strictEqual(broadcastedEvents.length, 1, 'Should broadcast 1 event');
    assert.strictEqual(broadcastedEvents[0].type, 'telemetry_event', 'Event type should be telemetry_event');
    assert.strictEqual(broadcastedEvents[0].data.event, 'prompt_submitted', 'Event should be prompt_submitted');
    assert.strictEqual(broadcastedEvents[0].data.model, model, 'Event should contain model');
    assert.ok(broadcastedEvents[0].data.promptPreview, 'Event should contain prompt preview');

    console.log('✅ prompt_submitted event captured successfully');
  });

  it('should capture agent_started event', async () => {
    broadcastedEvents = [];

    const agentId = 'agent_001';
    const sessionId = 'test_session_001';
    const agentType = 'streaming_chat';
    const task = 'Write a simple hello world function';
    const model = 'claude-sonnet-4-20250514';

    const result = await telemetry.captureAgentStarted(agentId, sessionId, agentType, task, model);

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(result.agentId, agentId, 'Should return agentId');

    // Verify agent is in active agents
    const activeAgent = telemetry.activeAgents.get(agentId);
    assert.ok(activeAgent, 'Agent should be in active agents');
    assert.strictEqual(activeAgent.status, 'running', 'Agent status should be running');
    assert.strictEqual(activeAgent.agentType, agentType, 'Agent type should match');

    // Verify SSE broadcast
    assert.strictEqual(broadcastedEvents.length, 1, 'Should broadcast 1 event');
    assert.strictEqual(broadcastedEvents[0].data.event, 'agent_started', 'Event should be agent_started');
    assert.strictEqual(broadcastedEvents[0].data.agentId, agentId, 'Event should contain agentId');

    console.log('✅ agent_started event captured successfully');
  });

  it('should capture tool_execution event', async () => {
    broadcastedEvents = [];

    const toolName = 'Bash';
    const toolInput = { command: 'ls -la' };
    const toolOutput = { stdout: 'file1.txt\nfile2.txt' };
    const startTime = Date.now();
    const endTime = startTime + 150;

    const result = await telemetry.captureToolExecution(
      toolName,
      toolInput,
      toolOutput,
      startTime,
      endTime
    );

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(result.toolName, toolName, 'Should return toolName');
    assert.strictEqual(result.duration, 150, 'Should calculate duration correctly');

    // Verify SSE broadcast
    assert.strictEqual(broadcastedEvents.length, 1, 'Should broadcast 1 event');
    assert.strictEqual(broadcastedEvents[0].data.event, 'tool_execution', 'Event should be tool_execution');
    assert.strictEqual(broadcastedEvents[0].data.toolName, toolName, 'Event should contain toolName');
    assert.strictEqual(broadcastedEvents[0].data.duration, 150, 'Event should contain duration');
    assert.strictEqual(broadcastedEvents[0].data.success, true, 'Event should indicate success');

    console.log('✅ tool_execution event captured successfully');
  });

  it('should capture agent_completed event', async () => {
    broadcastedEvents = [];

    const agentId = 'agent_001';
    const metadata = {
      sessionId: 'test_session_001',
      tokens: { input: 100, output: 200, total: 300 },
      cost: 0.0015,
      messageCount: 3
    };

    const result = await telemetry.captureAgentCompleted(agentId, metadata);

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(result.agentId, agentId, 'Should return agentId');
    assert.ok(result.duration >= 0, 'Should return duration');

    // Verify agent status updated
    const activeAgent = telemetry.activeAgents.get(agentId);
    assert.ok(activeAgent, 'Agent should still exist');
    assert.strictEqual(activeAgent.status, 'completed', 'Agent status should be completed');

    // Verify SSE broadcast
    assert.strictEqual(broadcastedEvents.length, 1, 'Should broadcast 1 event');
    assert.strictEqual(broadcastedEvents[0].data.event, 'agent_completed', 'Event should be agent_completed');
    assert.strictEqual(broadcastedEvents[0].data.agentId, agentId, 'Event should contain agentId');
    assert.ok(broadcastedEvents[0].data.tokens, 'Event should contain token info');

    console.log('✅ agent_completed event captured successfully');
  });

  it('should capture agent_failed event', async () => {
    broadcastedEvents = [];

    const agentId = 'agent_002';
    const sessionId = 'test_session_001';
    const error = new Error('Test error');

    // First start the agent
    await telemetry.captureAgentStarted(agentId, sessionId, 'background_task', 'Test task', 'claude-sonnet-4-20250514');

    // Clear broadcasts from agent_started
    broadcastedEvents = [];

    // Now fail the agent
    const result = await telemetry.captureAgentFailed(agentId, error);

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(result.agentId, agentId, 'Should return agentId');

    // Verify agent removed from active agents
    const activeAgent = telemetry.activeAgents.get(agentId);
    assert.strictEqual(activeAgent, undefined, 'Agent should be removed from active agents');

    // Verify SSE broadcast
    assert.strictEqual(broadcastedEvents.length, 1, 'Should broadcast 1 event');
    assert.strictEqual(broadcastedEvents[0].data.event, 'agent_failed', 'Event should be agent_failed');
    assert.strictEqual(broadcastedEvents[0].data.agentId, agentId, 'Event should contain agentId');
    assert.strictEqual(broadcastedEvents[0].data.error, error.message, 'Event should contain error message');

    console.log('✅ agent_failed event captured successfully');
  });

  it('should capture session_ended event', async () => {
    broadcastedEvents = [];

    const sessionId = 'test_session_001';
    const result = await telemetry.captureSessionEnded(sessionId, 'completed');

    assert.strictEqual(result.success, true, 'Should return success');
    assert.strictEqual(result.status, 'completed', 'Should return status');

    // Verify database update
    const session = db.prepare('SELECT * FROM token_sessions WHERE session_id = ?').get(sessionId);
    assert.ok(session, 'Session should exist in database');
    assert.strictEqual(session.status, 'completed', 'Session status should be completed');
    assert.ok(session.end_time, 'Session should have end_time');

    // Verify SSE broadcast
    assert.strictEqual(broadcastedEvents.length, 1, 'Should broadcast 1 event');
    assert.strictEqual(broadcastedEvents[0].data.event, 'session_ended', 'Event should be session_ended');
    assert.strictEqual(broadcastedEvents[0].data.status, 'completed', 'Event should contain status');

    console.log('✅ session_ended event captured successfully');
  });

  it('should get telemetry statistics', () => {
    const stats = telemetry.getStatistics();

    assert.ok(stats, 'Should return statistics');
    assert.ok(stats.sessions, 'Should include session stats');
    assert.strictEqual(typeof stats.activeAgents, 'number', 'Should include active agents count');
    assert.strictEqual(typeof stats.activeSessions, 'number', 'Should include active sessions count');

    console.log('✅ Statistics retrieved successfully:', stats);
  });

  it('should handle errors gracefully', async () => {
    // Test with invalid sessionId (null db operation should not crash)
    const result = await telemetry.captureSessionStarted(null, 'test');

    // Should return false or handle gracefully
    assert.ok(result, 'Should return a result object');
    console.log('✅ Error handling verified');
  });
});
