/**
 * Protected Agent Fields - Usage Examples
 *
 * Phase 3: Core Components Implementation
 *
 * This file demonstrates how to use the Protected Agent Fields system
 * in real-world scenarios.
 */

import { ProtectedAgentLoader } from '../loaders/protected-agent-loader';
import { IntegrityChecker } from '../validators/integrity-checker';
import { AgentConfigValidator } from '../validators/agent-config-validator';
import logger from '../../utils/logger';

/**
 * Example 1: Basic agent loading (backward compatible)
 * Agents without .protected.yaml sidecars work normally
 */
async function example1_LoadAgentWithoutProtection() {
  console.log('\n=== Example 1: Load agent without protection ===\n');

  const loader = new ProtectedAgentLoader();

  try {
    // Load agent that has no .protected.yaml sidecar
    const config = await loader.loadAgent('simple-agent');

    console.log('Agent loaded successfully:');
    console.log(`  Name: ${config.name}`);
    console.log(`  Description: ${config.description}`);
    console.log(`  Has protection: ${!!config._protected}`);
    console.log(`  Tools: ${config.tools?.join(', ')}`);

  } catch (error) {
    console.error('Failed to load agent:', error);
  }
}

/**
 * Example 2: Loading agent with protected sidecar
 * Demonstrates integrity verification and config merging
 */
async function example2_LoadAgentWithProtection() {
  console.log('\n=== Example 2: Load agent with protection ===\n');

  const loader = new ProtectedAgentLoader();

  try {
    // Load agent that has .protected.yaml sidecar
    const config = await loader.loadAgent('strategic-planner');

    console.log('Agent loaded successfully:');
    console.log(`  Name: ${config.name}`);
    console.log(`  Has protection: ${!!config._protected}`);

    if (config._protected) {
      console.log(`  Protected version: ${config._protected.version}`);
      console.log(`  Protected checksum: ${config._protected.checksum?.substring(0, 20)}...`);
    }

    if (config._permissions) {
      console.log('\nProtected permissions:');
      console.log(`  Workspace root: ${config._permissions.workspace?.root}`);
      console.log(`  Allowed tools: ${config._permissions.tool_permissions?.allowed?.join(', ')}`);
      console.log(`  API access: ${config._permissions.api_access?.base_url}`);
    }

  } catch (error) {
    console.error('Failed to load agent:', error);
  }
}

/**
 * Example 3: Cache performance
 * Demonstrates cache hit vs cache miss performance
 */
async function example3_CachePerformance() {
  console.log('\n=== Example 3: Cache performance ===\n');

  const loader = new ProtectedAgentLoader({
    cacheTTL: 60000, // 1 minute
    maxCacheSize: 100,
  });

  try {
    // First load (cache miss)
    console.log('First load (cache miss):');
    const start1 = Date.now();
    await loader.loadAgent('strategic-planner');
    const duration1 = Date.now() - start1;
    console.log(`  Duration: ${duration1}ms`);

    // Second load (cache hit)
    console.log('\nSecond load (cache hit):');
    const start2 = Date.now();
    await loader.loadAgent('strategic-planner');
    const duration2 = Date.now() - start2;
    console.log(`  Duration: ${duration2}ms`);

    console.log(`\nSpeedup: ${(duration1 / duration2).toFixed(1)}x faster`);

    // Get cache stats
    const stats = loader.getCacheStats();
    console.log('\nCache statistics:');
    console.log(`  Hits: ${stats.hits}`);
    console.log(`  Misses: ${stats.misses}`);
    console.log(`  Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`  Cache size: ${stats.size}`);

  } catch (error) {
    console.error('Failed:', error);
  }
}

/**
 * Example 4: Manual integrity checking
 * Demonstrates standalone integrity checker usage
 */
async function example4_ManualIntegrityCheck() {
  console.log('\n=== Example 4: Manual integrity check ===\n');

  const checker = new IntegrityChecker();

  // Example protected config
  const config = {
    version: '1.0.0',
    agent_id: 'test-agent',
    permissions: {
      workspace: {
        root: '/workspaces/agent-feed/prod/agent_workspace',
      },
    },
  };

  // Compute and add checksum
  const configWithChecksum = checker.addChecksum(config);

  console.log('Generated config with checksum:');
  console.log(`  Version: ${configWithChecksum.version}`);
  console.log(`  Checksum: ${configWithChecksum.checksum}`);

  // Verify integrity
  const isValid = await checker.verify(configWithChecksum, 'test.yaml');
  console.log(`  Integrity check: ${isValid ? 'PASSED ✓' : 'FAILED ✗'}`);

  // Tamper with config
  console.log('\nTampering with config...');
  const tamperedConfig = {
    ...configWithChecksum,
    permissions: {
      workspace: {
        root: '/tmp/malicious', // Changed!
      },
    },
  };

  const isTamperedValid = await checker.verify(tamperedConfig, 'test.yaml');
  console.log(`  Integrity check after tampering: ${isTamperedValid ? 'PASSED ✓' : 'FAILED ✗'}`);
}

/**
 * Example 5: Hot-reload on file changes
 * Demonstrates file watcher functionality
 */
async function example5_HotReload() {
  console.log('\n=== Example 5: Hot-reload on file changes ===\n');

  const loader = new ProtectedAgentLoader();

  // Start file watcher
  loader.watchForChanges();
  console.log('File watcher started');
  console.log('The loader will automatically reload agents when files change');
  console.log('Try editing an agent .md file or .protected.yaml to see hot-reload in action');

  // Load agent
  const config = await loader.loadAgent('strategic-planner');
  console.log(`\nLoaded agent: ${config.name}`);

  // Keep running for a while to demonstrate watcher
  console.log('\nWatching for changes for 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Stop watcher
  loader.stopWatching();
  console.log('File watcher stopped');
}

/**
 * Example 6: Worker integration pattern
 * Demonstrates how WorkerSpawnerAdapter uses the loader
 */
async function example6_WorkerIntegrationPattern() {
  console.log('\n=== Example 6: Worker integration pattern ===\n');

  // This is how WorkerSpawnerAdapter uses ProtectedAgentLoader
  class MockWorkerSpawner {
    private agentLoader: ProtectedAgentLoader;

    constructor() {
      this.agentLoader = new ProtectedAgentLoader();
      this.agentLoader.watchForChanges(); // Enable hot-reload
    }

    async spawnWorker(ticket: any) {
      console.log(`Spawning worker for ticket ${ticket.id}...`);

      // Load agent config with protection
      const agentConfig = await this.agentLoader.loadAgent(ticket.agentName);

      console.log(`Agent loaded: ${agentConfig.name}`);
      console.log(`  Has protection: ${!!agentConfig._protected}`);

      if (agentConfig._permissions) {
        console.log('  Protected permissions enforced:');
        console.log(`    - Workspace: ${agentConfig._permissions.workspace?.root}`);
        console.log(`    - Tools: ${agentConfig._permissions.tool_permissions?.allowed?.join(', ')}`);
      }

      // Pass config to worker
      // const worker = new ClaudeCodeWorker(db, agentConfig);
      // await worker.executeTicket(ticket);

      console.log('Worker execution would happen here...');
    }
  }

  const spawner = new MockWorkerSpawner();

  // Simulate ticket
  const ticket = {
    id: 'test-123',
    agentName: 'strategic-planner',
    payload: { content: 'Test task' },
  };

  await spawner.spawnWorker(ticket);
}

/**
 * Example 7: Error handling patterns
 * Demonstrates graceful error handling
 */
async function example7_ErrorHandling() {
  console.log('\n=== Example 7: Error handling patterns ===\n');

  const loader = new ProtectedAgentLoader();

  // Case 1: Agent not found
  try {
    console.log('Loading non-existent agent...');
    await loader.loadAgent('non-existent-agent');
  } catch (error) {
    console.log(`  Expected error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Case 2: Integrity check failure (would require actual tampered file)
  console.log('\nIntegrity check failures would trigger SecurityError');
  console.log('The system would:');
  console.log('  1. Log security alert');
  console.log('  2. Refuse to load the agent');
  console.log('  3. Alert administrators');
  console.log('  4. Restore from backup (if TamperingDetector is running)');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Protected Agent Fields - Usage Examples      ║');
  console.log('║  Phase 3: Core Components Implementation      ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    // Run examples sequentially
    // await example1_LoadAgentWithoutProtection();
    // await example2_LoadAgentWithProtection();
    await example3_CachePerformance();
    await example4_ManualIntegrityCheck();
    // await example5_HotReload(); // Commented: runs for 30 seconds
    await example6_WorkerIntegrationPattern();
    await example7_ErrorHandling();

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
  }
}

// Export examples for testing
export {
  example1_LoadAgentWithoutProtection,
  example2_LoadAgentWithProtection,
  example3_CachePerformance,
  example4_ManualIntegrityCheck,
  example5_HotReload,
  example6_WorkerIntegrationPattern,
  example7_ErrorHandling,
  runAllExamples,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
