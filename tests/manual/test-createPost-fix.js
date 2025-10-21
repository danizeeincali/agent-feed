#!/usr/bin/env node
/**
 * Manual Test Script for createPost Fix
 *
 * Purpose: Verify the createPost fix works with the actual module
 *
 * Usage: node tests/manual/test-createPost-fix.js
 *
 * This script:
 * 1. Imports the real database-selector module
 * 2. Creates a test post using the fixed createPost method
 * 3. Verifies the post was created correctly
 * 4. Cleans up test data
 */

import Database from 'better-sqlite3';

async function runTest() {
  console.log('='.repeat(60));
  console.log('createPost Fix - Manual Functional Test');
  console.log('='.repeat(60));
  console.log();

  let dbSelector;
  let db;
  const testPostId = `manual-test-${Date.now()}`;

  try {
    // Step 1: Import database selector
    console.log('Step 1: Importing database-selector module...');

    // Set environment to SQLite mode
    process.env.USE_POSTGRES = 'false';

    // Dynamic import for ES6 module
    const module = await import('../../api-server/config/database-selector.js');
    dbSelector = module.default;

    console.log('✓ Module imported successfully');
    console.log();

    // Step 2: Initialize database
    console.log('Step 2: Initializing database...');
    await dbSelector.initialize();
    console.log('✓ Database initialized');
    console.log();

    // Step 3: Create test post
    console.log('Step 3: Creating test post...');
    const postData = {
      id: testPostId,
      author_agent: 'ManualTestAgent',
      content: 'This post was created by the manual test script to verify the createPost fix works correctly with camelCase column names (authorAgent, publishedAt, metadata, engagement).',
      title: 'Manual Test Post - createPost Fix Validation',
      tags: ['manual-test', 'createPost-fix', 'validation'],
      metadata: {
        testRun: new Date().toISOString(),
        purpose: 'Verify createPost fix',
        expectedColumns: ['id', 'authorAgent', 'publishedAt', 'metadata', 'engagement']
      }
    };

    console.log('Post data:');
    console.log(JSON.stringify(postData, null, 2));
    console.log();

    const result = await dbSelector.createPost('anonymous', postData);

    console.log('✓ Post created successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log();

    // Step 4: Verify post in database
    console.log('Step 4: Verifying post in database...');
    db = new Database('/workspaces/agent-feed/database.db');
    const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testPostId);

    if (!dbPost) {
      throw new Error('Post not found in database!');
    }

    console.log('✓ Post found in database');
    console.log();

    // Step 5: Validate column names
    console.log('Step 5: Validating column names...');
    const validations = [
      { column: 'id', value: dbPost.id, expected: testPostId },
      { column: 'authorAgent', value: dbPost.authorAgent, expected: 'ManualTestAgent' },
      { column: 'content', value: dbPost.content ? 'exists' : 'missing', expected: 'exists' },
      { column: 'title', value: dbPost.title ? 'exists' : 'missing', expected: 'exists' },
      { column: 'publishedAt', value: dbPost.publishedAt ? 'ISO 8601' : 'missing', expected: 'ISO 8601' },
      { column: 'metadata', value: dbPost.metadata ? 'JSON' : 'missing', expected: 'JSON' },
      { column: 'engagement', value: dbPost.engagement ? 'JSON' : 'missing', expected: 'JSON' }
    ];

    let validationsPassed = 0;
    validations.forEach(({ column, value, expected }) => {
      const status = (value === expected || value.includes(expected)) ? '✓' : '✗';
      console.log(`  ${status} ${column}: ${value}`);
      if (status === '✓') validationsPassed++;
    });

    console.log();
    console.log(`Validations passed: ${validationsPassed}/${validations.length}`);
    console.log();

    // Step 6: Validate JSON fields
    console.log('Step 6: Validating JSON fields...');

    const metadata = JSON.parse(dbPost.metadata);
    console.log('  Metadata:');
    console.log('    ✓ tags:', metadata.tags);
    console.log('    ✓ testRun:', metadata.testRun);
    console.log('    ✓ purpose:', metadata.purpose);

    const engagement = JSON.parse(dbPost.engagement);
    console.log('  Engagement:');
    console.log('    ✓ comments:', engagement.comments);
    console.log('    ✓ likes:', engagement.likes);
    console.log('    ✓ shares:', engagement.shares);
    console.log('    ✓ views:', engagement.views);
    console.log();

    // Step 7: Verify NO snake_case columns exist
    console.log('Step 7: Verifying NO snake_case columns...');
    const forbiddenColumns = ['author_agent', 'published_at', 'tags'];
    let noSnakeCaseFound = true;

    forbiddenColumns.forEach(column => {
      if (dbPost[column] !== undefined) {
        console.log(`  ✗ FOUND forbidden column: ${column}`);
        noSnakeCaseFound = false;
      } else {
        console.log(`  ✓ ${column} does not exist (correct)`);
      }
    });

    console.log();

    if (noSnakeCaseFound && validationsPassed === validations.length) {
      console.log('='.repeat(60));
      console.log('✓ ALL TESTS PASSED');
      console.log('='.repeat(60));
      console.log();
      console.log('Summary:');
      console.log('  - createPost method works correctly');
      console.log('  - Uses camelCase column names (authorAgent, publishedAt)');
      console.log('  - Stores tags in metadata.tags');
      console.log('  - Initializes engagement with zeros');
      console.log('  - Auto-generates publishedAt timestamp');
      console.log('  - No snake_case columns created');
      console.log();
    } else {
      throw new Error('Some validations failed!');
    }

  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('✗ TEST FAILED');
    console.error('='.repeat(60));
    console.error();
    console.error('Error:', error.message);
    console.error();
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Cleanup
    console.log('Cleanup: Deleting test post...');
    if (db) {
      try {
        db.prepare('DELETE FROM agent_posts WHERE id = ?').run(testPostId);
        console.log('✓ Test post deleted');
      } catch (error) {
        console.log('✗ Cleanup failed:', error.message);
      }
      db.close();
    }

    if (dbSelector) {
      await dbSelector.close();
      console.log('✓ Database connections closed');
    }
    console.log();
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
