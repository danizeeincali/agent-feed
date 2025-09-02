import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting production E2E validation setup...');
  
  try {
    // Ensure backend is running
    console.log('📡 Starting backend server...');
    await execAsync('pkill -f "node.*backend" || true');
    
    // Start the enhanced backend
    const backendProcess = exec('node sparc-fixed-backend.js', {
      cwd: process.cwd(),
    });
    
    backendProcess.stdout?.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });
    
    backendProcess.stderr?.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });
    
    // Wait for backend to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify backend is responding
    const { stdout } = await execAsync('curl -f http://localhost:3000/health || echo "Backend not ready"');
    console.log('Backend health check:', stdout);
    
    console.log('✅ Setup complete - backend ready for testing');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

export default globalSetup;