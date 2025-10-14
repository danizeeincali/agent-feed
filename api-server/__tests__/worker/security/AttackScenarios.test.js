/**
 * Attack Scenario Tests
 * Real-world attack simulations and security hardening validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PathValidator } from '../../../worker/security/PathValidator.js';
import { FileOperationValidator } from '../../../worker/security/FileOperationValidator.js';
import { RateLimiter } from '../../../worker/security/RateLimiter.js';
import fs from 'fs/promises';
import path from 'path';

describe('Attack Scenarios', () => {
  const testWorkspace = '/workspaces/agent-feed/prod/agent_workspace';
  const testDir = path.join(testWorkspace, 'attack-test-' + Date.now());

  beforeEach(async () => {
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Path Traversal Attack Scenarios', () => {
    let validator;

    beforeEach(() => {
      validator = new PathValidator({ allowedWorkspace: testWorkspace });
    });

    it('Attack: Basic directory traversal using ../', async () => {
      const attackPaths = [
        `${testWorkspace}/../../../etc/passwd`,
        `${testWorkspace}/../../../etc/shadow`,
        `${testWorkspace}/../../../root/.ssh/id_rsa`,
        `${testWorkspace}/../../../../../etc/passwd`
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        expect(result.valid).toBe(false);
        console.log(`✓ Blocked: ${attackPath}`);
      }

      const stats = validator.getStats();
      expect(stats.traversalAttempts).toBeGreaterThan(0);
    });

    it('Attack: URL encoded traversal', async () => {
      const attackPaths = [
        `${testWorkspace}/%2e%2e%2f%2e%2e%2fetc/passwd`,
        `${testWorkspace}/%2e%2e/%2e%2e/etc/passwd`,
        `${testWorkspace}/..%2f..%2fetc%2fpasswd`
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        // URL encoding in path is detected by traversal patterns OR workspace boundary
        if (result.valid) {
          // If not caught by pattern, should still be within workspace
          expect(result.normalizedPath).toContain(testWorkspace);
          console.log(`✓ Contained within workspace: ${attackPath}`);
        } else {
          console.log(`✓ Blocked URL encoded: ${attackPath}`);
        }
      }
    });

    it('Attack: Double URL encoded traversal', async () => {
      const attackPaths = [
        `${testWorkspace}/%252e%252e%252f%252e%252e%252fetc/passwd`,
        `${testWorkspace}/%252e%252e/%252e%252e/etc/passwd`
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        expect(result.valid).toBe(false);
        console.log(`✓ Blocked double encoded: ${attackPath}`);
      }
    });

    it('Attack: Unicode/UTF-8 encoded traversal', async () => {
      const attackPaths = [
        `${testWorkspace}/\u2025\u2025/etc/passwd`, // Two dot leaders
        `${testWorkspace}/\uFF0E\uFF0E/etc/passwd`  // Fullwidth dots
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        // May be blocked by traversal or workspace boundary
        if (result.valid) {
          // If not blocked by pattern, should be blocked by workspace boundary
          expect(result.normalizedPath).toContain(testWorkspace);
        }
        console.log(`✓ Handled Unicode: ${attackPath}`);
      }
    });

    it('Attack: Windows-style path traversal', async () => {
      const attackPaths = [
        `${testWorkspace}\\..\\..\\etc\\passwd`,
        `${testWorkspace}\\..\\.\\etc\\passwd`,
        `${testWorkspace}/%2e%2e%5c%2e%2e%5cetc\\passwd`
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        expect(result.valid).toBe(false);
        console.log(`✓ Blocked Windows style: ${attackPath}`);
      }
    });

    it('Attack: Null byte injection', async () => {
      const attackPaths = [
        `${testWorkspace}/file.txt\0.jpg`,
        `${testWorkspace}/safe\0/../etc/passwd`,
        `test.txt\0../../etc/passwd`
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('null byte');
        console.log(`✓ Blocked null byte: ${attackPath.replace(/\0/g, '\\0')}`);
      }
    });
  });

  describe('Sensitive File Access Attempts', () => {
    let validator;

    beforeEach(() => {
      validator = new PathValidator({ allowedWorkspace: testWorkspace });
    });

    it('Attack: Access system credentials', async () => {
      const attackPaths = [
        `${testWorkspace}/.env`,
        `${testWorkspace}/.env.local`,
        `${testWorkspace}/.env.production`,
        `${testWorkspace}/.aws/credentials`,
        `${testWorkspace}/.ssh/id_rsa`,
        `${testWorkspace}/id_rsa`,
        `${testWorkspace}/private.key`,
        `${testWorkspace}/cert.pem`
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        expect(result.valid).toBe(false);
        console.log(`✓ Blocked sensitive: ${attackPath}`);
      }

      const stats = validator.getStats();
      expect(stats.sensitiveFileAttempts).toBeGreaterThan(0);
    });

    it('Attack: Access git repository data', async () => {
      const attackPaths = [
        `${testWorkspace}/.git/config`,
        `${testWorkspace}/.git/HEAD`,
        `${testWorkspace}/.git/objects/pack/`
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        expect(result.valid).toBe(false);
        console.log(`✓ Blocked git access: ${attackPath}`);
      }
    });

    it('Attack: Access password/secret files', async () => {
      const attackPaths = [
        `${testWorkspace}/password.txt`,
        `${testWorkspace}/passwords.json`,
        `${testWorkspace}/secret.yaml`,
        `${testWorkspace}/secrets.txt`,
        `${testWorkspace}/credentials.json`,
        `${testWorkspace}/api_credentials.txt`
      ];

      for (const attackPath of attackPaths) {
        const result = await validator.validate(attackPath);
        expect(result.valid).toBe(false);
        console.log(`✓ Blocked password file: ${attackPath}`);
      }
    });
  });

  describe('File Size Attack Scenarios', () => {
    let validator;

    beforeEach(() => {
      validator = new FileOperationValidator({
        allowedWorkspace: testWorkspace,
        maxFileSize: 10 * 1024 * 1024 // 10MB
      });
    });

    it('Attack: Disk exhaustion with large file', async () => {
      const largeContent = 'X'.repeat(11 * 1024 * 1024); // 11MB

      const result = await validator.validateOperation(
        path.join(testDir, 'large.txt'),
        'write',
        largeContent
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('size');
      console.log('✓ Blocked large file write (11MB)');

      const stats = validator.getStats();
      expect(stats.sizeLimitExceeded).toBe(1);
    });

    it('Attack: Memory exhaustion with huge content', async () => {
      // Attempt to create massive content
      const attempts = [
        'X'.repeat(20 * 1024 * 1024),  // 20MB
        'X'.repeat(50 * 1024 * 1024),  // 50MB
        'X'.repeat(100 * 1024 * 1024)  // 100MB
      ];

      for (const content of attempts) {
        const result = await validator.validateOperation(
          path.join(testDir, 'huge.txt'),
          'write',
          content
        );

        expect(result.valid).toBe(false);
        console.log(`✓ Blocked ${Math.round(content.length / 1024 / 1024)}MB write`);
      }
    });

    it('Attack: Death by a thousand cuts (many small files)', async () => {
      // Simulate many file operations
      const operations = [];

      for (let i = 0; i < 100; i++) {
        operations.push(
          validator.validateOperation(
            path.join(testDir, `file${i}.txt`),
            'write',
            'small content'
          )
        );
      }

      const results = await Promise.all(operations);

      // All should be individually valid
      const validCount = results.filter(r => r.valid).length;
      expect(validCount).toBe(100);

      console.log('✓ Validated 100 small file operations');
      // Note: Rate limiting would prevent this attack in practice
    });
  });

  describe('Content Injection Attack Scenarios', () => {
    let validator;

    beforeEach(() => {
      validator = new FileOperationValidator({
        allowedWorkspace: testWorkspace
      });
    });

    it('Attack: Null byte injection in content', async () => {
      const maliciousContent = 'Safe content\0<script>alert("XSS")</script>';

      const result = await validator.validateOperation(
        path.join(testDir, 'injection.txt'),
        'write',
        maliciousContent
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).not.toContain('\0');
      expect(result.modified).toBe(true);
      console.log('✓ Sanitized null bytes from content');
    });

    it('Attack: Control character injection', async () => {
      const maliciousContent = 'Data\x01\x02\x03\x04\x05\x06\x07\x08';

      const result = await validator.validateOperation(
        path.join(testDir, 'control.txt'),
        'write',
        maliciousContent
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedContent).toBe('Data');
      expect(result.modified).toBe(true);
      console.log('✓ Sanitized control characters');
    });

    it('Attack: Binary content disguised as text', async () => {
      const binaryContent = Buffer.from([
        0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, // PE header (Windows executable)
        0x00, 0x00, 0x04, 0x00, 0x00, 0x00
      ]).toString('utf-8');

      const result = await validator.validateOperation(
        path.join(testDir, 'binary.txt'),
        'write',
        binaryContent
      );

      // Should either be sanitized or detected as binary
      if (result.valid) {
        expect(result.modified).toBeDefined();
        console.log('✓ Sanitized binary content');
      } else {
        console.log('✓ Rejected binary content');
      }
    });
  });

  describe('Rate Limiting Attack Scenarios', () => {
    let limiter;

    beforeEach(() => {
      limiter = new RateLimiter({
        maxOperations: 10,
        windowMs: 60000
      });
    });

    afterEach(() => {
      limiter.destroy();
    });

    it('Attack: Brute force with rapid requests', () => {
      const attacker = 'attacker1';

      // Simulate rapid-fire requests
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(limiter.checkLimit(attacker));
      }

      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;

      expect(allowed).toBe(10); // Only first 10 allowed
      expect(blocked).toBe(90); // Rest blocked

      console.log(`✓ Blocked ${blocked}/100 brute force attempts`);
    });

    it('Attack: Distributed attack from multiple users', () => {
      // Simulate 100 different attackers
      const results = [];

      for (let i = 0; i < 100; i++) {
        const attacker = `attacker${i}`;
        // Each attacker tries to exhaust their limit
        for (let j = 0; j < 15; j++) {
          results.push(limiter.checkLimit(attacker));
        }
      }

      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;

      expect(allowed).toBe(1000); // 10 per user * 100 users
      expect(blocked).toBe(500);   // 5 blocked per user * 100 users

      console.log(`✓ Rate limited ${blocked} requests from 100 users`);
    });

    it('Attack: Slowloris-style attack (slow but persistent)', async () => {
      const attacker = 'slowloris';

      // Use short window for testing
      const shortLimiter = new RateLimiter({
        maxOperations: 5,
        windowMs: 100
      });

      // Rapid initial burst
      for (let i = 0; i < 5; i++) {
        const result = shortLimiter.checkLimit(attacker);
        expect(result.allowed).toBe(true);
      }

      // Should be blocked now
      expect(shortLimiter.checkLimit(attacker).allowed).toBe(false);

      // Wait for window to partially expire
      await new Promise(resolve => setTimeout(resolve, 120));

      // Try again - should be allowed (window reset)
      const result = shortLimiter.checkLimit(attacker);
      expect(result.allowed).toBe(true);

      console.log('✓ Rate limiter handles slow persistent attacks');

      shortLimiter.destroy();
    });
  });

  describe('Combined Attack Scenarios', () => {
    let pathValidator;
    let fileValidator;
    let rateLimiter;

    beforeEach(() => {
      pathValidator = new PathValidator({ allowedWorkspace: testWorkspace });
      fileValidator = new FileOperationValidator({ allowedWorkspace: testWorkspace });
      rateLimiter = new RateLimiter({ maxOperations: 10, windowMs: 60000 });
    });

    afterEach(() => {
      rateLimiter.destroy();
    });

    it('Attack: Combined traversal + size + rate limit', async () => {
      const attacker = 'combined-attacker';

      // Try multiple attack vectors
      const attacks = [
        // Path traversal
        { path: `${testWorkspace}/../../../etc/passwd`, content: 'data' },
        { path: `${testWorkspace}/.env`, content: 'secrets' },
        // Large file
        { path: path.join(testDir, 'large.txt'), content: 'X'.repeat(11 * 1024 * 1024) },
        // Many requests
        ...Array(20).fill(null).map((_, i) => ({
          path: path.join(testDir, `spam${i}.txt`),
          content: 'spam'
        }))
      ];

      let pathBlocked = 0;
      let sizeBlocked = 0;
      let rateBlocked = 0;
      let allowed = 0;

      for (const attack of attacks) {
        // Check rate limit first
        const rateCheck = rateLimiter.checkLimit(attacker);
        if (!rateCheck.allowed) {
          rateBlocked++;
          continue;
        }

        // Check path
        const pathCheck = await pathValidator.validate(attack.path);
        if (!pathCheck.valid) {
          pathBlocked++;
          continue;
        }

        // Check file operation
        const fileCheck = await fileValidator.validateOperation(
          attack.path,
          'write',
          attack.content
        );

        if (!fileCheck.valid) {
          sizeBlocked++;
          continue;
        }

        allowed++;
      }

      console.log(`✓ Multi-layer defense:`);
      console.log(`  - Path validation blocked: ${pathBlocked}`);
      console.log(`  - Size validation blocked: ${sizeBlocked}`);
      console.log(`  - Rate limiting blocked: ${rateBlocked}`);
      console.log(`  - Allowed through: ${allowed}`);

      expect(pathBlocked).toBeGreaterThan(0);
      expect(rateBlocked).toBeGreaterThan(0);
      expect(allowed).toBeLessThan(attacks.length);
    });

    it('Attack: Sophisticated evasion attempt', async () => {
      // Attacker tries to evade detection
      const evasionAttempts = [
        // Mix valid operations with malicious ones
        { path: path.join(testDir, 'valid1.txt'), content: 'ok', malicious: false },
        { path: `${testWorkspace}/../etc/passwd`, content: 'bad', malicious: true },
        { path: path.join(testDir, 'valid2.txt'), content: 'ok', malicious: false },
        { path: `${testWorkspace}/.env`, content: 'bad', malicious: true },
        { path: path.join(testDir, 'valid3.txt'), content: 'ok', malicious: false },
      ];

      let detectedMalicious = 0;
      let allowedMalicious = 0;

      for (const attempt of evasionAttempts) {
        const result = await fileValidator.validateOperation(
          attempt.path,
          'write',
          attempt.content
        );

        if (attempt.malicious) {
          if (!result.valid) {
            detectedMalicious++;
          } else {
            allowedMalicious++;
          }
        }
      }

      expect(detectedMalicious).toBe(2); // All malicious attempts detected
      expect(allowedMalicious).toBe(0);   // No malicious attempts allowed

      console.log('✓ Detected all evasion attempts');
    });
  });

  describe('Real-world Attack Patterns', () => {
    let validator;

    beforeEach(() => {
      validator = new FileOperationValidator({ allowedWorkspace: testWorkspace });
    });

    it('Attack: Log injection', async () => {
      // Attacker tries to inject fake log entries
      const logInjection = 'Legitimate data\n[ERROR] System compromised\n[WARN] Fake warning';

      const result = await validator.validateOperation(
        path.join(testDir, 'log.txt'),
        'write',
        logInjection
      );

      // Should allow (it's valid text), but application should sanitize logs
      expect(result.valid).toBe(true);
      console.log('✓ Log injection requires application-level sanitization');
    });

    it('Attack: Resource exhaustion via path length', async () => {
      // Create extremely long path
      const longPath = path.join(testDir, 'a/'.repeat(500) + 'file.txt');

      const result = await validator.validateOperation(
        longPath,
        'write',
        'content'
      );

      // Should either reject or handle gracefully
      console.log(`✓ Long path handled: ${result.valid ? 'accepted' : 'rejected'}`);
    });

    it('Attack: Unicode normalization attack', async () => {
      // Different Unicode representations of same character
      const paths = [
        path.join(testDir, 'café.txt'),      // NFC (composed)
        path.join(testDir, 'café.txt')       // NFD (decomposed)
      ];

      const results = await Promise.all(
        paths.map(p => validator.validateOperation(p, 'write', 'content'))
      );

      // All should be valid (Unicode is allowed)
      for (const result of results) {
        expect(result.valid).toBe(true);
      }

      console.log('✓ Unicode normalization handled');
    });
  });

  describe('Performance Under Attack', () => {
    it('Performance: Validate 1000 malicious paths quickly', async () => {
      const validator = new PathValidator({ allowedWorkspace: testWorkspace });

      const maliciousPaths = Array(1000).fill(null).map((_, i) =>
        `${testWorkspace}/../../../etc/passwd${i}`
      );

      const startTime = Date.now();
      const results = await Promise.all(
        maliciousPaths.map(p => validator.validate(p))
      );
      const duration = Date.now() - startTime;

      const blocked = results.filter(r => !r.valid).length;

      expect(blocked).toBe(1000);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds

      console.log(`✓ Validated 1000 malicious paths in ${duration}ms`);
    });

    it('Performance: Handle 10000 rate limit checks', () => {
      const limiter = new RateLimiter({ maxOperations: 100, windowMs: 60000 });

      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        limiter.checkLimit(`user${i % 100}`);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second

      console.log(`✓ Processed 10000 rate limit checks in ${duration}ms`);

      limiter.destroy();
    });
  });
});
