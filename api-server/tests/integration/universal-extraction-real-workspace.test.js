import { describe, it, expect } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';

describe('Universal Extraction - Real link-logger Workspace', () => {
  it('should extract intelligence from actual link-logger workspace', async () => {
    const worker = new AgentWorker({ workerId: 'test-real' });
    const realWorkspace = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';

    const result = await worker.extractFromWorkspaceFiles(realWorkspace);

    console.log('=== REAL WORKSPACE EXTRACTION RESULT ===');
    console.log('Result:', result ? result.substring(0, 200) + '...' : 'null');
    console.log('Length:', result ? result.length : 0);

    // Should find content (NOT "No summary available")
    expect(result).not.toBeNull();
    expect(result.length).toBeGreaterThan(50);

    // Should contain actual intelligence content
    const hasIntelligence = result.includes('AgentDB') ||
                           result.includes('intelligence') ||
                           result.includes('strategic') ||
                           result.includes('analysis') ||
                           result.includes('competitive');

    expect(hasIntelligence).toBe(true);

    // Should NOT contain placeholder text
    expect(result).not.toContain('No summary available');
    expect(result).not.toContain('Example text');
    expect(result).not.toContain('[placeholder]');
  });

  it('should log which directory and file was found', async () => {
    const consoleLogs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      consoleLogs.push(args.join(' '));
      originalLog(...args);
    };

    const worker = new AgentWorker({ workerId: 'test-logging' });
    const realWorkspace = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';

    await worker.extractFromWorkspaceFiles(realWorkspace);

    console.log = originalLog;

    // Should have logged success message
    const hasSuccessLog = consoleLogs.some(log => log.includes('✅ Found intelligence'));
    expect(hasSuccessLog).toBe(true);

    // Log should mention the directory
    const mentionsDir = consoleLogs.some(log =>
      log.includes('outputs') ||
      log.includes('strategic-analysis') ||
      log.includes('intelligence')
    );
    expect(mentionsDir).toBe(true);
  });

  it('should complete extraction quickly (< 100ms)', async () => {
    const worker = new AgentWorker({ workerId: 'test-perf' });
    const realWorkspace = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';

    const startTime = Date.now();
    await worker.extractFromWorkspaceFiles(realWorkspace);
    const duration = Date.now() - startTime;

    console.log(`⏱️  Real workspace extraction time: ${duration}ms`);
    expect(duration).toBeLessThan(100);
  });
});
