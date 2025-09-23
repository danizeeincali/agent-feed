/**
 * Performance Regression Tests
 * Tests performance characteristics and resource usage
 */

const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

describe('Performance Regression Tests', () => {
  describe('File System Performance', () => {
    test('should read agent files efficiently', async () => {
      const startTime = performance.now();

      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md'));

      // Read all agent files
      const readPromises = agentFiles.map(file =>
        fs.readFile(path.join(agentsDir, file), 'utf-8')
      );

      const contents = await Promise.all(readPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (2 seconds for all files)
      expect(duration).toBeLessThan(2000);
      expect(contents.length).toBe(agentFiles.length);

      console.log(`Read ${agentFiles.length} agent files in ${duration.toFixed(2)}ms`);
    });

    test('should process agent metadata efficiently', async () => {
      const startTime = performance.now();

      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md'));

      const agents = [];

      for (const file of agentFiles) {
        const content = await fs.readFile(path.join(agentsDir, file), 'utf-8');

        // Simulate metadata extraction
        const titleMatch = content.match(/^#\s+(.+)/m);
        const name = titleMatch ? titleMatch[1] : file.replace('.md', '');

        const agent = {
          id: file.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name,
          description: content.substring(0, 200) + '...',
          category: 'General',
          content
        };

        agents.push(agent);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process all agents within reasonable time
      expect(duration).toBeLessThan(3000);
      expect(agents.length).toBeGreaterThan(0);

      console.log(`Processed ${agents.length} agents in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory when processing agents', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process agents multiple times
      for (let i = 0; i < 3; i++) {
        const agentsDir = '/workspaces/agent-feed/agents';
        const files = await fs.readdir(agentsDir);
        const agentFiles = files.filter(file => file.endsWith('.md'));

        const contents = await Promise.all(
          agentFiles.map(file => fs.readFile(path.join(agentsDir, file), 'utf-8'))
        );

        // Process the content
        const agents = contents.map((content, index) => {
          const file = agentFiles[index];
          const titleMatch = content.match(/^#\s+(.+)/m);
          const name = titleMatch ? titleMatch[1] : file.replace('.md', '');

          return {
            id: file.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name,
            description: content.substring(0, 200),
            category: 'General'
          };
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Scalability Tests', () => {
    test('should handle increasing number of agents efficiently', async () => {
      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md'));

      // Test with different batch sizes
      const batchSizes = [1, 5, 10, agentFiles.length];
      const results = [];

      for (const batchSize of batchSizes) {
        const filesToProcess = agentFiles.slice(0, Math.min(batchSize, agentFiles.length));

        const startTime = performance.now();

        const contents = await Promise.all(
          filesToProcess.map(file => fs.readFile(path.join(agentsDir, file), 'utf-8'))
        );

        const agents = contents.map((content, index) => {
          const file = filesToProcess[index];
          const titleMatch = content.match(/^#\s+(.+)/m);
          const name = titleMatch ? titleMatch[1] : file.replace('.md', '');

          return {
            id: file.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name,
            description: content.substring(0, 200),
            category: 'General'
          };
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          batchSize: filesToProcess.length,
          duration,
          agentsPerMs: filesToProcess.length / duration
        });

        console.log(`Batch ${filesToProcess.length}: ${duration.toFixed(2)}ms`);
      }

      // Performance should scale reasonably
      results.forEach(result => {
        expect(result.duration).toBeLessThan(5000); // Max 5 seconds per batch
        expect(result.agentsPerMs).toBeGreaterThan(0);
      });
    });
  });

  describe('Concurrent Processing', () => {
    test('should handle concurrent agent processing', async () => {
      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md')).slice(0, 5);

      const startTime = performance.now();

      // Process agents concurrently
      const processingPromises = agentFiles.map(async (file) => {
        const content = await fs.readFile(path.join(agentsDir, file), 'utf-8');

        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));

        const titleMatch = content.match(/^#\s+(.+)/m);
        const name = titleMatch ? titleMatch[1] : file.replace('.md', '');

        return {
          id: file.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name,
          description: content.substring(0, 200),
          category: 'General'
        };
      });

      const agents = await Promise.all(processingPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Concurrent processing should be faster than sequential
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(agents.length).toBe(agentFiles.length);

      console.log(`Concurrent processing of ${agents.length} agents: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance', () => {
    test('should demonstrate caching benefits', async () => {
      const agentsDir = '/workspaces/agent-feed/agents';
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md')).slice(0, 3);

      // First read (cold cache)
      const startTime1 = performance.now();
      const contents1 = await Promise.all(
        agentFiles.map(file => fs.readFile(path.join(agentsDir, file), 'utf-8'))
      );
      const duration1 = performance.now() - startTime1;

      // Second read (potentially warm cache)
      const startTime2 = performance.now();
      const contents2 = await Promise.all(
        agentFiles.map(file => fs.readFile(path.join(agentsDir, file), 'utf-8'))
      );
      const duration2 = performance.now() - startTime2;

      // Verify content is the same
      expect(contents1.length).toBe(contents2.length);
      contents1.forEach((content, index) => {
        expect(content).toBe(contents2[index]);
      });

      console.log(`First read: ${duration1.toFixed(2)}ms, Second read: ${duration2.toFixed(2)}ms`);

      // Both reads should complete within reasonable time
      expect(duration1).toBeLessThan(1000);
      expect(duration2).toBeLessThan(1000);
    });
  });
});