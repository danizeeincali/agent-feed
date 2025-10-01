#!/usr/bin/env node

// NLD Browser Validation Script - Verify engagement/metadata fix
// Checks for zero console errors, valid data structure

import fetch from 'node-fetch';

async function verifyEngagementFix() {
  console.log('🔍 NLD VALIDATION: Engagement/Metadata Fix');
  console.log('═'.repeat(60));

  try {
    const response = await fetch('http://localhost:3001/api/v1/agent-posts');
    const data = await response.json();

    if (!data.success || !data.data) {
      console.error('❌ API Error: Invalid response structure');
      process.exit(1);
    }

    const posts = data.data;
    console.log(`\n✓ Found ${posts.length} posts\n`);

    let errorCount = 0;
    let successCount = 0;

    // Validate each post
    posts.forEach((post, index) => {
      console.log(`\nPost ${index + 1}: "${post.title}"`);
      console.log('─'.repeat(60));

      // Check engagement object
      if (!post.engagement) {
        console.error(`  ❌ Missing engagement object`);
        errorCount++;
      } else {
        console.log(`  ✓ Has engagement object`);
        console.log(`    - comments: ${post.engagement.comments}`);
        console.log(`    - saves: ${post.engagement.saves}`);
        console.log(`    - shares: ${post.engagement.shares}`);
        console.log(`    - views: ${post.engagement.views}`);
        console.log(`    - isSaved: ${post.engagement.isSaved}`);
        successCount++;
      }

      // Check metadata object
      if (!post.metadata) {
        console.error(`  ❌ Missing metadata object`);
        errorCount++;
      } else {
        console.log(`  ✓ Has metadata object`);
        console.log(`    - businessImpact: ${post.metadata.businessImpact}`);
        console.log(`    - confidence_score: ${post.metadata.confidence_score}`);
        successCount++;
      }

      // Check other required fields
      const requiredFields = ['authorAgentName', 'publishedAt', 'updatedAt', 'category', 'priority', 'visibility'];
      requiredFields.forEach(field => {
        if (!post[field]) {
          console.error(`  ❌ Missing field: ${field}`);
          errorCount++;
        } else {
          console.log(`  ✓ Has ${field}: ${post[field]}`);
          successCount++;
        }
      });
    });

    console.log('\n' + '═'.repeat(60));
    console.log('VALIDATION RESULTS:');
    console.log('═'.repeat(60));
    console.log(`✅ Success: ${successCount} checks passed`);
    console.log(`❌ Errors: ${errorCount} checks failed`);

    if (errorCount === 0) {
      console.log('\n🎉 100% VALIDATION PASSED - NO ERRORS');
      console.log('✓ All posts have engagement objects');
      console.log('✓ All posts have metadata objects');
      console.log('✓ All required fields present');
      console.log('✓ Ready for browser testing');
      process.exit(0);
    } else {
      console.error('\n❌ VALIDATION FAILED - ERRORS FOUND');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Validation Error:', error.message);
    process.exit(1);
  }
}

verifyEngagementFix();
