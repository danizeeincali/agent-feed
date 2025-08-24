/**
 * CORS Regression Prevention Tests
 * Automated checks to prevent future CORS configuration regressions
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, test, expect } from '@jest/testing-library/jest-dom';

describe('CORS Regression Prevention', () => {
  const serverFilePath = join(__dirname, '../../../src/api/server.ts');
  let serverConfig: string;

  beforeAll(() => {
    serverConfig = readFileSync(serverFilePath, 'utf-8');
  });

  test('should include comprehensive localhost origins in Socket.IO CORS config', () => {
    // Verify all necessary localhost variations are present
    const requiredOrigins = [
      'localhost:3000', 'localhost:3001', 'localhost:5173',
      '127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:5173',
      '[::1]:3000', '[::1]:3001', '[::1]:5173'
    ];

    requiredOrigins.forEach(origin => {
      expect(serverConfig).toContain(origin);
    });
  });

  test('should include WebSocket-required HTTP methods', () => {
    const requiredMethods = ['GET', 'POST', 'OPTIONS', 'HEAD', 'PUT', 'DELETE'];
    
    // Check Socket.IO CORS methods
    const socketIOSection = serverConfig.substring(
      serverConfig.indexOf('const io = new SocketIOServer'),
      serverConfig.indexOf('});', serverConfig.indexOf('const io = new SocketIOServer'))
    );

    requiredMethods.forEach(method => {
      expect(socketIOSection).toContain(`"${method}"`);
    });
  });

  test('should include proper CORS headers in allowedHeaders', () => {
    const requiredHeaders = [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers'
    ];

    requiredHeaders.forEach(header => {
      expect(serverConfig).toContain(`"${header}"`);
    });
  });

  test('should have credentials enabled for both Socket.IO and Express CORS', () => {
    const credentialsMatches = serverConfig.match(/credentials:\s*true/g);
    expect(credentialsMatches).toHaveLength(2); // Both Socket.IO and Express CORS
  });

  test('should include enhanced allowRequest function with detailed logging', () => {
    expect(serverConfig).toContain('allowRequest: (req, callback) =>');
    expect(serverConfig).toContain('console.log(\'🔍 WebSocket CORS Check:\'');
    expect(serverConfig).toContain('allowedOrigins');
    expect(serverConfig).toContain('development mode');
  });

  test('should handle both HTTP and HTTPS protocols', () => {
    const protocolVariations = ['http://', 'https://'];
    
    protocolVariations.forEach(protocol => {
      expect(serverConfig).toContain(`"${protocol}localhost:3000"`);
      expect(serverConfig).toContain(`"${protocol}localhost:3001"`);
      expect(serverConfig).toContain(`"${protocol}127.0.0.1:3000"`);
    });
  });

  test('should include optionsSuccessStatus for proper preflight handling', () => {
    expect(serverConfig).toContain('optionsSuccessStatus: 200');
  });

  test('should have development mode fallback logic', () => {
    expect(serverConfig).toContain('process.env.NODE_ENV === \'development\'');
    expect(serverConfig).toContain('allowing unknown origin');
  });

  test('should include comprehensive transport configuration', () => {
    expect(serverConfig).toContain('transports: [\'polling\', \'websocket\']');
    expect(serverConfig).toContain('allowUpgrades: true');
    expect(serverConfig).toContain('pingTimeout:');
    expect(serverConfig).toContain('pingInterval:');
  });

  test('should maintain consistent CORS configuration between Socket.IO and Express', () => {
    // Extract Socket.IO origins
    const socketIOOriginsMatch = serverConfig.match(/const io = new SocketIOServer[\s\S]*?origin:\s*\[([\s\S]*?)\]/);
    const expressOriginsMatch = serverConfig.match(/app\.use\(cors\([\s\S]*?allowedOrigins\s*=\s*\[([\s\S]*?)\]/);

    expect(socketIOOriginsMatch).toBeTruthy();
    expect(expressOriginsMatch).toBeTruthy();

    if (socketIOOriginsMatch && expressOriginsMatch) {
      const socketIOOrigins = socketIOOriginsMatch[1];
      const expressOrigins = expressOriginsMatch[1];

      // Key origins should be present in both configurations
      const keyOrigins = ['localhost:3000', 'localhost:3001', '127.0.0.1:3000'];
      
      keyOrigins.forEach(origin => {
        expect(socketIOOrigins).toContain(origin);
        expect(expressOrigins).toContain(origin);
      });
    }
  });
});

describe('WebSocket Configuration Validation', () => {
  test('should have appropriate timeout configurations', () => {
    const serverConfig = readFileSync(join(__dirname, '../../../src/api/server.ts'), 'utf-8');

    // Check for reasonable timeout values
    expect(serverConfig).toMatch(/pingTimeout:\s*\d+/);
    expect(serverConfig).toMatch(/pingInterval:\s*\d+/);
    
    // Extract timeout values
    const pingTimeoutMatch = serverConfig.match(/pingTimeout:\s*(\d+)/);
    const pingIntervalMatch = serverConfig.match(/pingInterval:\s*(\d+)/);

    if (pingTimeoutMatch && pingIntervalMatch) {
      const pingTimeout = parseInt(pingTimeoutMatch[1]);
      const pingInterval = parseInt(pingIntervalMatch[1]);

      // Validate reasonable timeout values
      expect(pingTimeout).toBeGreaterThan(5000);  // At least 5 seconds
      expect(pingTimeout).toBeLessThan(120000);   // Not more than 2 minutes
      expect(pingInterval).toBeGreaterThan(1000); // At least 1 second
      expect(pingInterval).toBeLessThan(60000);   // Not more than 1 minute
      expect(pingTimeout).toBeGreaterThan(pingInterval); // Timeout should be > interval
    }
  });

  test('should have security headers configured', () => {
    const serverConfig = readFileSync(join(__dirname, '../../../src/api/server.ts'), 'utf-8');

    expect(serverConfig).toContain('helmet(');
    expect(serverConfig).toContain('crossOriginEmbedderPolicy: false');
    expect(serverConfig).toContain('contentSecurityPolicy:');
    expect(serverConfig).toContain('connectSrc: ["\'self\'", "ws:", "wss:"]');
  });
});