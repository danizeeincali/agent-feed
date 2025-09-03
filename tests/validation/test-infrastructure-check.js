/**
 * Test Infrastructure Validation
 * 
 * Quick validation test to verify that the testing infrastructure is working correctly
 * before running the full regression suite.
 */

import { jest, describe, test, beforeAll, expect } from '@jest/globals';
import fetch from 'node-fetch';
import { EventSource } from 'eventsource';

const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:5173',
  TIMEOUT: 10000
};

describe('Test Infrastructure Validation', () => {
  beforeAll(async () => {
    console.log('🔍 Validating test infrastructure...');
  });

  test('should have backend server running', async () => {
    try {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/health`);
      expect(response.ok).toBe(true);
      console.log('✅ Backend server is accessible');
    } catch (error) {
      console.error('❌ Backend server is not accessible:', error.message);
      throw error;
    }
  }, TEST_CONFIG.TIMEOUT);

  test('should have frontend server running', async () => {
    try {
      const response = await fetch(TEST_CONFIG.FRONTEND_URL);
      expect(response.ok).toBe(true);
      console.log('✅ Frontend server is accessible');
    } catch (error) {
      console.error('❌ Frontend server is not accessible:', error.message);
      throw error;
    }
  }, TEST_CONFIG.TIMEOUT);

  test('should have required dependencies available', () => {
    expect(typeof fetch).toBe('function');
    expect(typeof EventSource).toBe('function');
    console.log('✅ Required dependencies are available');
  });

  test('should be able to create test instances API endpoint', async () => {
    try {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`);
      expect([200, 404]).toContain(response.status);
      console.log('✅ Claude instances API endpoint is accessible');
    } catch (error) {
      console.error('❌ Claude instances API endpoint is not accessible:', error.message);
      throw error;
    }
  }, TEST_CONFIG.TIMEOUT);

  test('should verify test utilities can be imported', async () => {
    try {
      const { TestDataFactory, ClaudeInstanceTestManager } = await import('../utils/test-setup.js');
      
      expect(typeof TestDataFactory.generateInstanceConfig).toBe('function');
      expect(typeof ClaudeInstanceTestManager).toBe('function');
      
      // Test data generation
      const instanceConfig = TestDataFactory.generateInstanceConfig();
      expect(instanceConfig).toHaveProperty('command');
      expect(instanceConfig).toHaveProperty('name');
      expect(instanceConfig).toHaveProperty('type');
      
      console.log('✅ Test utilities are working correctly');
    } catch (error) {
      console.error('❌ Test utilities import failed:', error.message);
      throw error;
    }
  });

  test('should validate test configuration values', () => {
    expect(TEST_CONFIG.API_BASE_URL).toBeDefined();
    expect(TEST_CONFIG.FRONTEND_URL).toBeDefined();
    expect(TEST_CONFIG.TIMEOUT).toBeGreaterThan(0);
    
    console.log('✅ Test configuration is valid');
    console.log(`   API URL: ${TEST_CONFIG.API_BASE_URL}`);
    console.log(`   Frontend URL: ${TEST_CONFIG.FRONTEND_URL}`);
    console.log(`   Timeout: ${TEST_CONFIG.TIMEOUT}ms`);
  });

  test('should check system resources', async () => {
    // Check if ports are accessible
    const portChecks = [
      { port: 3000, name: 'Backend', url: TEST_CONFIG.API_BASE_URL },
      { port: 5173, name: 'Frontend', url: TEST_CONFIG.FRONTEND_URL }
    ];

    for (const check of portChecks) {
      try {
        const response = await fetch(check.url, { timeout: 5000 });
        console.log(`✅ ${check.name} port ${check.port} is accessible`);
      } catch (error) {
        console.error(`❌ ${check.name} port ${check.port} is not accessible:`, error.message);
        throw error;
      }
    }
  }, TEST_CONFIG.TIMEOUT);
});