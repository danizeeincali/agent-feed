/**
 * WebSocket Test Setup
 * Global setup and utilities for WebSocket stability tests
 */

const { spawn } = require('child_process');

// Global test utilities
global.waitForPort = async (port, timeout = 10000) => {
  const net = require('net');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.createConnection(port, 'localhost');
        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
        setTimeout(() => {
          socket.destroy();
          reject(new Error('Timeout'));
        }, 1000);
      });
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Port ${port} not available after ${timeout}ms`);
};

global.killProcessOnPort = async (port) => {
  return new Promise((resolve) => {
    const killer = spawn('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore' });
    killer.on('close', () => {
      setTimeout(resolve, 1000); // Wait for cleanup
    });
    killer.on('error', () => resolve()); // Ignore errors
  });
};

// Test lifecycle hooks
beforeEach(async () => {
  // Clean up any lingering processes
  await global.killProcessOnPort(3002);
});

afterEach(async () => {
  // Allow time for connections to close
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Extend Jest timeout globally for WebSocket tests
jest.setTimeout(120000);