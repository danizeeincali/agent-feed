/**
 * Live Server Validator
 * 
 * Ensures that the required servers are running before executing tests
 */

import { request } from '@playwright/test';

export interface ServerStatus {
  url: string;
  name: string;
  isRunning: boolean;
  responseTime: number;
  error?: string;
}

export class LiveServerValidator {
  private static readonly REQUIRED_SERVERS = [
    { url: 'http://localhost:5173', name: 'Frontend Server' },
    { url: 'http://localhost:3000', name: 'Backend Server' }
  ];

  private static readonly TIMEOUT = 5000; // 5 seconds timeout

  /**
   * Check if all required servers are running
   */
  static async validateServers(): Promise<ServerStatus[]> {
    const results: ServerStatus[] = [];

    for (const server of this.REQUIRED_SERVERS) {
      const status = await this.checkServer(server.url, server.name);
      results.push(status);
    }

    return results;
  }

  /**
   * Check if a specific server is running
   */
  private static async checkServer(url: string, name: string): Promise<ServerStatus> {
    const startTime = Date.now();
    
    try {
      const context = await request.newContext();
      const response = await context.get(url, {
        timeout: this.TIMEOUT,
        ignoreHTTPSErrors: true
      });

      const responseTime = Date.now() - startTime;
      const isRunning = response.ok() || response.status() < 500;

      await context.dispose();

      return {
        url,
        name,
        isRunning,
        responseTime,
        error: isRunning ? undefined : `HTTP ${response.status()}: ${response.statusText()}`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        url,
        name,
        isRunning: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Wait for servers to become available
   */
  static async waitForServers(maxWaitTime = 30000, pollInterval = 2000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const statuses = await this.validateServers();
      const allRunning = statuses.every(status => status.isRunning);

      if (allRunning) {
        console.log('All servers are running and ready');
        return true;
      }

      const notRunning = statuses.filter(s => !s.isRunning);
      console.log(`Waiting for servers: ${notRunning.map(s => s.name).join(', ')}`);

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    console.error('Timeout waiting for servers to become available');
    return false;
  }

  /**
   * Print server status report
   */
  static printStatusReport(statuses: ServerStatus[]): void {
    console.log('\n=== Server Status Report ===');
    
    for (const status of statuses) {
      const statusIcon = status.isRunning ? '✅' : '❌';
      const responseTime = `${status.responseTime}ms`;
      
      console.log(`${statusIcon} ${status.name} (${status.url}) - ${responseTime}`);
      
      if (status.error) {
        console.log(`   Error: ${status.error}`);
      }
    }
    
    console.log('============================\n');
  }

  /**
   * Validate frontend specific endpoints
   */
  static async validateFrontendEndpoints(): Promise<boolean> {
    const endpoints = [
      'http://localhost:5173/',
      'http://localhost:5173/claude-instances',
      'http://localhost:5173/assets', // Check if assets are served
    ];

    let allValid = true;

    for (const endpoint of endpoints) {
      try {
        const context = await request.newContext();
        const response = await context.get(endpoint, { timeout: 5000 });
        
        const isValid = response.ok() || response.status() === 404; // 404 is ok for some paths
        if (!isValid) {
          console.error(`❌ Frontend endpoint failed: ${endpoint} (HTTP ${response.status()})`);
          allValid = false;
        } else {
          console.log(`✅ Frontend endpoint OK: ${endpoint}`);
        }
        
        await context.dispose();
      } catch (error) {
        console.error(`❌ Frontend endpoint error: ${endpoint} - ${error}`);
        allValid = false;
      }
    }

    return allValid;
  }

  /**
   * Validate backend API endpoints
   */
  static async validateBackendEndpoints(): Promise<boolean> {
    const endpoints = [
      'http://localhost:3000/api/health',
      'http://localhost:3000/api/instances',
      'http://localhost:3000/api/status',
    ];

    let allValid = true;

    for (const endpoint of endpoints) {
      try {
        const context = await request.newContext();
        const response = await context.get(endpoint, { timeout: 5000 });
        
        const isValid = response.ok() || response.status() === 404; // Some endpoints might not exist
        if (!isValid && response.status() >= 500) {
          console.error(`❌ Backend endpoint failed: ${endpoint} (HTTP ${response.status()})`);
          allValid = false;
        } else {
          console.log(`✅ Backend endpoint OK: ${endpoint} (HTTP ${response.status()})`);
        }
        
        await context.dispose();
      } catch (error) {
        console.error(`❌ Backend endpoint error: ${endpoint} - ${error}`);
        allValid = false;
      }
    }

    return allValid;
  }
}