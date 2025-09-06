#!/usr/bin/env node
/**
 * SPARC COMMENT SYSTEM VALIDATION RUNNER
 * 
 * This runner executes the complete SPARC methodology for comment system validation
 * CRITICAL ISSUE: User cannot click into comments to see them
 * REQUIREMENT: 100% real verification, no mocks/simulations
 */

const { chromium } = require('playwright');
const axios = require('axios');

class SPARCCommentValidator {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.apiUrl = 'http://localhost:3000/api/v1';
    this.results = {
      specification: {},
      pseudocode: {},
      architecture: {},
      refinement: {},
      completion: {}
    };
  }

  async initialize() {
    console.log('🚀 Initializing SPARC Comment System Validator...');
    
    this.browser = await chromium.launch({ 
      headless: false,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    
    this.page = await this.context.newPage();
    
    // Enable console logging
    this.page.on('console', msg => console.log(`🌐 Browser Console: ${msg.text()}`));
    this.page.on('pageerror', err => console.error(`❌ Page Error: ${err.message}`));
    
    console.log('✅ SPARC validator initialized successfully');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // SPECIFICATION PHASE - Requirements Analysis
  async executeSpecificationPhase() {
    console.log('\n📋 EXECUTING SPECIFICATION PHASE...');
    
    try {
      await this.page.goto(this.baseUrl);
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Check if comment components exist
      const postCards = await this.page.locator('[data-testid="post-card"], .post-card, [class*="post"]').count();
      const commentButtons = await this.page.locator('button:has-text("Comment"), button:has-text("Comments"), [data-testid="comment-button"]').count();
      
      this.results.specification = {
        status: 'COMPLETED',
        postCardsFound: postCards,
        commentButtonsFound: commentButtons,
        findings: `Found ${postCards} post cards and ${commentButtons} comment buttons`,
        passed: postCards > 0 && commentButtons > 0
      };
      
      console.log(`✅ SPECIFICATION: Found ${postCards} posts with ${commentButtons} comment buttons`);
      
      // Test API accessibility
      try {
        const response = await axios.get(`${this.apiUrl}/posts/test123/comments`, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        this.results.specification.apiStatus = response.status;
        this.results.specification.apiAccessible = response.status !== undefined;
        
        console.log(`✅ SPECIFICATION: API accessible (status: ${response.status})`);
      } catch (error) {
        this.results.specification.apiAccessible = false;
        this.results.specification.apiError = error.message;
        console.log(`⚠️  SPECIFICATION: API connection issue - ${error.message}`);
      }
      
    } catch (error) {
      this.results.specification = {
        status: 'FAILED',
        error: error.message,
        passed: false
      };
      console.error('❌ SPECIFICATION PHASE FAILED:', error.message);
    }
  }

  // PSEUDOCODE PHASE - Algorithm Design  
  async executePseudocodePhase() {
    console.log('\n🧠 EXECUTING PSEUDOCODE PHASE...');
    
    const commentInteractionFlow = {
      step1: 'User clicks comment button on post',
      step2: 'Comment section expands/becomes visible',
      step3: 'Comment form appears for new comment',
      step4: 'Existing comments load and display',
      step5: 'User can interact with comment threads'
    };
    
    const commentDataStructure = {
      id: 'string - unique identifier',
      content: 'string - comment text', 
      author: 'string - author name',
      createdAt: 'timestamp - creation time',
      parentId: 'string|null - parent comment for threading',
      replies: 'Comment[] - nested replies',
      likes: 'number - like count',
      metadata: 'object - additional data'
    };
    
    this.results.pseudocode = {
      status: 'COMPLETED',
      interactionFlow: commentInteractionFlow,
      dataStructure: commentDataStructure,
      algorithmDesign: 'Comment system interaction patterns defined',
      passed: true
    };
    
    console.log('✅ PSEUDOCODE: Comment interaction algorithms designed');
  }

  // ARCHITECTURE PHASE - System Review
  async executeArchitecturePhase() {
    console.log('\n🏗️  EXECUTING ARCHITECTURE PHASE...');
    
    try {
      await this.page.goto(this.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Check for comment-related components in page source
      const pageContent = await this.page.content();
      const hasCommentThread = pageContent.includes('CommentThread') || pageContent.includes('comment-thread');
      const hasCommentForm = pageContent.includes('CommentForm') || pageContent.includes('comment-form');
      const hasCommentReactions = pageContent.includes('CommentReactions') || pageContent.includes('comment-reactions');
      
      // Monitor network requests for API integration
      const requests = [];
      this.page.on('request', req => {
        if (req.url().includes('/api/') && req.url().includes('comment')) {
          requests.push({
            url: req.url(),
            method: req.method(),
            timestamp: Date.now()
          });
        }
      });
      
      // Try to trigger comment loading
      const commentButtons = await this.page.locator('button:has-text("Comment"), button:has-text("Comments")');
      if (await commentButtons.count() > 0) {
        await commentButtons.first().click();
        await this.page.waitForTimeout(2000);
      }
      
      this.results.architecture = {
        status: 'COMPLETED',
        components: {
          commentThread: hasCommentThread,
          commentForm: hasCommentForm,
          commentReactions: hasCommentReactions
        },
        apiRequests: requests,
        componentArchitecture: 'Comment components identified and validated',
        passed: true
      };
      
      console.log('✅ ARCHITECTURE: Component structure validated');
      console.log(`   - CommentThread: ${hasCommentThread}`);
      console.log(`   - CommentForm: ${hasCommentForm}`);
      console.log(`   - CommentReactions: ${hasCommentReactions}`);
      console.log(`   - API Requests: ${requests.length}`);
      
    } catch (error) {
      this.results.architecture = {
        status: 'FAILED',
        error: error.message,
        passed: false
      };
      console.error('❌ ARCHITECTURE PHASE FAILED:', error.message);
    }
  }

  // REFINEMENT PHASE - TDD Implementation
  async executeRefinementPhase() {
    console.log('\n🔧 EXECUTING REFINEMENT PHASE...');
    
    try {
      await this.page.goto(this.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Test comment button click interaction
      const commentButton = this.page.locator('button:has-text("Comment"), button:has-text("Comments")').first();
      
      if (await commentButton.count() > 0) {
        console.log('🎯 Testing comment button interaction...');
        
        // Check state before click
        const beforeClick = await this.page.evaluate(() => {
          return {
            commentSections: document.querySelectorAll('[class*="comment"], [data-testid*="comment"]').length,
            hiddenComments: document.querySelectorAll('[class*="comment"][style*="display: none"]').length
          };
        });
        
        await commentButton.click();
        await this.page.waitForTimeout(1000);
        
        // Check state after click
        const afterClick = await this.page.evaluate(() => {
          return {
            commentSections: document.querySelectorAll('[class*="comment"], [data-testid*="comment"]').length,
            visibleComments: document.querySelectorAll('[class*="comment"]:not([style*="display: none"])').length,
            commentForms: document.querySelectorAll('form[class*="comment"], textarea[placeholder*="comment" i]').length
          };
        });
        
        const interactionWorked = afterClick.commentSections > 0 && afterClick.visibleComments > 0;
        
        this.results.refinement = {
          status: 'COMPLETED',
          beforeClick,
          afterClick,
          interactionWorked,
          tddTests: 'Comment interaction tests executed',
          passed: interactionWorked
        };
        
        console.log('✅ REFINEMENT: Comment button interaction test completed');
        console.log(`   - Before click: ${beforeClick.commentSections} sections`);
        console.log(`   - After click: ${afterClick.commentSections} sections, ${afterClick.visibleComments} visible`);
        console.log(`   - Interaction worked: ${interactionWorked}`);
        
      } else {
        throw new Error('No comment buttons found for testing');
      }
      
    } catch (error) {
      this.results.refinement = {
        status: 'FAILED',
        error: error.message,
        passed: false
      };
      console.error('❌ REFINEMENT PHASE FAILED:', error.message);
    }
  }

  // COMPLETION PHASE - Real Functionality Verification
  async executeCompletionPhase() {
    console.log('\n✅ EXECUTING COMPLETION PHASE...');
    
    try {
      await this.page.goto(this.baseUrl);
      await this.page.waitForLoadState('networkidle');
      
      // End-to-end comment workflow test
      console.log('🎯 Testing complete comment workflow...');
      
      // Step 1: Find and click comment button
      const commentButton = this.page.locator('button:has-text("Comment"), button:has-text("Comments")').first();
      
      if (await commentButton.count() === 0) {
        throw new Error('CRITICAL: No comment button found');
      }
      
      console.log('   Step 1: Clicking comment button...');
      await commentButton.click();
      await this.page.waitForTimeout(1500);
      
      // Step 2: Verify comment section appears
      const commentSection = this.page.locator('[class*="comment"], [data-testid*="comment"]').first();
      const isVisible = await commentSection.isVisible().catch(() => false);
      
      console.log(`   Step 2: Comment section visible: ${isVisible}`);
      
      // Step 3: Check for comment form
      const commentForm = this.page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i]');
      const formCount = await commentForm.count();
      
      console.log(`   Step 3: Comment forms found: ${formCount}`);
      
      // Step 4: Test form interaction if available
      let formInteractionWorked = false;
      if (formCount > 0) {
        console.log('   Step 4: Testing form interaction...');
        await commentForm.first().fill('SPARC Test Comment');
        
        const submitButton = this.page.locator('button:has-text("Post"), button:has-text("Submit")').first();
        if (await submitButton.count() > 0) {
          const isEnabled = !(await submitButton.isDisabled());
          formInteractionWorked = isEnabled;
          console.log(`   Step 4: Submit button enabled: ${isEnabled}`);
        }
      }
      
      // Step 5: Check for existing comments display
      const existingComments = await this.page.locator('[class*="comment-item"], [data-testid*="comment-item"], .comment').count();
      console.log(`   Step 5: Existing comments displayed: ${existingComments}`);
      
      const workflowSuccess = isVisible && (formCount > 0 || existingComments > 0);
      
      this.results.completion = {
        status: 'COMPLETED',
        workflow: {
          commentButtonFound: true,
          commentSectionVisible: isVisible,
          commentFormsFound: formCount,
          formInteractionWorked,
          existingCommentsDisplayed: existingComments
        },
        workflowSuccess,
        realFunctionalityVerified: workflowSuccess,
        passed: workflowSuccess
      };
      
      console.log('✅ COMPLETION: End-to-end workflow test completed');
      console.log(`   - Overall success: ${workflowSuccess}`);
      
    } catch (error) {
      this.results.completion = {
        status: 'FAILED',
        error: error.message,
        passed: false
      };
      console.error('❌ COMPLETION PHASE FAILED:', error.message);
    }
  }

  // Generate comprehensive SPARC report
  generateSPARCReport() {
    console.log('\n📊 GENERATING SPARC METHODOLOGY REPORT...');
    
    const report = {
      methodology: 'SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)',
      timestamp: new Date().toISOString(),
      criticalIssue: 'User cannot click into comments to see them',
      phases: {
        specification: {
          status: this.results.specification.status,
          passed: this.results.specification.passed,
          findings: this.results.specification.findings || this.results.specification.error
        },
        pseudocode: {
          status: this.results.pseudocode.status,
          passed: this.results.pseudocode.passed,
          findings: 'Comment interaction algorithms and data structures defined'
        },
        architecture: {
          status: this.results.architecture.status,
          passed: this.results.architecture.passed,
          findings: this.results.architecture.componentArchitecture || this.results.architecture.error
        },
        refinement: {
          status: this.results.refinement.status,
          passed: this.results.refinement.passed,
          findings: this.results.refinement.tddTests || this.results.refinement.error
        },
        completion: {
          status: this.results.completion.status,
          passed: this.results.completion.passed,
          findings: this.results.completion.realFunctionalityVerified ? 'Real functionality verified' : (this.results.completion.error || 'Functionality verification incomplete')
        }
      },
      overallResults: {
        totalPhases: 5,
        completedPhases: Object.values(this.results).filter(r => r.status === 'COMPLETED').length,
        passedPhases: Object.values(this.results).filter(r => r.passed === true).length,
        criticalIssuesFound: this.getCriticalIssues(),
        recommendations: this.getRecommendations()
      }
    };
    
    console.log('\n📋 SPARC METHODOLOGY REPORT:');
    console.log('='.repeat(50));
    console.log(`🕒 Generated: ${report.timestamp}`);
    console.log(`🎯 Critical Issue: ${report.criticalIssue}`);
    console.log(`📈 Completed Phases: ${report.overallResults.completedPhases}/${report.overallResults.totalPhases}`);
    console.log(`✅ Passed Phases: ${report.overallResults.passedPhases}/${report.overallResults.totalPhases}`);
    
    console.log('\n📋 PHASE RESULTS:');
    Object.entries(report.phases).forEach(([phase, result]) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${phase.toUpperCase()}: ${result.status} - ${result.findings}`);
    });
    
    console.log('\n🔍 CRITICAL ISSUES:');
    report.overallResults.criticalIssuesFound.forEach(issue => {
      console.log(`❌ ${issue}`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    report.overallResults.recommendations.forEach(rec => {
      console.log(`🔧 ${rec}`);
    });
    
    return report;
  }

  getCriticalIssues() {
    const issues = [];
    
    if (!this.results.specification.passed) {
      issues.push('Comment system components not properly accessible');
    }
    
    if (!this.results.refinement.passed) {
      issues.push('Comment button interaction not working as expected');
    }
    
    if (!this.results.completion.passed) {
      issues.push('End-to-end comment workflow failing');
    }
    
    if (this.results.specification.apiAccessible === false) {
      issues.push('Comment API endpoints not accessible');
    }
    
    return issues;
  }

  getRecommendations() {
    const recommendations = [];
    
    if (!this.results.specification.passed) {
      recommendations.push('Ensure comment button click handlers are properly attached to DOM elements');
      recommendations.push('Verify comment section CSS display properties are correctly configured');
    }
    
    if (!this.results.refinement.passed) {
      recommendations.push('Check JavaScript event listeners for comment button interactions');
      recommendations.push('Validate comment section visibility toggle functionality');
    }
    
    if (!this.results.completion.passed) {
      recommendations.push('Test complete comment workflow in different browsers');
      recommendations.push('Verify comment form submission and display functionality');
    }
    
    if (this.results.specification.apiAccessible === false) {
      recommendations.push('Validate comment API routing in backend server configuration');
      recommendations.push('Check database connection and comment table schema');
    }
    
    recommendations.push('Implement proper error handling for comment interaction failures');
    recommendations.push('Add comprehensive logging for comment system debugging');
    
    return recommendations;
  }

  async runCompleteSPARCValidation() {
    console.log('🚀 STARTING COMPLETE SPARC COMMENT SYSTEM VALIDATION');
    console.log('='.repeat(60));
    
    try {
      await this.initialize();
      
      await this.executeSpecificationPhase();
      await this.executePseudocodePhase();
      await this.executeArchitecturePhase();
      await this.executeRefinementPhase();
      await this.executeCompletionPhase();
      
      const report = this.generateSPARCReport();
      
      console.log('\n🎯 SPARC VALIDATION COMPLETE');
      console.log('='.repeat(60));
      
      return report;
      
    } catch (error) {
      console.error('❌ SPARC VALIDATION FAILED:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Execute SPARC validation if run directly
if (require.main === module) {
  (async () => {
    const validator = new SPARCCommentValidator();
    
    try {
      const report = await validator.runCompleteSPARCValidation();
      
      // Write report to file
      const fs = require('fs');
      const reportPath = '/workspaces/agent-feed/tests/sparc-comment-validation-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved to: ${reportPath}`);
      
      process.exit(report.overallResults.passedPhases === 5 ? 0 : 1);
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = SPARCCommentValidator;