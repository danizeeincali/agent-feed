/**
 * Real Data Display Verification Script
 * This script verifies that the UnifiedAgentPage displays 100% real data
 * with zero mock contamination
 */

const puppeteer = require('puppeteer');

async function verifyRealDataDisplay() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set up console logging to catch any errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  try {
    console.log('🔍 Navigating to UnifiedAgentPage...');
    await page.goto('http://localhost:5173/agents/agent-feedback-agent');
    
    // Wait for the page to load completely
    await page.waitForSelector('[data-testid="agent-name"], .agent-name, h1', { timeout: 10000 });
    
    // Take a screenshot for manual verification
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/unified-agent-page-verification.png' });
    
    console.log('✅ Page loaded successfully');
    
    // VERIFICATION 1: Overview Tab - Check for real metrics
    console.log('🔍 Verifying Overview Tab...');
    
    const overviewMetrics = await page.evaluate(() => {
      const metrics = {};
      
      // Look for success rate
      const successRateElement = document.querySelector('[data-testid="success-rate"], .success-rate');
      if (successRateElement) {
        metrics.successRate = successRateElement.textContent.trim();
      }
      
      // Look for tasks completed
      const tasksElement = document.querySelector('[data-testid="tasks-completed"], .tasks-completed');
      if (tasksElement) {
        metrics.tasksCompleted = tasksElement.textContent.trim();
      }
      
      // Look for response time
      const responseTimeElement = document.querySelector('[data-testid="response-time"], .response-time');
      if (responseTimeElement) {
        metrics.responseTime = responseTimeElement.textContent.trim();
      }
      
      // Look for uptime
      const uptimeElement = document.querySelector('[data-testid="uptime"], .uptime');
      if (uptimeElement) {
        metrics.uptime = uptimeElement.textContent.trim();
      }
      
      // Check for any text containing "N/A" for tasks today/weekly
      const todayTasksElement = document.querySelector('[data-testid="today-tasks"], .today-tasks');
      if (todayTasksElement) {
        metrics.todayTasks = todayTasksElement.textContent.trim();
      }
      
      // Check all metric values on page
      const allMetrics = Array.from(document.querySelectorAll('.text-2xl, .text-xl, .font-bold')).map(el => el.textContent.trim());
      metrics.allDisplayedValues = allMetrics;
      
      return metrics;
    });
    
    console.log('📊 Overview Metrics Found:', overviewMetrics);
    
    // VERIFICATION 2: Details Tab
    console.log('🔍 Checking Details Tab...');
    await page.click('button:has-text("Details"), [role="tab"]:has-text("Details")');
    await page.waitForTimeout(1000);
    
    const detailsMetrics = await page.evaluate(() => {
      const details = {};
      
      // Check performance metrics section
      const performanceSection = document.querySelector('[data-testid="performance-metrics"], .performance-metrics');
      if (performanceSection) {
        details.hasPerformanceSection = true;
        details.performanceText = performanceSection.textContent;
      }
      
      // Look for specific real values
      const allText = document.body.textContent;
      details.containsSuccessRate = allText.includes('89.') || allText.includes('88.'); // Real success rate
      details.containsResponseTime = allText.includes('0.') && allText.includes('s'); // Real response time
      details.containsTaskCount = allText.includes('89') || allText.includes('80'); // Real task count
      
      return details;
    });
    
    console.log('📋 Details Tab Metrics:', detailsMetrics);
    
    // VERIFICATION 3: Activity Tab
    console.log('🔍 Checking Activity Tab...');
    await page.click('button:has-text("Activity"), [role="tab"]:has-text("Activity")');
    await page.waitForTimeout(1000);
    
    const activityData = await page.evaluate(() => {
      const activities = [];
      
      // Look for activity items
      const activityElements = document.querySelectorAll('[data-testid="activity-item"], .activity-item, .flex.items-start.gap-3');
      activityElements.forEach(el => {
        const title = el.querySelector('.font-medium, .text-sm.font-medium')?.textContent?.trim();
        const description = el.querySelector('.text-gray-600, .text-sm.text-gray-600')?.textContent?.trim();
        if (title || description) {
          activities.push({ title, description });
        }
      });
      
      // Check for real activity content
      const bodyText = document.body.textContent;
      const hasRealActivities = bodyText.includes('89 Tasks') || bodyText.includes('System Health') || bodyText.includes('CPU:');
      
      return {
        activitiesFound: activities.length,
        activities: activities.slice(0, 3), // First 3 activities
        hasRealContent: hasRealActivities
      };
    });
    
    console.log('📈 Activity Tab Data:', activityData);
    
    // VERIFICATION 4: Check for Mock Data Contamination
    console.log('🚫 Checking for mock data contamination...');
    
    const mockDataCheck = await page.evaluate(() => {
      const bodyText = document.body.textContent.toLowerCase();
      
      const mockIndicators = [
        'lorem ipsum',
        'placeholder',
        'fake data',
        'mock data',
        'test data',
        '4.8/5', // Fake satisfaction score
        '92%', // Fake percentage
        '96%', // Fake percentage
        '24/7', // Fake availability
        'john doe',
        'example.com'
      ];
      
      const foundMockData = mockIndicators.filter(indicator => bodyText.includes(indicator));
      
      return {
        hasMockData: foundMockData.length > 0,
        foundIndicators: foundMockData
      };
    });
    
    console.log('🔍 Mock Data Check:', mockDataCheck);
    
    // VERIFICATION 5: Real Data Values Check
    console.log('✅ Verifying real data values...');
    
    const realDataVerification = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      
      // Expected real values from API
      const expectedValues = {
        successRate: '89.1%', // From performance_metrics.success_rate
        tasksCompleted: '89', // From usage_count
        responseTime: '0.28s', // From average_response_time converted
        uptime: '95.9%' // From uptime_percentage
      };
      
      const foundValues = {};
      
      // Check if real values are present
      for (const [key, value] of Object.entries(expectedValues)) {
        foundValues[key] = bodyText.includes(value.replace('%', '')) || bodyText.includes(value);
      }
      
      return {
        expectedValues,
        foundValues,
        allRealValuesPresent: Object.values(foundValues).every(found => found)
      };
    });
    
    console.log('📊 Real Data Verification:', realDataVerification);
    
    // Generate Final Report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5173/agents/agent-feedback-agent',
      overviewMetrics,
      detailsMetrics,
      activityData,
      mockDataCheck,
      realDataVerification,
      errors,
      verdict: {
        hasNoMockData: !mockDataCheck.hasMockData,
        hasRealDataValues: realDataVerification.allRealValuesPresent,
        hasRealActivities: activityData.hasRealContent,
        noJavaScriptErrors: errors.length === 0,
        overall: (!mockDataCheck.hasMockData && realDataVerification.allRealValuesPresent && activityData.hasRealContent && errors.length === 0) ? 'PASSED' : 'FAILED'
      }
    };
    
    console.log('\n🎯 FINAL VERIFICATION REPORT:');
    console.log('================================');
    console.log(`✅ No Mock Data: ${report.verdict.hasNoMockData}`);
    console.log(`✅ Real Data Values: ${report.verdict.hasRealDataValues}`);
    console.log(`✅ Real Activities: ${report.verdict.hasRealActivities}`);
    console.log(`✅ No JS Errors: ${report.verdict.noJavaScriptErrors}`);
    console.log(`🎯 OVERALL VERDICT: ${report.verdict.overall}`);
    console.log('================================\n');
    
    if (report.verdict.overall === 'FAILED') {
      console.log('❌ ISSUES FOUND:');
      if (mockDataCheck.hasMockData) {
        console.log(`- Mock data detected: ${mockDataCheck.foundIndicators.join(', ')}`);
      }
      if (!realDataVerification.allRealValuesPresent) {
        console.log('- Missing real data values');
      }
      if (!activityData.hasRealContent) {
        console.log('- Missing real activity content');
      }
      if (errors.length > 0) {
        console.log(`- JavaScript errors: ${errors.join(', ')}`);
      }
    }
    
    return report;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyRealDataDisplay()
    .then(report => {
      console.log('Verification completed');
      process.exit(report.verdict.overall === 'PASSED' ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

module.exports = verifyRealDataDisplay;