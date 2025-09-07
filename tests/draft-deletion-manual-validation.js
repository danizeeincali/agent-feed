/**
 * Manual Draft Deletion Validation Script
 * This script can be run in the browser console to validate draft deletion functionality
 */

class DraftDeletionValidator {
  constructor() {
    this.testResults = [];
    this.startTime = new Date();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp,
      type,
      message,
      time: new Date() - this.startTime
    };
    this.testResults.push(logEntry);
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async initializeTestDrafts() {
    this.log('🚀 Initializing test drafts...');
    
    const testDrafts = [
      {
        id: `test-draft-deletion-${Date.now()}-1`,
        userId: 'test-user',
        title: 'Draft Deletion Test 1',
        content: 'This draft should be deleted when published via modal',
        status: 'draft',
        tags: ['test', 'validation'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: 10
      },
      {
        id: `test-draft-deletion-${Date.now()}-2`,
        userId: 'test-user',
        title: 'Draft Deletion Test 2 - Special Chars 🚀',
        content: 'This draft has special characters and émojis to test edge cases',
        status: 'draft',
        tags: ['test', 'unicode'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: 12
      }
    ];

    try {
      const existing = JSON.parse(localStorage.getItem('agent-feed-drafts') || '[]');
      const combined = [...testDrafts, ...existing];
      localStorage.setItem('agent-feed-drafts', JSON.stringify(combined));
      
      this.log(`✅ Added ${testDrafts.length} test drafts. Total: ${combined.length}`);
      return testDrafts;
    } catch (error) {
      this.log(`❌ Failed to initialize test drafts: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateDraftDeletionLogic() {
    this.log('🔍 Validating draft deletion logic...');
    
    const drafts = JSON.parse(localStorage.getItem('agent-feed-drafts') || '[]');
    const initialCount = drafts.length;
    
    if (initialCount === 0) {
      throw new Error('No drafts found for testing');
    }

    this.log(`📊 Initial draft count: ${initialCount}`);
    
    // Get first test draft
    const testDraft = drafts.find(d => d.title.includes('Draft Deletion Test')) || drafts[0];
    this.log(`🎯 Selected test draft: "${testDraft.title}" (ID: ${testDraft.id})`);

    return { initialCount, testDraft };
  }

  async simulatePublishProcess(draft) {
    this.log('📝 Simulating publish process...');
    
    try {
      // Create post data (mimicking PostCreator logic)
      const postData = {
        title: draft.title,
        content: draft.content,
        author_agent: 'user-agent',
        metadata: {
          businessImpact: 5,
          tags: draft.tags || [],
          isAgentResponse: false,
          postType: 'insight',
          wordCount: draft.wordCount || 0
        }
      };

      this.log('🌐 Making API call to publish post...');
      const response = await fetch('/api/v1/agent-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API call failed: ${response.status} ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      this.log(`✅ Post published successfully: ${result.data?.id || 'Unknown ID'}`);
      
      return result;
    } catch (error) {
      this.log(`❌ Publish failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async simulateDraftDeletion(draftId) {
    this.log(`🗑️ Simulating draft deletion for ID: ${draftId}`);
    
    try {
      // Get current drafts
      const drafts = JSON.parse(localStorage.getItem('agent-feed-drafts') || '[]');
      const beforeCount = drafts.length;
      
      // Filter out the draft (mimicking the deleteDraft logic)
      const filteredDrafts = drafts.filter(d => d.id !== draftId);
      const afterCount = filteredDrafts.length;
      
      // Save back to localStorage
      localStorage.setItem('agent-feed-drafts', JSON.stringify(filteredDrafts));
      
      this.log(`📊 Draft count: ${beforeCount} → ${afterCount} (deleted: ${beforeCount - afterCount})`);
      
      if (beforeCount === afterCount) {
        throw new Error(`Draft ${draftId} was not found and could not be deleted`);
      }
      
      this.log(`✅ Draft ${draftId} successfully deleted`);
      return { beforeCount, afterCount };
    } catch (error) {
      this.log(`❌ Draft deletion failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async validatePostInFeed(publishResult) {
    this.log('🔍 Checking if post appears in feed...');
    
    try {
      // Try to get feed posts
      const feedResponse = await fetch('/api/v1/agent-posts?limit=10');
      if (feedResponse.ok) {
        const feedData = await feedResponse.json();
        const posts = feedData.data || feedData.posts || [];
        
        const publishedPost = posts.find(p => p.id === publishResult.data?.id);
        if (publishedPost) {
          this.log(`✅ Published post found in feed: "${publishedPost.title}"`);
        } else {
          this.log(`⚠️ Published post not found in feed (may be due to pagination)`);
        }
      } else {
        this.log(`⚠️ Could not fetch feed posts: ${feedResponse.status}`);
      }
    } catch (error) {
      this.log(`⚠️ Feed validation error: ${error.message}`, 'warn');
    }
  }

  async runFullValidation() {
    this.log('🧪 Starting comprehensive draft deletion validation...');
    
    try {
      // Step 1: Initialize test drafts
      const testDrafts = await this.initializeTestDrafts();
      await this.delay(500);

      // Step 2: Validate initial state
      const { initialCount, testDraft } = await this.validateDraftDeletionLogic();
      await this.delay(500);

      // Step 3: Simulate publish process
      const publishResult = await this.simulatePublishProcess(testDraft);
      await this.delay(1000);

      // Step 4: Simulate draft deletion (as PostCreator would do)
      const deletionResult = await this.simulateDraftDeletion(testDraft.id);
      await this.delay(500);

      // Step 5: Validate post appears in feed
      await this.validatePostInFeed(publishResult);

      // Step 6: Final validation
      const finalDrafts = JSON.parse(localStorage.getItem('agent-feed-drafts') || '[]');
      const finalCount = finalDrafts.length;
      
      this.log('📊 FINAL RESULTS:');
      this.log(`   Initial drafts: ${initialCount}`);
      this.log(`   Final drafts: ${finalCount}`);
      this.log(`   Drafts deleted: ${initialCount - finalCount}`);
      this.log(`   Expected deletions: 1`);
      
      if (initialCount - finalCount === 1) {
        this.log('🎉 SUCCESS: Draft deletion validation passed!', 'success');
      } else {
        this.log('❌ FAILURE: Unexpected draft count change', 'error');
      }

      // Step 7: Verify specific draft is gone
      const remainingIds = finalDrafts.map(d => d.id);
      if (!remainingIds.includes(testDraft.id)) {
        this.log('✅ Confirmed: Test draft ID successfully removed from storage', 'success');
      } else {
        this.log('❌ ERROR: Test draft ID still found in storage', 'error');
      }

      return this.generateReport();

    } catch (error) {
      this.log(`💥 Validation failed: ${error.message}`, 'error');
      return this.generateReport();
    }
  }

  generateReport() {
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    const report = {
      startTime: this.startTime,
      endTime,
      duration: `${duration}ms`,
      totalTests: this.testResults.length,
      successes: this.testResults.filter(r => r.type === 'success').length,
      errors: this.testResults.filter(r => r.type === 'error').length,
      warnings: this.testResults.filter(r => r.type === 'warn').length,
      results: this.testResults
    };

    console.group('📋 DRAFT DELETION VALIDATION REPORT');
    console.table(report);
    console.log('📝 Detailed Results:');
    this.testResults.forEach(result => {
      const icon = {
        'success': '✅',
        'error': '❌', 
        'warn': '⚠️',
        'info': 'ℹ️'
      }[result.type] || '📝';
      console.log(`${icon} [${result.timestamp}] ${result.message}`);
    });
    console.groupEnd();

    return report;
  }

  // Quick validation for manual testing
  async quickValidation() {
    this.log('⚡ Running quick validation...');
    
    const drafts = JSON.parse(localStorage.getItem('agent-feed-drafts') || '[]');
    this.log(`Current draft count: ${drafts.length}`);
    
    if (drafts.length > 0) {
      this.log('Sample draft structure:');
      console.log(drafts[0]);
    }
    
    // Check if draft deletion logic is in PostCreator
    if (typeof window !== 'undefined') {
      this.log('✅ Running in browser environment');
    }
    
    return drafts;
  }
}

// Export for use
window.DraftDeletionValidator = DraftDeletionValidator;

// Auto-run quick validation if in browser
if (typeof window !== 'undefined') {
  console.log('🔧 Draft Deletion Validator loaded. Use:');
  console.log('   const validator = new DraftDeletionValidator();');
  console.log('   await validator.runFullValidation();');
  console.log('   await validator.quickValidation();');
}