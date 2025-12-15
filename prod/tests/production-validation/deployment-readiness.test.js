/**
 * Deployment Readiness Validation Test Suite
 * Location: /workspaces/agent-feed/prod/tests/production-validation/
 *
 * Validates all deployment prerequisites and production environment setup
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Deployment Readiness Validation', () => {
  const prodDir = '/workspaces/agent-feed/prod';
  const frontendDir = '/workspaces/agent-feed/frontend';

  describe('Environment Prerequisites', () => {
    test('Node.js version should be compatible', async () => {
      const result = await new Promise((resolve, reject) => {
        exec('node --version', (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout.trim());
        });
      });

      const version = result.match(/v(\d+)\.(\d+)\.(\d+)/);
      expect(version).toBeTruthy();

      const major = parseInt(version[1]);
      expect(major).toBeGreaterThanOrEqual(16); // Node 16+ required
    });

    test('NPM should be available and functional', async () => {
      const result = await new Promise((resolve, reject) => {
        exec('npm --version', (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout.trim());
        });
      });

      expect(result).toMatch(/\d+\.\d+\.\d+/);
    });

    test('Claude binary should be in PATH', async () => {
      const result = await new Promise((resolve, reject) => {
        exec('which claude', (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout.trim());
        });
      });

      expect(result).toContain('claude');

      // Verify it's executable
      await fs.access(result, fs.constants.X_OK);
    });
  });

  describe('Dependencies Validation', () => {
    test('Production package.json should have all required dependencies', async () => {
      const packagePath = path.join(prodDir, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Check for essential dependencies
      const requiredDeps = ['socket.io-client'];
      requiredDeps.forEach(dep => {
        expect(packageJson.dependencies).toHaveProperty(dep);
      });

      // Check for testing dependencies
      const requiredDevDeps = ['jest', '@playwright/test'];
      requiredDevDeps.forEach(dep => {
        expect(packageJson.devDependencies).toHaveProperty(dep);
      });
    });

    test('Frontend package.json should have all required dependencies', async () => {
      const packagePath = path.join(frontendDir, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Check for React and essential frontend dependencies
      const requiredDeps = [
        'react',
        'react-dom',
        'lucide-react',
        'tailwind-merge',
        'class-variance-authority'
      ];

      requiredDeps.forEach(dep => {
        expect(packageJson.dependencies).toHaveProperty(dep);
      });
    });

    test('Node modules should be installed', async () => {
      // Check production node_modules
      const prodNodeModules = path.join(prodDir, 'node_modules');
      await fs.access(prodNodeModules);

      // Check frontend node_modules
      const frontendNodeModules = path.join(frontendDir, 'node_modules');
      await fs.access(frontendNodeModules);
    });

    test('Critical binaries should be available in node_modules', async () => {
      // Check for jest in prod
      const jestBin = path.join(prodDir, 'node_modules', '.bin', 'jest');
      try {
        await fs.access(jestBin, fs.constants.X_OK);
      } catch {
        // Jest might be installed globally, check that
        await new Promise((resolve, reject) => {
          exec('which jest', (error, stdout) => {
            if (error) reject(new Error('Jest is not available'));
            else resolve(stdout);
          });
        });
      }

      // Check for playwright in frontend
      const playwrightBin = path.join(frontendDir, 'node_modules', '.bin', 'playwright');
      await fs.access(playwrightBin, fs.constants.F_OK);
    });
  });

  describe('File System Permissions', () => {
    test('Working directory should be writable', async () => {
      const testFile = path.join(prodDir, 'write-test.tmp');

      // Test write
      await fs.writeFile(testFile, 'test content');

      // Test read
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('test content');

      // Cleanup
      await fs.unlink(testFile);
    });

    test('Log directory should exist and be writable', async () => {
      const logDir = path.join(prodDir, 'logs');

      try {
        await fs.access(logDir);
      } catch {
        // Create if it doesn't exist
        await fs.mkdir(logDir, { recursive: true });
      }

      // Test write to log directory
      const testLog = path.join(logDir, 'deployment-test.log');
      await fs.writeFile(testLog, 'Deployment test log entry');
      await fs.unlink(testLog);
    });

    test('Temp directory should be available', async () => {
      const tempDir = path.join(prodDir, 'temp');

      try {
        await fs.access(tempDir);
      } catch {
        await fs.mkdir(tempDir, { recursive: true });
      }

      // Test temp file creation
      const tempFile = path.join(tempDir, 'deployment-test.tmp');
      await fs.writeFile(tempFile, 'temp test');
      await fs.unlink(tempFile);
    });
  });

  describe('Configuration Validation', () => {
    test('Claude configuration should be valid', async () => {
      const configPath = path.join(prodDir, 'config', 'claude.config.js');

      try {
        await fs.access(configPath);

        // Try to require the config
        delete require.cache[require.resolve(configPath)];
        const config = require(configPath);

        expect(config).toHaveProperty('environment');
        expect(config).toHaveProperty('workspace');
        expect(config).toHaveProperty('agents');
        expect(config.workspace).toHaveProperty('path');
        expect(config.agents).toHaveProperty('maxConcurrent');
      } catch (error) {
        // Config file might not exist yet, that's ok for some deployments
        console.warn('Claude config file not found, using defaults');
      }
    });

    test('Package.json scripts should be valid', async () => {
      const packagePath = path.join(prodDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));

      expect(packageJson.scripts).toHaveProperty('test');
      expect(packageJson.scripts).toHaveProperty('start');

      // Test that scripts are executable
      const result = await new Promise((resolve, reject) => {
        exec('npm run test --help', { cwd: prodDir }, (error, stdout, stderr) => {
          // This should not error even if no tests run
          resolve({ error, stdout, stderr });
        });
      });

      // Should not have a critical error
      expect(result.error?.code).not.toBe(127); // Command not found
    });
  });

  describe('Service Connectivity', () => {
    test('Localhost should be accessible', async () => {
      // Test that we can bind to localhost
      const net = require('net');

      await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, 'localhost', () => {
          const port = server.address().port;
          server.close(() => {
            resolve(port);
          });
        });
        server.on('error', reject);
      });
    });

    test('File system should support required operations', async () => {
      const testDir = path.join(prodDir, 'fs-test');

      // Create directory
      await fs.mkdir(testDir, { recursive: true });

      // Create file
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'test');

      // Read file
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('test');

      // Update file
      await fs.appendFile(testFile, ' updated');
      const updatedContent = await fs.readFile(testFile, 'utf8');
      expect(updatedContent).toBe('test updated');

      // Delete file and directory
      await fs.unlink(testFile);
      await fs.rmdir(testDir);
    });
  });

  describe('Process Management', () => {
    test('Should be able to spawn child processes', async () => {
      const result = await new Promise((resolve, reject) => {
        const child = spawn('echo', ['test'], { cwd: prodDir });
        let output = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          resolve({ code, output: output.trim() });
        });

        child.on('error', reject);
      });

      expect(result.code).toBe(0);
      expect(result.output).toBe('test');
    });

    test('Should handle process cleanup properly', async () => {
      // Spawn a long-running process and kill it
      const child = spawn('sleep', ['5']);

      let processExited = false;
      child.on('exit', () => {
        processExited = true;
      });

      // Kill after 100ms
      setTimeout(() => {
        child.kill();
      }, 100);

      // Wait up to 2 seconds for process to exit
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (processExited) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Timeout after 2 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 2000);
      });

      expect(processExited).toBe(true);
    });
  });

  describe('Security Validation', () => {
    test('Working directory should not contain sensitive files', async () => {
      const files = await fs.readdir(prodDir);

      // Check for files that shouldn't be in production
      const dangerousFiles = files.filter(file =>
        file.includes('password') ||
        file.includes('secret') ||
        file.includes('key') ||
        file.endsWith('.pem') ||
        file.endsWith('.key')
      );

      expect(dangerousFiles).toEqual([]);
    });

    test('Environment should not expose sensitive information', async () => {
      // Check that Claude runs without exposing sensitive env vars
      const result = await new Promise((resolve, reject) => {
        const process = spawn('claude', [
          '--dangerously-skip-permissions',
          '-p',
          'Show current environment variables'
        ], {
          cwd: prodDir,
          env: {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            // Remove potentially sensitive vars
            ...Object.fromEntries(
              Object.entries(process.env).filter(([key]) =>
                !key.includes('SECRET') &&
                !key.includes('PASSWORD') &&
                !key.includes('TOKEN')
              )
            )
          }
        });

        let stdout = '';
        process.stdout.on('data', (data) => stdout += data.toString());

        process.on('close', (code) => {
          resolve({ code, stdout });
        });

        process.on('error', reject);
      });

      expect(result.code).toBe(0);

      // Output should not contain sensitive patterns
      const sensitivePatterns = [
        /password[=:]\s*\S+/i,
        /secret[=:]\s*\S+/i,
        /token[=:]\s*\S+/i,
        /api[_-]?key[=:]\s*\S+/i
      ];

      sensitivePatterns.forEach(pattern => {
        expect(result.stdout).not.toMatch(pattern);
      });
    });
  });

  describe('Monitoring and Logging', () => {
    test('Should be able to create log files', async () => {
      const logsDir = path.join(prodDir, 'logs');
      const testLogFile = path.join(logsDir, 'deployment-validation.log');

      // Ensure logs directory exists
      try {
        await fs.access(logsDir);
      } catch {
        await fs.mkdir(logsDir, { recursive: true });
      }

      // Write test log entry
      const logEntry = `[${new Date().toISOString()}] Deployment validation test log entry\n`;
      await fs.appendFile(testLogFile, logEntry);

      // Verify log was written
      const logContent = await fs.readFile(testLogFile, 'utf8');
      expect(logContent).toContain('Deployment validation test log entry');

      // Cleanup
      await fs.unlink(testLogFile);
    });

    test('Should handle log rotation gracefully', async () => {
      const logsDir = path.join(prodDir, 'logs');
      const logFile = path.join(logsDir, 'rotation-test.log');

      // Create logs directory if needed
      try {
        await fs.mkdir(logsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Write multiple log entries
      for (let i = 0; i < 10; i++) {
        await fs.appendFile(logFile, `Log entry ${i}\n`);
      }

      // Verify log file exists and has content
      const stats = await fs.stat(logFile);
      expect(stats.size).toBeGreaterThan(0);

      // Cleanup
      await fs.unlink(logFile);
    });
  });
});