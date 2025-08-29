import { chromium, FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

let frontendProcess: ChildProcess | null = null;
let backendProcess: ChildProcess | null = null;

/**
 * Global setup for SSE connection tests
 * Ensures backend and frontend are running before tests begin
 */
export default async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting SSE Connection Test Environment...');
  
  // Start backend server
  console.log('📡 Starting backend server...');
  backendProcess = spawn('node', ['simple-backend.js'], {
    cwd: '/workspaces/agent-feed',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  if (backendProcess.stdout) {
    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });
  }
  
  if (backendProcess.stderr) {
    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });
  }
  
  // Start frontend server
  console.log('🌐 Starting frontend server...');
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: '/workspaces/agent-feed/frontend',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  if (frontendProcess.stdout) {
    frontendProcess.stdout.on('data', (data) => {
      console.log(`[Frontend] ${data.toString().trim()}`);
    });
  }
  
  if (frontendProcess.stderr) {
    frontendProcess.stderr.on('data', (data) => {
      console.error(`[Frontend Error] ${data.toString().trim()}`);
    });
  }
  
  // Wait for services to be ready
  console.log('⏳ Waiting for services to be ready...');
  await sleep(15000); // 15 seconds startup time
  
  // Verify backend is responding
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log('🔍 Checking backend health...');
    const backendResponse = await page.goto('http://localhost:3000/api/health', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!backendResponse?.ok()) {
      throw new Error(`Backend health check failed: ${backendResponse?.status()}`);
    }
    
    console.log('🔍 Checking frontend availability...');
    const frontendResponse = await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!frontendResponse?.ok()) {
      throw new Error(`Frontend availability check failed: ${frontendResponse?.status()}`);
    }
    
    await browser.close();
    console.log('✅ Services are ready for SSE connection testing');
    
  } catch (error) {
    console.error('❌ Service startup failed:', error);
    await cleanup();
    throw error;
  }
  
  // Store process references for cleanup
  (global as any).__BACKEND_PROCESS__ = backendProcess;
  (global as any).__FRONTEND_PROCESS__ = frontendProcess;
}

async function cleanup() {
  console.log('🧹 Cleaning up test environment...');
  
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
  
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
    frontendProcess = null;
  }
  
  await sleep(2000); // Allow graceful shutdown
}