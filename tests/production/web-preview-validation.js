/**
 * Web Preview Functionality Production Validation Test
 * Tests all web preview features including YouTube embedding, article previews, and thumbnails
 */

const fs = require('fs');
const path = require('path');

class WebPreviewValidator {
  constructor() {
    this.results = {
      testStartTime: new Date().toISOString(),
      testPosts: [],
      validationResults: [],
      issues: [],
      performance: {},
      accessibility: {},
      screenshots: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  // Create comprehensive test posts with different URL types
  async createTestPosts() {
    const testPosts = [
      {
        title: "Amazing Coding Tutorial Video",
        content: "Check out this comprehensive coding tutorial that covers advanced JavaScript concepts and best practices. https://www.youtube.com/watch?v=dQw4w9WgXcQ #JavaScript #Tutorial #WebDev",
        authorAgent: "ProductionValidator",
        tags: ["JavaScript", "Tutorial", "WebDev"],
        metadata: {
          businessImpact: 85
        }
      },
      {
        title: "Interesting Article on AI Development", 
        content: "This article discusses the latest trends in AI development and machine learning. Worth reading for developers interested in ML integration. https://www.wired.com/story/ai-development-trends/ @AI_Developer #AI #MachineLearning #Development",
        authorAgent: "ProductionValidator",
        tags: ["AI", "MachineLearning", "Development"],
        metadata: {
          businessImpact: 92
        }
      },
      {
        title: "Real-time Data Sync Implementation",
        content: "Implemented real-time data synchronization using WebSocket connections. The solution handles concurrent users efficiently with proper error handling and reconnection logic. Performance improved by 40% compared to polling approach. #RealTime #WebSocket #Performance",
        authorAgent: "ProductionValidator", 
        tags: ["RealTime", "WebSocket", "Performance"],
        metadata: {
          businessImpact: 78
        }
      },
      {
        title: "GitHub Repository Example",
        content: "Check out this excellent open-source project for React components. Great examples of clean architecture and testing patterns. https://github.com/facebook/react #OpenSource #React #GitHub",
        authorAgent: "ProductionValidator",
        tags: ["OpenSource", "React", "GitHub"],
        metadata: {
          businessImpact: 67
        }
      },
      {
        title: "Image Preview Test",
        content: "Testing image preview functionality with a sample image. Should display as an image preview with proper metadata. https://picsum.photos/800/400 #ImageTesting #WebPreview",
        authorAgent: "ProductionValidator",
        tags: ["ImageTesting", "WebPreview"],
        metadata: {
          businessImpact: 45
        }
      },
      {
        title: "Multiple URLs Test",
        content: "This post contains multiple URLs to test preview handling: YouTube video https://www.youtube.com/watch?v=ScMzIvxBSi4 and article https://medium.com/@test/example-article and GitHub repo https://github.com/test/repo #MultipleLinks #Testing",
        authorAgent: "ProductionValidator",
        tags: ["MultipleLinks", "Testing"],
        metadata: {
          businessImpact: 55
        }
      },
      {
        title: "Error Handling Test",
        content: "Testing error handling with invalid URLs: https://invalid-domain-12345.com/nonexistent and https://broken-link.test/404 #ErrorHandling #Testing",
        authorAgent: "ProductionValidator",
        tags: ["ErrorHandling", "Testing"],
        metadata: {
          businessImpact: 60
        }
      }
    ];

    console.log('Creating test posts for web preview validation...');
    
    for (const post of testPosts) {
      try {
        const response = await fetch('http://localhost:3001/api/v1/agent-posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(post)
        });

        if (response.ok) {
          const createdPost = await response.json();
          this.results.testPosts.push({
            id: createdPost.id || createdPost.data?.id,
            title: post.title,
            content: post.content,
            created: true,
            timestamp: new Date().toISOString()
          });
          console.log(`✅ Created test post: ${post.title}`);
        } else {
          console.log(`❌ Failed to create test post: ${post.title} - ${response.status}`);
          this.results.issues.push({
            type: 'post_creation_failed',
            post: post.title,
            status: response.status,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`❌ Error creating test post ${post.title}:`, error.message);
        this.results.issues.push({
          type: 'post_creation_error', 
          post: post.title,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return this.results.testPosts;
  }

  // Validate that posts are visible in the feed
  async validatePostsInFeed() {
    console.log('\n📋 Validating posts appear in feed...');
    
    try {
      const response = await fetch('http://localhost:3001/api/v1/agent-posts?limit=20&offset=0');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const posts = Array.isArray(data) ? data : (data.data || []);
      
      console.log(`Found ${posts.length} posts in feed`);
      
      // Check if our test posts are present
      const testPostTitles = this.results.testPosts.map(p => p.title);
      const foundPosts = posts.filter(post => testPostTitles.includes(post.title));
      
      this.results.validationResults.push({
        test: 'posts_in_feed',
        passed: foundPosts.length === this.results.testPosts.length,
        expected: this.results.testPosts.length,
        actual: foundPosts.length,
        details: `Found ${foundPosts.length} of ${this.results.testPosts.length} test posts in feed`,
        timestamp: new Date().toISOString()
      });

      if (foundPosts.length === this.results.testPosts.length) {
        console.log('✅ All test posts found in feed');
        return true;
      } else {
        console.log(`⚠️  Found ${foundPosts.length} of ${this.results.testPosts.length} test posts`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error validating posts in feed:', error.message);
      this.results.issues.push({
        type: 'feed_validation_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  // Test link preview API endpoint
  async testLinkPreviewAPI() {
    console.log('\n🔗 Testing link preview API...');
    
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.wired.com/story/ai-development-trends/', 
      'https://github.com/facebook/react',
      'https://picsum.photos/800/400'
    ];

    for (const url of testUrls) {
      try {
        const response = await fetch(`http://localhost:3001/api/v1/link-preview?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        this.results.validationResults.push({
          test: 'link_preview_api',
          url: url,
          passed: response.ok && data.title,
          status: response.status,
          hasTitle: !!data.title,
          hasDescription: !!data.description,
          hasImage: !!data.image,
          hasType: !!data.type,
          timestamp: new Date().toISOString()
        });

        console.log(`${response.ok && data.title ? '✅' : '❌'} ${url}: ${data.title || 'No title'}`);
      } catch (error) {
        console.error(`❌ Error testing preview for ${url}:`, error.message);
        this.results.issues.push({
          type: 'preview_api_error',
          url: url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Performance testing
  async testPerformance() {
    console.log('\n⚡ Testing performance impact...');
    
    const startTime = Date.now();
    
    try {
      // Test feed loading time with previews
      const feedStart = Date.now();
      const response = await fetch('http://localhost:3001/api/v1/agent-posts?limit=10&offset=0');
      const feedEnd = Date.now();
      const feedLoadTime = feedEnd - feedStart;
      
      // Test multiple concurrent preview requests
      const previewStart = Date.now();
      const previewPromises = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.wired.com/story/test',
        'https://github.com/test/repo'
      ].map(url => 
        fetch(`http://localhost:3001/api/v1/link-preview?url=${encodeURIComponent(url)}`)
      );
      
      await Promise.all(previewPromises);
      const previewEnd = Date.now();
      const previewLoadTime = previewEnd - previewStart;
      
      this.results.performance = {
        feedLoadTime: feedLoadTime,
        previewLoadTime: previewLoadTime,
        totalTestTime: Date.now() - startTime,
        feedLoadAcceptable: feedLoadTime < 2000,
        previewLoadAcceptable: previewLoadTime < 5000,
        timestamp: new Date().toISOString()
      };

      console.log(`📊 Feed load time: ${feedLoadTime}ms ${feedLoadTime < 2000 ? '✅' : '⚠️'}`);
      console.log(`📊 Preview load time: ${previewLoadTime}ms ${previewLoadTime < 5000 ? '✅' : '⚠️'}`);
      
    } catch (error) {
      console.error('❌ Performance test error:', error.message);
      this.results.issues.push({
        type: 'performance_test_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Generate validation report
  generateReport() {
    // Calculate summary statistics
    const validationTests = this.results.validationResults;
    this.results.summary = {
      totalTests: validationTests.length,
      passed: validationTests.filter(t => t.passed).length,
      failed: validationTests.filter(t => !t.passed).length,
      warnings: this.results.issues.length,
      testDuration: Date.now() - new Date(this.results.testStartTime).getTime()
    };

    const report = {
      testInfo: {
        title: 'Web Preview Functionality Production Validation',
        timestamp: this.results.testStartTime,
        duration: this.results.summary.testDuration,
        testPostsCreated: this.results.testPosts.length
      },
      summary: this.results.summary,
      testResults: {
        postCreation: {
          created: this.results.testPosts.length,
          details: this.results.testPosts.map(p => ({ title: p.title, id: p.id }))
        },
        linkPreviewAPI: {
          tests: this.results.validationResults.filter(t => t.test === 'link_preview_api'),
          passed: this.results.validationResults.filter(t => t.test === 'link_preview_api' && t.passed).length
        },
        feedValidation: {
          tests: this.results.validationResults.filter(t => t.test === 'posts_in_feed'),
          passed: this.results.validationResults.filter(t => t.test === 'posts_in_feed' && t.passed).length
        }
      },
      performance: this.results.performance,
      issues: this.results.issues,
      detailedResults: this.results.validationResults
    };

    console.log('\n📋 WEB PREVIEW VALIDATION SUMMARY');
    console.log('=====================================');
    console.log(`✅ Tests Passed: ${this.results.summary.passed}`);
    console.log(`❌ Tests Failed: ${this.results.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`📝 Test Posts Created: ${this.results.testPosts.length}`);
    console.log(`⏱️  Total Duration: ${Math.round(this.results.summary.testDuration / 1000)}s`);
    
    if (this.results.performance.feedLoadTime) {
      console.log(`⚡ Feed Load Time: ${this.results.performance.feedLoadTime}ms`);
      console.log(`⚡ Preview Load Time: ${this.results.performance.previewLoadTime}ms`);
    }

    return report;
  }

  // Run all validation tests
  async runValidation() {
    console.log('🚀 Starting Web Preview Functionality Validation');
    console.log('=================================================\n');

    try {
      // Create test posts
      await this.createTestPosts();
      
      // Wait for posts to be available
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Validate posts appear in feed
      await this.validatePostsInFeed();
      
      // Test link preview API
      await this.testLinkPreviewAPI();
      
      // Performance testing
      await this.testPerformance();
      
      // Generate and return report
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Validation error:', error);
      this.results.issues.push({
        type: 'validation_error',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return this.generateReport();
    }
  }
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebPreviewValidator };
}

// Run validation if called directly
if (require.main === module) {
  const validator = new WebPreviewValidator();
  validator.runValidation()
    .then(report => {
      // Save detailed report
      const reportPath = path.join(__dirname, 'web-preview-validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      // Exit with appropriate code
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}