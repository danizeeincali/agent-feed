/**
 * PRODUCTION COMMENT SYSTEM VALIDATION
 * 
 * This script performs comprehensive real-browser validation of the comment system
 * including API integration, loading states, real data, and UI functionality.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ProductionCommentValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      testResults: [],
      screenshots: [],
      networkLogs: [],
      errors: [],
      criticalIssues: [],
      passedTests: 0,
      failedTests: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing Production Comment System Validator...');
    
    // Launch browser with debugging capabilities
    this.browser = await chromium.launch({ 
      headless: false, // Visual validation
      devtools: true,
      slowMo: 500 // Slow down for observation
    });
    
    this.page = await this.browser.newPage();
    
    // Enable network monitoring
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'ProductionValidator/1.0.0'
    });

    // Monitor network requests
    this.page.on('request', request => {
      if (request.url().includes('/comments') || request.url().includes('/agent-posts')) {
        this.results.networkLogs.push({
          type: 'request',
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 API Request: ${request.method()} ${request.url()}`);
      }
    });

    this.page.on('response', response => {
      if (response.url().includes('/comments') || response.url().includes('/agent-posts')) {
        this.results.networkLogs.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
        console.log(`📨 API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        const error = `Console Error: ${msg.text()}`;
        this.results.errors.push(error);
        console.error(`❌ ${error}`);
      }
    });

    console.log('✅ Browser initialized for validation');
  }

  async navigateToApplication() {
    console.log('🌐 Navigating to application at http://localhost:5173');
    
    try {
      await this.page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      await this.takeScreenshot('01-application-loaded');
      this.addTestResult('Navigation', 'Application loaded successfully', true);
      
      // Wait for posts to load
      await this.page.waitForSelector('[data-testid="post-list"]', { timeout: 5000 });
      this.addTestResult('Data Loading', 'Posts loaded successfully', true);
      
    } catch (error) {
      this.addTestResult('Navigation', `Failed to load application: ${error.message}`, false);
      this.results.criticalIssues.push(`Application failed to load: ${error.message}`);
      throw error;
    }
  }

  async validateCommentButtonsExist() {
    console.log('🔍 Validating comment buttons exist on posts...');
    
    try {
      // Find all comment buttons
      const commentButtons = await this.page.$$('[title="View Comments"]');
      
      if (commentButtons.length === 0) {
        this.addTestResult('Comment Buttons', 'No comment buttons found on any posts', false);
        this.results.criticalIssues.push('No comment buttons found');
        return;
      }
      
      console.log(`✅ Found ${commentButtons.length} comment buttons`);
      this.addTestResult('Comment Buttons', `Found ${commentButtons.length} comment buttons`, true);
      
      // Validate button structure and content
      for (let i = 0; i < Math.min(3, commentButtons.length); i++) {
        const button = commentButtons[i];
        const buttonText = await button.textContent();
        const hasIcon = await button.$('svg') !== null;
        const hasCount = /\d+/.test(buttonText);
        
        this.addTestResult('Button Structure', 
          `Button ${i + 1}: Icon=${hasIcon}, Count=${hasCount}, Text="${buttonText}"`, 
          hasIcon && hasCount);
      }
      
    } catch (error) {
      this.addTestResult('Comment Buttons', `Error validating buttons: ${error.message}`, false);
    }
  }

  async testCommentClickingAndLoading() {
    console.log('🖱️ Testing comment clicking and loading states...');
    
    try {
      // Find the first few comment buttons to test
      const commentButtons = await this.page.$$('[title="View Comments"]');
      
      for (let i = 0; i < Math.min(3, commentButtons.length); i++) {
        console.log(`📝 Testing comment button ${i + 1}...`);
        
        // Get the post ID or identifier
        const postElement = await commentButtons[i].locator('xpath=ancestor::article').first();
        const postCard = await postElement.getAttribute('data-testid');
        
        await this.takeScreenshot(`02-before-comment-click-${i + 1}`);
        
        // Click the comment button
        await commentButtons[i].click();
        
        // Wait a moment to observe loading state
        await this.page.waitForTimeout(1000);
        await this.takeScreenshot(`03-after-comment-click-${i + 1}`);
        
        // Check for loading spinner
        const loadingSpinner = await this.page.$('.animate-spin');
        const hasLoadingState = loadingSpinner !== null;
        
        this.addTestResult('Loading State', 
          `Post ${i + 1}: Loading spinner ${hasLoadingState ? 'shown' : 'not shown'}`, 
          hasLoadingState);
        
        // Wait for comments to load (up to 5 seconds)
        try {
          await this.page.waitForSelector('.bg-gray-50', { timeout: 5000 });
          console.log(`✅ Comments loaded for post ${i + 1}`);
          
          // Check for real comment data
          await this.validateCommentContent(i + 1);
          
        } catch (loadError) {
          console.log(`⚠️ Comments did not load for post ${i + 1}: ${loadError.message}`);
          this.addTestResult('Comment Loading', `Post ${i + 1}: Comments failed to load`, false);
        }
        
        // Wait between tests
        await this.page.waitForTimeout(2000);
      }
      
    } catch (error) {
      this.addTestResult('Comment Clicking', `Error during click testing: ${error.message}`, false);
    }
  }

  async validateCommentContent(postNumber) {
    console.log(`🔍 Validating comment content for post ${postNumber}...`);
    
    try {
      // Find comment sections
      const commentSections = await this.page.$$('.bg-gray-50');
      
      if (commentSections.length === 0) {
        this.addTestResult('Comment Content', `Post ${postNumber}: No comments displayed`, false);
        return;
      }
      
      let realCommentsFound = 0;
      let professionalFormatting = true;
      
      for (const section of commentSections) {
        // Check for comment author
        const author = await section.$('span.font-medium');
        const authorText = author ? await author.textContent() : '';
        
        // Check for comment content
        const content = await section.$('p.text-sm');
        const contentText = content ? await content.textContent() : '';
        
        // Check for timestamp
        const timestamp = await section.$('span.text-xs');
        const timestampText = timestamp ? await timestamp.textContent() : '';
        
        // Check for avatar
        const avatar = await section.$('.bg-gradient-to-br');
        const hasAvatar = avatar !== null;
        
        // Validate real data (not placeholder text)
        const isRealData = authorText && 
                          !authorText.includes('User') && 
                          !authorText.includes('Agent Smith') && 
                          authorText.length > 2 &&
                          contentText && contentText.length > 10;
        
        if (isRealData) {
          realCommentsFound++;
          console.log(`✅ Real comment found: "${authorText}" - "${contentText.substring(0, 50)}..."`);
        }
        
        // Check formatting
        if (!hasAvatar || !authorText || !timestampText) {
          professionalFormatting = false;
        }
      }
      
      this.addTestResult('Real Comment Data', 
        `Post ${postNumber}: Found ${realCommentsFound} real comments`, 
        realCommentsFound > 0);
        
      this.addTestResult('Professional Formatting', 
        `Post ${postNumber}: Professional formatting ${professionalFormatting ? 'maintained' : 'issues found'}`, 
        professionalFormatting);
      
    } catch (error) {
      this.addTestResult('Comment Content', `Error validating content: ${error.message}`, false);
    }
  }

  async validateCommentCounts() {
    console.log('🔢 Validating comment count accuracy...');
    
    try {
      const commentButtons = await this.page.$$('[title="View Comments"]');
      
      for (let i = 0; i < Math.min(3, commentButtons.length); i++) {
        const button = commentButtons[i];
        const buttonText = await button.textContent();
        const displayedCount = parseInt(buttonText.match(/\d+/)?.[0] || '0');
        
        // Click to see actual comments
        await button.click();
        await this.page.waitForTimeout(1500); // Wait for loading
        
        // Count actual comments displayed
        const commentElements = await this.page.$$('.bg-gray-50');
        const actualCount = commentElements.length;
        
        const countsMatch = displayedCount === actualCount || Math.abs(displayedCount - actualCount) <= 1;
        
        this.addTestResult('Comment Count Accuracy', 
          `Post ${i + 1}: Displayed=${displayedCount}, Actual=${actualCount}, Match=${countsMatch}`, 
          countsMatch);
          
        console.log(`📊 Post ${i + 1}: Button shows ${displayedCount}, actual comments: ${actualCount}`);
      }
      
    } catch (error) {
      this.addTestResult('Comment Count', `Error validating counts: ${error.message}`, false);
    }
  }

  async validateToggleFunctionality() {
    console.log('🔄 Validating comment toggle functionality...');
    
    try {
      const commentButtons = await this.page.$$('[title="View Comments"]');
      
      if (commentButtons.length > 0) {
        const firstButton = commentButtons[0];
        
        // Initial state - should be closed
        await this.takeScreenshot('04-comments-initial-state');
        let commentsVisible = await this.page.$$('.bg-gray-50');
        const initiallyOpen = commentsVisible.length > 0;
        
        // Click to open
        await firstButton.click();
        await this.page.waitForTimeout(1500);
        await this.takeScreenshot('05-comments-opened');
        
        commentsVisible = await this.page.$$('.bg-gray-50');
        const openedSuccessfully = commentsVisible.length > 0;
        
        // Click to close
        await firstButton.click();
        await this.page.waitForTimeout(1000);
        await this.takeScreenshot('06-comments-closed');
        
        commentsVisible = await this.page.$$('.bg-gray-50');
        const closedSuccessfully = commentsVisible.length === 0;
        
        this.addTestResult('Toggle Functionality', 
          `Open=${openedSuccessfully}, Close=${closedSuccessfully}`, 
          openedSuccessfully && closedSuccessfully);
          
        console.log(`🔄 Toggle test: Initially=${initiallyOpen ? 'open' : 'closed'}, Opened=${openedSuccessfully}, Closed=${closedSuccessfully}`);
      }
      
    } catch (error) {
      this.addTestResult('Toggle Functionality', `Error testing toggle: ${error.message}`, false);
    }
  }

  async validateAPIIntegration() {
    console.log('📡 Validating API integration...');
    
    const commentRequests = this.results.networkLogs.filter(log => 
      log.url.includes('/comments') && log.type === 'request'
    );
    
    const commentResponses = this.results.networkLogs.filter(log => 
      log.url.includes('/comments') && log.type === 'response'
    );
    
    this.addTestResult('API Requests', 
      `Made ${commentRequests.length} comment API requests`, 
      commentRequests.length > 0);
    
    const successfulResponses = commentResponses.filter(r => r.status >= 200 && r.status < 300);
    
    this.addTestResult('API Responses', 
      `${successfulResponses.length}/${commentResponses.length} successful responses`, 
      successfulResponses.length === commentResponses.length);
  }

  async generateValidationReport() {
    console.log('📋 Generating validation report...');
    
    const report = {
      ...this.results,
      summary: {
        totalTests: this.results.passedTests + this.results.failedTests,
        passedTests: this.results.passedTests,
        failedTests: this.results.failedTests,
        successRate: this.results.passedTests + this.results.failedTests > 0 
          ? ((this.results.passedTests / (this.results.passedTests + this.results.failedTests)) * 100).toFixed(1) + '%'
          : '0%',
        criticalIssuesCount: this.results.criticalIssues.length,
        networkRequestsCount: this.results.networkLogs.filter(l => l.type === 'request').length,
        errorsCount: this.results.errors.length
      },
      conclusion: this.results.criticalIssues.length === 0 && this.results.failedTests === 0
        ? '✅ VALIDATION PASSED: Comment system is production ready'
        : '❌ VALIDATION FAILED: Issues found requiring attention'
    };
    
    // Save report
    const reportPath = '/workspaces/agent-feed/tests/production-comment-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 PRODUCTION COMMENT SYSTEM VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passedTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}`);
    console.log(`🚨 Critical Issues: ${report.summary.criticalIssuesCount}`);
    console.log(`📡 Network Requests: ${report.summary.networkRequestsCount}`);
    console.log(`⚠️ Console Errors: ${report.summary.errorsCount}`);
    console.log('='.repeat(80));
    console.log(`📋 Report saved to: ${reportPath}`);
    console.log('📸 Screenshots saved to: /workspaces/agent-feed/tests/');
    console.log('='.repeat(80));
    console.log(report.conclusion);
    console.log('='.repeat(80));
    
    return report;
  }

  async takeScreenshot(filename) {
    const screenshotPath = `/workspaces/agent-feed/tests/${filename}.png`;
    await this.page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    this.results.screenshots.push(screenshotPath);
    console.log(`📸 Screenshot saved: ${filename}.png`);
  }

  addTestResult(category, description, passed) {
    this.results.testResults.push({
      category,
      description,
      passed,
      timestamp: new Date().toISOString()
    });
    
    if (passed) {
      this.results.passedTests++;
    } else {
      this.results.failedTests++;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser cleanup completed');
    }
  }
}

// Run the validation
async function runValidation() {
  const validator = new ProductionCommentValidator();
  
  try {
    await validator.initialize();
    await validator.navigateToApplication();
    await validator.validateCommentButtonsExist();
    await validator.testCommentClickingAndLoading();
    await validator.validateCommentCounts();
    await validator.validateToggleFunctionality();
    await validator.validateAPIIntegration();
    
    const report = await validator.generateValidationReport();
    
    // Exit with appropriate code
    process.exit(report.summary.criticalIssuesCount === 0 && report.summary.failedTests === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed with critical error:', error);
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runValidation();
}

module.exports = { ProductionCommentValidator };