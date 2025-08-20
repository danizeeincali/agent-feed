import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up test artifacts
    const testResultsPath = path.join(__dirname, '../../../test-results');
    
    if (fs.existsSync(testResultsPath)) {
      console.log('📁 Organizing test artifacts...');
      
      // Create organized directory structure
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(testResultsPath, `archive-${timestamp}`);
      
      // Move screenshots and videos to archive if they exist
      const screenshots = fs.readdirSync(testResultsPath)
        .filter(file => file.endsWith('.png') || file.endsWith('.jpg'));
      
      const videos = fs.readdirSync(testResultsPath)
        .filter(file => file.endsWith('.webm') || file.endsWith('.mp4'));
      
      if (screenshots.length > 0 || videos.length > 0) {
        fs.mkdirSync(archivePath, { recursive: true });
        
        [...screenshots, ...videos].forEach(file => {
          const oldPath = path.join(testResultsPath, file);
          const newPath = path.join(archivePath, file);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (error) {
            console.warn(`⚠️  Could not move ${file}:`, error.message);
          }
        });
        
        console.log(`📦 Archived ${screenshots.length} screenshots and ${videos.length} videos`);
      }
    }
    
    // Generate test summary
    const summaryPath = path.join(testResultsPath, 'test-summary.json');
    if (fs.existsSync(summaryPath)) {
      const summary = {
        timestamp: new Date().toISOString(),
        testRun: 'e2e-regression-suite',
        environment: process.env.NODE_ENV || 'test',
        baseURL: config.projects[0].use.baseURL || 'http://localhost:3001',
        browsers: config.projects.map(p => p.name),
        completed: true
      };
      
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log('📊 Generated test summary');
    }
    
    // Performance cleanup
    if (global.gc) {
      global.gc();
      console.log('🗑️  Garbage collection completed');
    }
    
    console.log('✅ Global teardown completed');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

export default globalTeardown;