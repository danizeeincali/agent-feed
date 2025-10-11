/**
 * Jest Setup for Integration Tests
 *
 * Runs before each test file
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Extend Jest timeout for database operations
jest.setTimeout(30000);

// Load test environment variables
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Silence console during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
