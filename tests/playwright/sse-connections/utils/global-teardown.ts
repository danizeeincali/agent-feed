/**
 * Global teardown for SSE connection tests
 * Ensures all processes are properly terminated
 */
export default async function globalTeardown() {
  console.log('🧹 SSE Test Environment Teardown...');
  
  const backendProcess = (global as any).__BACKEND_PROCESS__;
  const frontendProcess = (global as any).__FRONTEND_PROCESS__;
  
  if (backendProcess) {
    console.log('🔴 Terminating backend server...');
    backendProcess.kill('SIGTERM');
    
    // Force kill if not terminated within 5 seconds
    setTimeout(() => {
      if (!backendProcess.killed) {
        console.log('⚡ Force killing backend server...');
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  if (frontendProcess) {
    console.log('🔴 Terminating frontend server...');
    frontendProcess.kill('SIGTERM');
    
    // Force kill if not terminated within 5 seconds
    setTimeout(() => {
      if (!frontendProcess.killed) {
        console.log('⚡ Force killing frontend server...');
        frontendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  // Allow time for graceful shutdown
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('✅ SSE Test Environment teardown complete');
}