/**
 * Production Validation Test Suite for Claude Code Integration
 * Location: /workspaces/agent-feed/prod/tests/production-validation/
 *
 * This test suite validates that Claude Code integration is production-ready
 * - Real integration (no mocks)
 * - Performance within acceptable latency
 * - Resource management and memory leak prevention
 * - Error recovery and graceful handling
 * - Security sandboxing
 * - Scalability for concurrent users
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Claude Code Production Validation', () => {
  const testDir = '/workspaces/agent-feed/prod';
  const maxLatency = 30000; // 30 seconds for complex operations
  const maxSimpleLatency = 5000; // 5 seconds for simple operations

  beforeAll(async () => {
    // Ensure test directory exists
    try {
      await fs.access(testDir);
    } catch {
      throw new Error(`Production test directory does not exist: ${testDir}`);
    }
  });

  afterEach(async () => {
    // Cleanup test files after each test
    try {
      const testFiles = await fs.readdir(testDir);
      const cleanupPromises = testFiles
        .filter(file => file.startsWith('test-') || file.startsWith('validation-'))
        .map(file => fs.unlink(path.join(testDir, file)).catch(() => {}));
      await Promise.all(cleanupPromises);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Binary Installation and Functionality', () => {
    test('Claude binary should be accessible and return version', async () => {
      const startTime = Date.now();

      const result = await new Promise((resolve, reject) => {
        exec('claude --version', { cwd: testDir }, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout, stderr, time: Date.now() - startTime });
        });
      });

      expect(result.stdout).toMatch(/Claude Code/);
      expect(result.time).toBeLessThan(maxSimpleLatency);
    });

    test('Claude should handle help command quickly', async () => {
      const startTime = Date.now();

      const result = await new Promise((resolve, reject) => {
        exec('claude --help', { cwd: testDir }, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout, stderr, time: Date.now() - startTime });
        });
      });

      expect(result.stdout).toContain('Usage: claude');
      expect(result.time).toBeLessThan(maxSimpleLatency);
    });
  });

  describe('Real Integration Tests', () => {
    test('Claude should create and read files in production directory', async () => {
      const testFile = 'validation-test-file.txt';
      const testContent = 'Production validation test content';
      const startTime = Date.now();

      // Test file creation
      const createResult = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          `Create a file named ${testFile} with content "${testContent}"`
        ], { cwd: testDir });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => stdout += data.toString());
        process.stderr.on('data', (data) => stderr += data.toString());

        process.on('close', (code) => {
          resolve({
            code,
            stdout,
            stderr,
            time: Date.now() - startTime
          });
        });

        process.on('error', reject);
      });

      expect(createResult.code).toBe(0);
      expect(createResult.time).toBeLessThan(maxLatency);

      // Verify file exists and has correct content
      const filePath = path.join(testDir, testFile);
      const fileContent = await fs.readFile(filePath, 'utf8');
      expect(fileContent.trim()).toBe(testContent);
    });

    test('Claude should perform calculations correctly', async () => {
      const startTime = Date.now();

      const result = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          'Calculate the sum of prime numbers between 1 and 20'
        ], { cwd: testDir });

        let stdout = '';
        process.stdout.on('data', (data) => stdout += data.toString());

        process.on('close', (code) => {
          resolve({
            code,
            stdout,
            time: Date.now() - startTime
          });
        });

        process.on('error', reject);
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('77'); // Sum of primes 1-20: 2+3+5+7+11+13+17+19=77
      expect(result.time).toBeLessThan(maxLatency);
    });

    test('Claude should handle git operations', async () => {
      const startTime = Date.now();

      const result = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          'Show the current git status'
        ], { cwd: testDir });

        let stdout = '';
        process.stdout.on('data', (data) => stdout += data.toString());

        process.on('close', (code) => {
          resolve({
            code,
            stdout,
            time: Date.now() - startTime
          });
        });

        process.on('error', reject);
      });

      expect(result.code).toBe(0);
      expect(result.time).toBeLessThan(maxLatency);
      // Git status should contain some recognizable output
      expect(result.stdout.toLowerCase()).toMatch(/(branch|commit|status|working)/);
    });
  });

  describe('Performance Validation', () => {
    test('Simple requests should complete within 5 seconds', async () => {
      const requests = [
        'What is 2 + 2?',
        'List files in current directory',
        'Echo "Hello World"'
      ];

      const results = await Promise.all(
        requests.map(async (prompt) => {
          const startTime = Date.now();

          return new Promise((resolve, reject) => {
            const process = spawn('claude', [
              '--dangerously-skip-permissions',
              '-p',
              prompt
            ], { cwd: testDir });

            let stdout = '';
            process.stdout.on('data', (data) => stdout += data.toString());

            process.on('close', (code) => {
              resolve({
                prompt,
                code,
                stdout,
                time: Date.now() - startTime
              });
            });

            process.on('error', reject);
          });
        })
      );

      results.forEach(result => {
        expect(result.code).toBe(0);
        expect(result.time).toBeLessThan(maxSimpleLatency);
      });
    });

    test('Complex requests should complete within 30 seconds', async () => {
      const startTime = Date.now();

      const result = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          'Create a JavaScript function that calculates Fibonacci numbers up to 100, write it to a file, and test it'
        ], { cwd: testDir });

        let stdout = '';
        process.stdout.on('data', (data) => stdout += data.toString());

        process.on('close', (code) => {
          resolve({
            code,
            stdout,
            time: Date.now() - startTime
          });
        });

        process.on('error', reject);
      });

      expect(result.code).toBe(0);
      expect(result.time).toBeLessThan(maxLatency);
    });
  });

  describe('Concurrent Instance Testing', () => {
    test('Should handle multiple concurrent instances', async () => {
      const concurrentCount = 5;
      const promises = Array.from({ length: concurrentCount }, (_, i) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const process = spawn('claude', [
            '--dangerously-skip-permissions',
            '-p',
            `Create file concurrent-test-${i}.txt with content "Instance ${i}"`
          ], { cwd: testDir });

          let stdout = '';
          process.stdout.on('data', (data) => stdout += data.toString());

          process.on('close', (code) => {
            resolve({
              instance: i,
              code,
              stdout,
              time: Date.now() - startTime
            });
          });

          process.on('error', reject);
        });
      });

      const results = await Promise.all(promises);

      // All instances should complete successfully
      results.forEach(result => {
        expect(result.code).toBe(0);
        expect(result.time).toBeLessThan(maxLatency);
      });

      // Verify all files were created
      for (let i = 0; i < concurrentCount; i++) {
        const filePath = path.join(testDir, `concurrent-test-${i}.txt`);
        const content = await fs.readFile(filePath, 'utf8');
        expect(content.trim()).toBe(`Instance ${i}`);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('Should handle invalid commands gracefully', async () => {
      const result = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          'Run command "invalid-command-that-does-not-exist"'
        ], { cwd: testDir });

        let stdout = '';
        let stderr = '';
        process.stdout.on('data', (data) => stdout += data.toString());
        process.stderr.on('data', (data) => stderr += data.toString());

        process.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });

        process.on('error', reject);
      });

      // Claude should handle the error gracefully, not crash
      expect(result.code).toBe(0);
      expect(result.stdout.toLowerCase()).toMatch(/(error|not found|command|invalid)/);
    });

    test('Should recover from permission errors', async () => {
      const result = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '-p', // Without dangerous permissions
          'Try to create a file and handle any permission issues'
        ], { cwd: testDir });

        let stdout = '';
        process.stdout.on('data', (data) => stdout += data.toString());

        process.on('close', (code) => {
          resolve({ code, stdout });
        });

        process.on('error', reject);
      });

      expect(result.code).toBe(0);
      // Claude should explain the permission issue
      expect(result.stdout.toLowerCase()).toMatch(/(permission|approve|waiting)/);
    });
  });

  describe('Security Validation', () => {
    test('Should be restricted to working directory by default', async () => {
      const result = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          'Try to access files outside the current working directory like /etc/passwd'
        ], { cwd: testDir });

        let stdout = '';
        process.stdout.on('data', (data) => stdout += data.toString());

        process.on('close', (code) => {
          resolve({ code, stdout });
        });

        process.on('error', reject);
      });

      expect(result.code).toBe(0);
      // Claude should either refuse or explain security restrictions
      expect(result.stdout.toLowerCase()).toMatch(/(cannot|restricted|permission|access denied|security)/);
    });

    test('Should validate file operations are within workspace', async () => {
      const result = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          'List all files in the current working directory only'
        ], { cwd: testDir });

        let stdout = '';
        process.stdout.on('data', (data) => stdout += data.toString());

        process.on('close', (code) => {
          resolve({ code, stdout });
        });

        process.on('error', reject);
      });

      expect(result.code).toBe(0);
      // Should show files from the production directory
      expect(result.stdout).toContain('package.json');
    });
  });

  describe('Resource Management', () => {
    test('Should not create excessive processes', async () => {
      const beforeProcessCount = await new Promise((resolve) => {
        exec('ps aux | grep claude | grep -v grep | wc -l', (error, stdout) => {
          resolve(parseInt(stdout.trim()) || 0);
        });
      });

      // Run several Claude operations
      const operations = Array.from({ length: 3 }, (_, i) => {
        return new Promise((resolve, reject) => {
          const process = spawn('claude', [
            '--dangerously-skip-permissions',
            '-p',
            `Echo "Operation ${i}"`
          ], { cwd: testDir });

          process.on('close', resolve);
          process.on('error', reject);
        });
      });

      await Promise.all(operations);

      // Wait a moment for processes to clean up
      await new Promise(resolve => setTimeout(resolve, 2000));

      const afterProcessCount = await new Promise((resolve) => {
        exec('ps aux | grep claude | grep -v grep | wc -l', (error, stdout) => {
          resolve(parseInt(stdout.trim()) || 0);
        });
      });

      // Should not have excessive lingering processes
      expect(afterProcessCount - beforeProcessCount).toBeLessThanOrEqual(1);
    });

    test('Should handle memory efficiently', async () => {
      const initialMemory = process.memoryUsage();

      // Run memory-intensive operation
      await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          'Generate a list of 1000 random numbers and calculate their statistics'
        ], { cwd: testDir });

        process.on('close', resolve);
        process.on('error', reject);
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});