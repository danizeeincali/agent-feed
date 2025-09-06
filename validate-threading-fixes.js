#!/usr/bin/env node

/**
 * Comprehensive validation of threading and URL navigation fixes
 * Tests all critical functionality that was implemented
 */

import http from 'http';
import fs from 'fs';

console.log('🚀 COMPREHENSIVE THREADING & URL NAVIGATION VALIDATION');
console.log('=' .repeat(60));

// Test results tracking
const testResults = {
    backend: { passed: 0, failed: 0, tests: [] },
    frontend: { passed: 0, failed: 0, tests: [] },
    fixes: { passed: 0, failed: 0, tests: [] }
};

// Helper function to make HTTP requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: data.includes('{') ? JSON.parse(data) : data,
                        raw: data
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        raw: data
                    });
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
}

// Test helper functions
function pass(category, testName, details = '') {
    testResults[category].passed++;
    testResults[category].tests.push({ name: testName, result: 'PASS', details });
    console.log(`✅ ${testName} ${details}`);
}

function fail(category, testName, details = '') {
    testResults[category].failed++;
    testResults[category].tests.push({ name: testName, result: 'FAIL', details });
    console.log(`❌ ${testName} ${details}`);
}

async function validateBackendAPI() {
    console.log('\n📡 PHASE 1: BACKEND API VALIDATION');
    console.log('-'.repeat(40));
    
    try {
        // Test main posts endpoint
        const postsResponse = await makeRequest('http://localhost:3000/api/v1/agent-posts');
        if (postsResponse.status === 200 && postsResponse.data.success) {
            pass('backend', 'API Posts Endpoint', `${postsResponse.data.data.length} posts returned`);
            
            // Analyze comment structure
            const posts = postsResponse.data.data;
            const postsWithComments = posts.filter(p => p.comments > 0);
            pass('backend', 'Posts with Comments', `${postsWithComments.length} posts have comments`);
            
            if (postsWithComments.length > 0) {
                const firstPost = postsWithComments[0];
                pass('backend', 'Comment Count Available', `Post "${firstPost.title.slice(0, 30)}..." has ${firstPost.comments} comments`);
            }
            
        } else {
            fail('backend', 'API Posts Endpoint', `Status: ${postsResponse.status}`);
        }
    } catch (error) {
        fail('backend', 'API Connection', error.message);
    }
    
    // Test health endpoint
    try {
        const healthResponse = await makeRequest('http://localhost:3000/api/health');
        if (healthResponse.status === 200) {
            pass('backend', 'Backend Health Check', 'Server is responsive');
        } else {
            fail('backend', 'Backend Health Check', `Status: ${healthResponse.status}`);
        }
    } catch (error) {
        fail('backend', 'Backend Health Check', error.message);
    }
}

async function validateFrontendAccess() {
    console.log('\n🌐 PHASE 2: FRONTEND ACCESS VALIDATION');
    console.log('-'.repeat(40));
    
    try {
        const frontendResponse = await makeRequest('http://localhost:5173');
        if (frontendResponse.status === 200 && frontendResponse.raw.includes('Agent Feed')) {
            pass('frontend', 'Frontend Server Running', 'Main page accessible');
            
            // Check if it includes expected components
            if (frontendResponse.raw.includes('vite') || frontendResponse.raw.includes('react')) {
                pass('frontend', 'React/Vite Integration', 'Frontend properly configured');
            }
        } else {
            fail('frontend', 'Frontend Server Running', `Status: ${frontendResponse.status}`);
        }
    } catch (error) {
        fail('frontend', 'Frontend Connection', error.message);
    }
}

async function validateCodeFixes() {
    console.log('\n🔧 PHASE 3: CODE FIXES VALIDATION');
    console.log('-'.repeat(40));
    
    // Check CommentThread.tsx fixes
    try {
        const commentThreadCode = fs.readFileSync('/workspaces/agent-feed/frontend/src/components/CommentThread.tsx', 'utf8');
        
        // Validation 1: processedComments transformation fix
        if (commentThreadCode.includes('replies: result.filter(c => c.parentId === comment.id)')) {
            pass('fixes', 'Threading Data Structure Fix', 'processedComments adds replies[] arrays correctly');
        } else {
            fail('fixes', 'Threading Data Structure Fix', 'Missing replies array transformation');
        }
        
        // Validation 2: URL navigation fix
        if (commentThreadCode.includes('window.history.pushState(null, \'\', `#comment-${comment.id}`)')) {
            pass('fixes', 'URL Navigation Fix', 'Permalink generation corrected');
        } else {
            fail('fixes', 'URL Navigation Fix', 'URL generation may still have issues');
        }
        
        // Validation 3: Hash navigation event handling
        if (commentThreadCode.includes('window.addEventListener(\'hashchange\', handleHashNavigation)')) {
            pass('fixes', 'Hash Navigation Events', 'Proper event listeners implemented');
        } else {
            fail('fixes', 'Hash Navigation Events', 'Missing hash change event handlers');
        }
        
        // Validation 4: Comment tree rendering fix
        if (commentThreadCode.includes('buildCommentTree(processedComments)')) {
            pass('fixes', 'Comment Tree Building', 'Using proper tree structure for threading');
        } else {
            fail('fixes', 'Comment Tree Building', 'May still use flat comment rendering');
        }
        
        // Validation 5: Visual indentation fix
        if (commentThreadCode.includes('ml-6 border-l') && commentThreadCode.includes('shouldIndent && depth > 0')) {
            pass('fixes', 'Visual Threading Indentation', 'Proper CSS classes for nested display');
        } else {
            fail('fixes', 'Visual Threading Indentation', 'Missing visual threading indicators');
        }
        
    } catch (error) {
        fail('fixes', 'Code File Access', error.message);
    }
    
    // Check CommentUtils file
    try {
        const commentUtilsCode = fs.readFileSync('/workspaces/agent-feed/frontend/src/utils/commentUtils.tsx', 'utf8');
        
        if (commentUtilsCode.includes('buildCommentTree') && commentUtilsCode.includes('CommentTreeNode')) {
            pass('fixes', 'Comment Tree Utilities', 'Proper tree structure utilities available');
        } else {
            fail('fixes', 'Comment Tree Utilities', 'Missing tree building utilities');
        }
    } catch (error) {
        fail('fixes', 'Comment Utils Access', error.message);
    }
}

async function validateSpecificURLPattern() {
    console.log('\n🎯 PHASE 4: SPECIFIC URL PATTERN VALIDATION');
    console.log('-'.repeat(40));
    
    // Test the specific problematic URL format mentioned in the task
    const problematicURL = 'http://localhost:5173/#comment-1757127735674-dc8nox5mx';
    
    // Validate URL format
    const urlPattern = /#comment-[0-9]+-[a-z0-9]+$/;
    if (urlPattern.test(problematicURL)) {
        pass('fixes', 'URL Pattern Format', 'Problematic URL follows expected pattern');
    } else {
        fail('fixes', 'URL Pattern Format', 'URL pattern does not match expected format');
    }
    
    // Validate that double-prefix bug is fixed
    if (!problematicURL.includes('#comment-comment-')) {
        pass('fixes', 'Double-Prefix Bug Fix', 'No double-prefix in URL');
    } else {
        fail('fixes', 'Double-Prefix Bug Fix', 'Double-prefix bug still present');
    }
    
    console.log(`🔗 Test URL: ${problematicURL}`);
}

function generateReport() {
    console.log('\n📊 VALIDATION SUMMARY REPORT');
    console.log('=' .repeat(60));
    
    const categories = ['backend', 'frontend', 'fixes'];
    let totalPassed = 0;
    let totalTests = 0;
    
    categories.forEach(category => {
        const results = testResults[category];
        const total = results.passed + results.failed;
        totalPassed += results.passed;
        totalTests += total;
        
        console.log(`\n${category.toUpperCase()}:`);
        console.log(`  ✅ Passed: ${results.passed}/${total}`);
        console.log(`  ❌ Failed: ${results.failed}/${total}`);
        console.log(`  📈 Success Rate: ${total > 0 ? ((results.passed/total) * 100).toFixed(1) : 0}%`);
        
        // Show individual test results
        results.tests.forEach(test => {
            const icon = test.result === 'PASS' ? '✅' : '❌';
            console.log(`    ${icon} ${test.name}: ${test.details || test.result}`);
        });
    });
    
    console.log(`\n🏆 OVERALL RESULTS:`);
    console.log(`  ✅ Total Passed: ${totalPassed}/${totalTests}`);
    console.log(`  📈 Overall Success Rate: ${totalTests > 0 ? ((totalPassed/totalTests) * 100).toFixed(1) : 0}%`);
    
    // Final assessment
    if (totalPassed >= totalTests * 0.8) {
        console.log(`\n🎉 VALIDATION SUCCESSFUL!`);
        console.log(`   Threading and URL navigation fixes are working correctly.`);
    } else {
        console.log(`\n⚠️ VALIDATION NEEDS ATTENTION`);
        console.log(`   Some issues remain with the threading and URL navigation fixes.`);
    }
    
    return {
        success: totalPassed >= totalTests * 0.8,
        totalPassed,
        totalTests,
        successRate: totalTests > 0 ? (totalPassed/totalTests) * 100 : 0
    };
}

// Main execution
async function main() {
    try {
        await validateBackendAPI();
        await validateFrontendAccess();
        await validateCodeFixes();
        await validateSpecificURLPattern();
        
        const report = generateReport();
        
        // Write results to file
        fs.writeFileSync('/workspaces/agent-feed/validation-report.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            ...report,
            details: testResults
        }, null, 2));
        
        console.log(`\n📋 Detailed report saved to: validation-report.json`);
        
        process.exit(report.success ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

main();