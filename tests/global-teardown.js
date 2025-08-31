const fs = require('fs');
const path = require('path');

/**
 * Global teardown for production validation tests
 * Captures final logs and generates test report
 */
async function globalTeardown(config) {
  console.log('🏁 Production validation teardown started...');
  
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    
    // Capture final log state
    const logFile = '/workspaces/agent-feed/logs/combined.log';
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logLines = logContent.split('\n');
      
      // Extract validation-related logs
      const validationLogs = logLines.filter(line =>
        line.includes('Production validation') ||
        line.includes('claude') ||
        line.includes('/api/claude/instances') ||
        line.includes('Command executed') ||
        line.includes('Response sent')
      );
      
      if (validationLogs.length > 0) {
        fs.writeFileSync(
          path.join(testResultsDir, 'validation-logs.txt'),
          validationLogs.join('\n')
        );
        console.log(`📋 Captured ${validationLogs.length} validation-related log entries`);
      }
    }
    
    // Generate test summary
    const serverStatus = JSON.parse(
      fs.readFileSync(path.join(testResultsDir, 'server-status.json'), 'utf8')
    );
    
    const summary = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - serverStatus.timestamp,
      servers: serverStatus,
      validationComplete: true
    };
    
    fs.writeFileSync(
      path.join(testResultsDir, 'validation-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('📊 Test Summary:');
    console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);
    console.log(`   Frontend: ${serverStatus.frontend ? '✅' : '❌'}`);
    console.log(`   Backend: ${serverStatus.backend ? '✅' : '❌'}`);
    console.log('✅ Production validation teardown completed');
    
  } catch (error) {
    console.error('❌ Teardown error:', error.message);
  }
}

module.exports = globalTeardown;