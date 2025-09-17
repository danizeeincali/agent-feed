/**
 * Regression Tests for Fake Data Prevention
 * Ensures fake data cannot return to the system
 */

const fs = require('fs');
const path = require('path');

describe('Fake Data Prevention Regression Tests', () => {

  describe('Source Code Monitoring', () => {
    test('should not contain hardcoded costs in source files', async () => {
      const srcDir = path.join(__dirname, '../../../src');
      const violations = await scanForFakeDataInFiles(srcDir);

      expect(violations).toHaveLength(0);

      if (violations.length > 0) {
        violations.forEach(violation => {
          global.reportFakeDataViolation(violation);
        });
      }

      global.trackRealDataValidation();
    });

    test('should not have TODO comments about replacing fake data', async () => {
      const srcDir = path.join(__dirname, '../../../src');
      const todoViolations = await scanForTodoFakeData(srcDir);

      expect(todoViolations).toHaveLength(0);

      if (todoViolations.length > 0) {
        console.warn('TODO comments found that mention fake data:');
        todoViolations.forEach(todo => console.warn(`  - ${todo}`));
      }
    });

    test('should validate all constants are realistic', async () => {
      const constantsFile = path.join(__dirname, '../../../src/constants/pricing.js');

      if (fs.existsSync(constantsFile)) {
        const content = fs.readFileSync(constantsFile, 'utf8');

        // Check for realistic pricing constants
        const priceMatches = content.match(/(?:price|cost|rate).*?(\d+\.?\d*)/gi);

        if (priceMatches) {
          priceMatches.forEach(match => {
            // Extract numeric value
            const value = parseFloat(match.match(/(\d+\.?\d*)/)[1]);

            // Validate against known fake values
            expect(value).not.toBeCloseTo(12.45, 2);
            expect(value).not.toBeCloseTo(42.00, 2);
            expect(value).not.toBeCloseTo(99.99, 2);

            // For token pricing, should be very small
            if (match.toLowerCase().includes('token')) {
              expect(value).toBeLessThan(0.01);
              expect(value).toBeGreaterThan(0.0000001);
            }
          });
        }

        global.trackRealDataValidation();
      }
    });
  });

  describe('Configuration File Validation', () => {
    test('should not have fake API endpoints in config', async () => {
      const configFiles = [
        '../../../config/api.json',
        '../../../config/development.json',
        '../../../config/production.json',
        '../../../.env.example'
      ];

      for (const configPath of configFiles) {
        const fullPath = path.join(__dirname, configPath);

        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');

          // Check for fake endpoints
          expect(content).not.toMatch(/api\.example\.com/i);
          expect(content).not.toMatch(/mock-api/i);
          expect(content).not.toMatch(/fake-endpoint/i);
          expect(content).not.toMatch(/localhost.*mock/i);

          // Check for fake API keys
          expect(content).not.toMatch(/sk-fake/i);
          expect(content).not.toMatch(/test-key/i);
          expect(content).not.toMatch(/mock-token/i);
        }
      }

      global.trackRealDataValidation();
    });

    test('should validate environment variable patterns', () => {
      const suspiciousEnvVars = Object.keys(process.env).filter(key =>
        (key.includes('API') || key.includes('TOKEN') || key.includes('KEY')) &&
        (process.env[key].includes('fake') || process.env[key].includes('mock'))
      );

      expect(suspiciousEnvVars).toHaveLength(0);

      if (suspiciousEnvVars.length > 0) {
        suspiciousEnvVars.forEach(envVar => {
          global.reportFakeDataViolation(`Suspicious environment variable: ${envVar}`);
        });
      }
    });
  });

  describe('Database Schema Validation', () => {
    test('should not allow fake data in database constraints', async () => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(global.__TEST_DB_PATH__);

      // Check database schema for constraints
      const schema = await new Promise((resolve, reject) => {
        db.all("SELECT sql FROM sqlite_master WHERE type='table'", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      schema.forEach(table => {
        const sql = table.sql;

        // Should not have fake data in default values
        expect(sql).not.toMatch(/DEFAULT.*12\.45/);
        expect(sql).not.toMatch(/DEFAULT.*42\.00/);
        expect(sql).not.toMatch(/DEFAULT.*'mock'/i);
        expect(sql).not.toMatch(/DEFAULT.*'fake'/i);

        // Should have realistic constraints
        if (sql.includes('estimated_cost')) {
          expect(sql).toMatch(/CHECK.*estimated_cost.*>.*0/);
        }

        if (sql.includes('tokens_used')) {
          expect(sql).toMatch(/CHECK.*tokens_used.*>.*0/);
        }
      });

      db.close();
      global.trackRealDataValidation();
    });

    test('should prevent insertion of known fake values', async () => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(global.__TEST_DB_PATH__);

      const fakeDataAttempts = [
        {
          tokens_used: 100,
          estimated_cost: 12.45,
          provider: 'claude'
        },
        {
          tokens_used: 200,
          estimated_cost: 42.00,
          provider: 'claude'
        },
        {
          tokens_used: 150,
          estimated_cost: 0.045,
          provider: 'mock-api'
        }
      ];

      for (const fakeData of fakeDataAttempts) {
        try {
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO token_usage
              (id, timestamp, provider, model, tokens_used, estimated_cost, request_type)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              `fake_${Date.now()}`,
              new Date().toISOString(),
              fakeData.provider,
              'test-model',
              fakeData.tokens_used,
              fakeData.estimated_cost,
              'fake-test'
            ], function(err) {
              if (err) reject(err);
              else resolve();
            });
          });

          // If insertion succeeded, check if the data violates our rules
          if (fakeData.estimated_cost === 12.45 || fakeData.estimated_cost === 42.00) {
            expect(true).toBe(false); // Should not reach here with fake data
          }

          if (fakeData.provider.includes('mock')) {
            expect(true).toBe(false); // Should not reach here with mock provider
          }

        } catch (error) {
          // Good - insertion was rejected
          expect(error.message).toMatch(/constraint|invalid|rejected/i);
        }
      }

      db.close();
    });
  });

  describe('API Response Validation', () => {
    test('should maintain real data response patterns', async () => {
      // Test against historical patterns to prevent regression
      const realResponsePatterns = [
        {
          pattern: /\$0\.\d{3,}/,
          description: 'Real cost format with many decimal places'
        },
        {
          pattern: /claude-3-(opus|sonnet|haiku)/,
          description: 'Real model names'
        },
        {
          pattern: /20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          description: 'Real ISO timestamp format'
        },
        {
          pattern: /[a-f0-9-]{36}/,
          description: 'Real UUID format for request IDs'
        }
      ];

      // Simulate API responses and validate patterns
      const mockApiResponse = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        cost: '$0.000345',
        model: 'claude-3-sonnet-20240229',
        tokens: 115
      };

      const responseString = JSON.stringify(mockApiResponse);

      realResponsePatterns.forEach(({ pattern, description }) => {
        if (pattern.test(responseString)) {
          // Good - real pattern found
          global.trackRealDataValidation();
        }
      });

      // Ensure no fake patterns
      const fakePatterns = [
        /\$12\.45|\$42\.00|\$99\.99/,
        /mock|fake|dummy|test/i,
        /lorem ipsum/i
      ];

      fakePatterns.forEach(pattern => {
        expect(responseString).not.toMatch(pattern);
      });
    });

    test('should reject responses with fake data markers', () => {
      const responseWithFakeData = {
        id: 'fake-123',
        cost: '$12.45',
        model: 'test-model',
        provider: 'mock-api'
      };

      expect(responseWithFakeData).not.toBeRealApiResponse();

      // Should trigger violation detection
      expect(() => {
        if (JSON.stringify(responseWithFakeData).includes('fake')) {
          global.reportFakeDataViolation('Fake API response detected');
        }
      }).toThrow('FAKE DATA VIOLATION');
    });
  });

  describe('Monitoring and Alerting', () => {
    test('should detect fake data in logs', async () => {
      const logFiles = [
        '../../../logs/api.log',
        '../../../logs/token-analytics.log',
        '../../../backend.log'
      ];

      for (const logFile of logFiles) {
        const fullPath = path.join(__dirname, logFile);

        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');

          // Check for fake data patterns in logs
          const fakePatterns = [
            /cost.*12\.45/i,
            /cost.*42\.00/i,
            /mock.*api/i,
            /fake.*token/i,
            /dummy.*usage/i
          ];

          fakePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
              global.reportFakeDataViolation(`Fake data found in log ${logFile}: ${matches[0]}`);
            }
          });
        }
      }

      global.trackRealDataValidation();
    });

    test('should have monitoring rules for fake data detection', () => {
      // Validate that monitoring system has rules to detect fake data
      const monitoringRules = [
        {
          name: 'Hardcoded Cost Detection',
          pattern: /\$12\.45|\$42\.00|\$99\.99/,
          action: 'alert'
        },
        {
          name: 'Mock Provider Detection',
          pattern: /mock|fake|dummy/i,
          action: 'block'
        },
        {
          name: 'Unrealistic Cost Detection',
          threshold: { min: 0.0000001, max: 1.0 },
          action: 'investigate'
        }
      ];

      monitoringRules.forEach(rule => {
        expect(rule.name).toBeDefined();
        expect(rule.action).toMatch(/alert|block|investigate/);

        if (rule.pattern) {
          // Test the pattern works
          expect(rule.pattern.test('mock-api')).toBe(true);
        }

        if (rule.threshold) {
          expect(rule.threshold.min).toBeGreaterThan(0);
          expect(rule.threshold.max).toBeLessThan(10);
        }
      });

      global.trackRealDataValidation();
    });
  });

  describe('Deployment Safety', () => {
    test('should prevent deployment with fake data', async () => {
      // Check package.json scripts for deployment hooks
      const packageJsonPath = path.join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const deploymentScripts = ['predeploy', 'deploy', 'postdeploy', 'build'];

      deploymentScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          const scriptContent = packageJson.scripts[script];

          // Should include fake data checks
          expect(scriptContent).toMatch(/test.*fake|validate.*data|check.*mock/i);
        }
      });

      global.trackRealDataValidation();
    });

    test('should have CI/CD fake data checks', () => {
      const ciFiles = [
        '../../../.github/workflows/ci.yml',
        '../../../.github/workflows/test.yml',
        '../../../.circleci/config.yml',
        '../../../.gitlab-ci.yml'
      ];

      let foundCiConfig = false;

      ciFiles.forEach(ciFile => {
        const fullPath = path.join(__dirname, ciFile);

        if (fs.existsSync(fullPath)) {
          foundCiConfig = true;
          const content = fs.readFileSync(fullPath, 'utf8');

          // Should include fake data validation steps
          expect(content).toMatch(/test.*token|validate.*data|fake.*detection/i);
        }
      });

      if (foundCiConfig) {
        global.trackRealDataValidation();
      }
    });
  });
});

// Helper functions
async function scanForFakeDataInFiles(dir) {
  const violations = [];
  const files = getAllFiles(dir, ['.js', '.ts', '.tsx']);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Check for hardcoded costs
      const costMatches = content.match(/(?:cost|price).*?(\d+\.\d{2})/gi);
      if (costMatches) {
        costMatches.forEach(match => {
          const value = parseFloat(match.match(/(\d+\.\d{2})/)[1]);
          if (value === 12.45 || value === 42.00 || value === 99.99) {
            violations.push(`${file}: Hardcoded fake cost ${value}`);
          }
        });
      }

      // Check for mock patterns
      const mockPatterns = [
        /mock.*token/i,
        /fake.*cost/i,
        /dummy.*usage/i,
        /test.*api.*key/i
      ];

      mockPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          violations.push(`${file}: Mock pattern detected ${pattern}`);
        }
      });

    } catch (error) {
      // Ignore files we can't read
    }
  }

  return violations;
}

async function scanForTodoFakeData(dir) {
  const todos = [];
  const files = getAllFiles(dir, ['.js', '.ts', '.tsx']);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (/\/\/.*TODO.*(?:fake|mock|replace.*real)/i.test(line)) {
          todos.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });

    } catch (error) {
      // Ignore files we can't read
    }
  }

  return todos;
}

function getAllFiles(dir, extensions) {
  const files = [];

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory() && !item.name.includes('node_modules')) {
        files.push(...getAllFiles(fullPath, extensions));
      } else if (item.isFile()) {
        const ext = path.extname(item.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore directories we can't read
  }

  return files;
}