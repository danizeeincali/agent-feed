import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for Dynamic Pages E2E Tests
 *
 * This teardown runs once after all tests complete and cleans up:
 * - Test data cleanup
 * - Environment reset
 * - Final logging and reporting
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Dynamic Pages E2E Test Teardown...');

  const BACKEND_URL = 'http://localhost:3000';
  const TEST_AGENT_ID = 'personal-todos-agent';

  try {
    // Clean up any remaining test pages
    console.log('🗑️ Cleaning up test pages...');

    const pagesResponse = await fetch(`${BACKEND_URL}/api/agents/${TEST_AGENT_ID}/pages`);
    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();

      if (pagesData.success && pagesData.data.pages) {
        let cleanedCount = 0;

        for (const page of pagesData.data.pages) {
          // Clean up test pages based on title patterns or tags
          const isTestPage =
            page.title.includes('Test') ||
            page.title.includes('API Test') ||
            page.title.includes('Dashboard Overview') ||
            page.title.includes('User Guide') ||
            page.title.includes('Configuration Settings') ||
            page.title.includes('Quick Reference') ||
            page.title.includes('Task Analytics') ||
            page.title.includes('Invalid JSON Test') ||
            page.tags?.includes('test') ||
            page.tags?.includes('api') ||
            page.tags?.includes('demo');

          if (isTestPage) {
            try {
              const deleteResponse = await fetch(`${BACKEND_URL}/api/agents/${TEST_AGENT_ID}/pages/${page.id}`, {
                method: 'DELETE'
              });

              if (deleteResponse.ok) {
                cleanedCount++;
              }
            } catch (error) {
              console.warn(`Failed to delete test page ${page.id}:`, error);
            }
          }
        }

        console.log(`✅ Cleaned up ${cleanedCount} test pages`);
      }
    }

    // Generate test summary
    console.log('📊 Generating test summary...');

    const testResultsPath = './test-results';
    const reportsPath = './reports';

    try {
      // Check if results directory exists
      const fs = await import('fs');
      const path = await import('path');

      if (fs.existsSync(testResultsPath)) {
        const files = fs.readdirSync(testResultsPath);
        console.log(`📁 Test results saved in: ${testResultsPath}`);
        console.log(`📂 Found ${files.length} result files`);
      }

      if (fs.existsSync(reportsPath)) {
        console.log(`📊 Test reports saved in: ${reportsPath}`);

        // Check for HTML report
        if (fs.existsSync(path.join(reportsPath, 'html'))) {
          console.log('🌐 HTML report available at: ./reports/html/index.html');
        }

        // Check for JSON results
        if (fs.existsSync(path.join(reportsPath, 'results.json'))) {
          console.log('📄 JSON results available at: ./reports/results.json');
        }

        // Check for JUnit XML
        if (fs.existsSync(path.join(reportsPath, 'junit.xml'))) {
          console.log('📋 JUnit XML available at: ./reports/junit.xml');
        }
      }

    } catch (error) {
      console.log('⚠️ Could not generate full test summary:', error);
    }

    // Final performance and health check
    console.log('🏁 Final system check...');

    try {
      const backendCheck = await fetch(`${BACKEND_URL}/api/agents`);
      if (backendCheck.ok) {
        console.log('✅ Backend server is still healthy');
      }
    } catch (error) {
      console.log('⚠️ Backend server check failed (may have been stopped)');
    }

    // Log test completion metrics
    console.log('📈 Test Session Summary:');
    console.log(`   • Test Agent: ${TEST_AGENT_ID}`);
    console.log(`   • Backend URL: ${BACKEND_URL}`);
    console.log(`   • Test Types: E2E Navigation, API Integration, Page Rendering`);
    console.log(`   • Browser Support: Chromium, Firefox, WebKit, Mobile`);
    console.log(`   • Features Tested: Dynamic Pages, Error Handling, Responsive Design`);

    console.log('✅ Dynamic Pages E2E Test Teardown Complete!');

  } catch (error) {
    console.error('❌ Global teardown encountered an error:', error);
    // Don't throw the error to avoid failing the test run
  }

  console.log('🎯 All Dynamic Pages E2E tests completed!');
}

export default globalTeardown;