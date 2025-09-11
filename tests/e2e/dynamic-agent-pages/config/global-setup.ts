import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for Dynamic Agent Pages E2E tests
 * Prepares test environment, mock data, and ensures services are running
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Dynamic Agent Pages E2E test environment...');
  
  try {
    // Create necessary directories
    const dirs = [
      './test-results',
      './reports',
      './reports/html',
      './screenshots',
      './videos',
      './traces'
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Initialize test database with agent data
    await setupTestDatabase();
    
    // Setup mock WebSocket server for real-time tests
    await setupMockWebSocketServer();
    
    // Verify services are accessible
    await verifyServices();
    
    // Setup performance monitoring
    await setupPerformanceMonitoring();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    process.exit(1);
  }
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database with agent data...');
  
  const testAgents = [
    {
      id: 'test-agent-1',
      name: 'Test AI Assistant',
      type: 'general-assistant',
      status: 'active',
      specialization: 'Multi-domain AI assistant for testing',
      description: 'A comprehensive test agent for E2E validation',
      capabilities: ['Task Automation', 'Data Analysis', 'Report Generation'],
      stats: {
        tasksCompleted: 1247,
        successRate: 97.8,
        averageResponseTime: 1.3,
        uptime: 99.2,
        todayTasks: 23,
        weeklyTasks: 156
      }
    },
    {
      id: 'test-agent-2', 
      name: 'Productivity Assistant',
      type: 'productivity',
      status: 'busy',
      specialization: 'Task and workflow management',
      description: 'Specialized in productivity optimization',
      capabilities: ['Workflow Management', 'Scheduling', 'Task Prioritization'],
      stats: {
        tasksCompleted: 892,
        successRate: 95.5,
        averageResponseTime: 2.1,
        uptime: 98.7,
        todayTasks: 18,
        weeklyTasks: 124
      }
    },
    {
      id: 'test-agent-3',
      name: 'Research Assistant', 
      type: 'research',
      status: 'inactive',
      specialization: 'Information gathering and analysis',
      description: 'Specialized research and data collection agent',
      capabilities: ['Web Research', 'Data Mining', 'Citation Management'],
      stats: {
        tasksCompleted: 654,
        successRate: 99.1,
        averageResponseTime: 3.2,
        uptime: 97.3,
        todayTasks: 8,
        weeklyTasks: 67
      }
    }
  ];
  
  // Write test data to file for test access
  const testDataPath = path.join(__dirname, '../fixtures/test-agents.json');
  fs.writeFileSync(testDataPath, JSON.stringify(testAgents, null, 2));
}

async function setupMockWebSocketServer() {
  console.log('🔌 Setting up mock WebSocket server...');
  
  // Mock WebSocket events for real-time testing
  const mockWebSocketEvents = [
    {
      event: 'agent-update',
      data: {
        agentId: 'test-agent-1',
        updates: { status: 'active', todayTasks: 24 }
      }
    },
    {
      event: 'new-post',
      data: {
        authorId: 'test-agent-1',
        post: {
          id: 'test-post-1',
          type: 'insight',
          title: 'Test Performance Update',
          content: 'This is a test post for E2E validation',
          timestamp: new Date().toISOString(),
          author: { id: 'test-agent-1', name: 'Test AI Assistant', avatar: '🤖' },
          tags: ['testing', 'e2e'],
          interactions: { likes: 5, comments: 2, shares: 1, bookmarks: 3 },
          priority: 'medium'
        }
      }
    }
  ];
  
  const mockDataPath = path.join(__dirname, '../fixtures/mock-websocket-events.json');
  fs.writeFileSync(mockDataPath, JSON.stringify(mockWebSocketEvents, null, 2));
}

async function verifyServices() {
  console.log('🔍 Verifying services are accessible...');
  
  const services = [
    { name: 'Frontend', url: 'http://localhost:5173', timeout: 30000 },
    { name: 'Backend', url: 'http://localhost:3000/api/health', timeout: 15000 }
  ];
  
  for (const service of services) {
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        const response = await fetch(service.url, {
          signal: AbortSignal.timeout(service.timeout)
        });
        
        if (response.ok || response.status === 404) { // 404 is OK for frontend
          success = true;
          console.log(`✅ ${service.name} service is accessible`);
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.warn(`⚠️  ${service.name} service not accessible: ${error.message}`);
          console.log(`   This may cause some tests to fail or use fallback data`);
        } else {
          console.log(`🔄 Retrying ${service.name} service check (${retries} attempts remaining)...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }
}

async function setupPerformanceMonitoring() {
  console.log('📈 Setting up performance monitoring...');
  
  const performanceConfig = {
    enableTimings: true,
    enableMetrics: true,
    thresholds: {
      navigationLoad: 3000, // 3s max for page load
      firstContentfulPaint: 1500, // 1.5s max for FCP
      largestContentfulPaint: 2500, // 2.5s max for LCP
      cumulativeLayoutShift: 0.1, // Max CLS score
      firstInputDelay: 100 // 100ms max FID
    }
  };
  
  const configPath = path.join(__dirname, '../fixtures/performance-config.json');
  fs.writeFileSync(configPath, JSON.stringify(performanceConfig, null, 2));
}

export default globalSetup;