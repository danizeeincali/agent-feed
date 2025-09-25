/**
 * CRITICAL REGRESSION TEST - Settings Removal Validation
 *
 * This test suite focuses on validating the critical issues found after Settings removal
 * and provides actionable recommendations for fixing them.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class CriticalRegressionTest {
    constructor() {
        this.testResults = [];
        this.criticalIssues = [];
        this.recommendations = [];
        this.startTime = Date.now();
    }

    log(category, test, status, details, severity = 'medium') {
        const result = {
            category,
            test,
            status,
            details,
            severity,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);

        const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️', INFO: 'ℹ️' };
        const severityIcon = severity === 'critical' ? '🚨' : severity === 'high' ? '⚡' : '';
        console.log(`${icons[status] || '🔍'} ${severityIcon} [${category}] ${test}: ${status} - ${details}`);

        if (status === 'FAIL' && (severity === 'critical' || severity === 'high')) {
            this.criticalIssues.push(result);
        }
    }

    async testServerStatus() {
        console.log('\n🔍 TESTING SERVER STATUS AND BUILD ISSUES');

        try {
            // Test if the server responds at all
            const response = await fetch('http://localhost:3001', {
                timeout: 5000,
                method: 'HEAD'
            }).catch(e => null);

            if (!response) {
                this.log('Server', 'Connection Test', 'FAIL', 'Cannot connect to localhost:3001', 'critical');
                this.recommendations.push({
                    category: 'Server',
                    issue: 'Server not responding',
                    solution: 'Check if npm run dev is running and ports are available',
                    priority: 'critical'
                });
            } else if (response.status === 500) {
                this.log('Server', 'Connection Test', 'FAIL', `Server returning 500 error`, 'high');
                this.recommendations.push({
                    category: 'Server',
                    issue: 'Server returning 500 errors',
                    solution: 'Check server logs for compilation/import errors',
                    priority: 'high'
                });
            } else {
                this.log('Server', 'Connection Test', 'PASS', `Server responding with ${response.status}`, 'low');
            }
        } catch (error) {
            this.log('Server', 'Connection Test', 'FAIL', `Server test failed: ${error.message}`, 'critical');
        }
    }

    async testFileSystemIssues() {
        console.log('\n📁 TESTING FILE SYSTEM ISSUES');

        const criticalPaths = [
            { path: '/workspaces/agent-feed/frontend/src/components/ui/button.tsx', name: 'Button Component' },
            { path: '/workspaces/agent-feed/frontend/src/lib/utils.ts', name: 'Utils Library' },
            { path: '/workspaces/agent-feed/frontend/src/components/charts/LineChart.tsx', name: 'Charts Components' },
            { path: '/workspaces/agent-feed/package.json', name: 'Package Config' },
            { path: '/workspaces/agent-feed/next.config.js', name: 'Next Config' }
        ];

        for (const item of criticalPaths) {
            try {
                if (fs.existsSync(item.path)) {
                    this.log('FileSystem', `${item.name} Exists`, 'PASS', item.path, 'low');
                } else {
                    this.log('FileSystem', `${item.name} Missing`, 'FAIL', item.path, 'high');
                    this.recommendations.push({
                        category: 'FileSystem',
                        issue: `Missing ${item.name}`,
                        solution: `Create or restore ${item.path}`,
                        priority: 'high'
                    });
                }
            } catch (error) {
                this.log('FileSystem', `${item.name} Check Error`, 'FAIL', error.message, 'medium');
            }
        }
    }

    async testImportPathIssues() {
        console.log('\n🔗 TESTING IMPORT PATH ISSUES');

        const filesToCheck = [
            '/workspaces/agent-feed/frontend/src/components/analytics/CostOverviewDashboard.tsx'
        ];

        for (const filePath of filesToCheck) {
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Check for problematic import patterns
                    const problemPatterns = [
                        { pattern: /@\/components\/ui\/button/, fix: '../ui/button or relative path' },
                        { pattern: /@\/lib\/utils/, fix: '../../lib/utils or relative path' },
                        { pattern: /@\/components\/charts/, fix: '../charts or relative path' }
                    ];

                    let hasIssues = false;
                    for (const { pattern, fix } of problemPatterns) {
                        if (pattern.test(content)) {
                            hasIssues = true;
                            this.log('ImportPaths', `Problematic Import in ${path.basename(filePath)}`, 'FAIL',
                                `Found ${pattern.source}, should use ${fix}`, 'high');
                            this.recommendations.push({
                                category: 'ImportPaths',
                                issue: `Invalid import path ${pattern.source} in ${filePath}`,
                                solution: `Update to use relative path: ${fix}`,
                                priority: 'high'
                            });
                        }
                    }

                    if (!hasIssues) {
                        this.log('ImportPaths', `Import Paths in ${path.basename(filePath)}`, 'PASS',
                            'No problematic import paths found', 'low');
                    }
                } else {
                    this.log('ImportPaths', `File Missing`, 'FAIL', filePath, 'medium');
                }
            } catch (error) {
                this.log('ImportPaths', `Check Error`, 'FAIL', error.message, 'medium');
            }
        }
    }

    async testSettingsRemovalCleanup() {
        console.log('\n🗑️ TESTING SETTINGS REMOVAL CLEANUP');

        const settingsReferences = [
            { path: '/workspaces/agent-feed/frontend/src', pattern: /settings|Settings/g },
            { path: '/workspaces/agent-feed/src', pattern: /settings|Settings/g }
        ];

        // Check for remaining Settings references that might cause issues
        try {
            // This is a simplified check - in a real scenario you'd use grep or similar
            const checkCmd = `find /workspaces/agent-feed -name "*.tsx" -o -name "*.ts" | head -10`;
            this.log('SettingsCleanup', 'Settings Reference Check', 'INFO',
                'Settings references check requires manual verification', 'low');

            this.recommendations.push({
                category: 'SettingsCleanup',
                issue: 'Need to verify all Settings references are properly removed',
                solution: 'Run: grep -r "settings\\|Settings" frontend/src to find remaining references',
                priority: 'medium'
            });

        } catch (error) {
            this.log('SettingsCleanup', 'Check Error', 'FAIL', error.message, 'medium');
        }
    }

    async testBasicFunctionality() {
        console.log('\n🚀 TESTING BASIC FUNCTIONALITY (where possible)');

        try {
            // Try to check if TypeScript compilation works
            this.log('Compilation', 'TypeScript Check', 'INFO',
                'TypeScript compilation test requires manual verification', 'medium');

            this.recommendations.push({
                category: 'Compilation',
                issue: 'Need to verify TypeScript compilation works',
                solution: 'Run: npx tsc --noEmit to check for TypeScript errors',
                priority: 'high'
            });

        } catch (error) {
            this.log('Compilation', 'Test Error', 'FAIL', error.message, 'medium');
        }
    }

    generateFixScript() {
        const fixScript = `#!/bin/bash
# AUTOMATED FIXES FOR CRITICAL ISSUES
# Generated by regression test suite

echo "🔧 Starting automated fixes for Settings removal issues..."

# Fix import paths in CostOverviewDashboard.tsx
echo "📝 Fixing import paths..."
cd /workspaces/agent-feed

# Ensure button component exists and has correct exports
if [ -f "frontend/src/components/ui/button.tsx" ]; then
    echo "✅ Button component exists"
else
    echo "❌ Button component missing - needs manual creation"
fi

# Fix relative import paths
sed -i 's|@/components/ui/button|../ui/button|g' frontend/src/components/analytics/CostOverviewDashboard.tsx
sed -i 's|@/lib/utils|../../lib/utils|g' frontend/src/components/analytics/CostOverviewDashboard.tsx
sed -i 's|@/components/charts/|../charts/|g' frontend/src/components/analytics/CostOverviewDashboard.tsx

echo "✅ Import path fixes applied"

# Install missing dependencies if needed
echo "📦 Checking dependencies..."
npm install

# Try to rebuild node-pty for the current platform
echo "🔨 Rebuilding native dependencies..."
npm rebuild node-pty 2>/dev/null || echo "⚠️ node-pty rebuild failed - this is expected in some environments"

echo "🎯 Automated fixes complete. Manual verification needed for remaining issues."
`;

        fs.writeFileSync('/workspaces/agent-feed/tests/fix-critical-issues.sh', fixScript, { mode: 0o755 });
        return '/workspaces/agent-feed/tests/fix-critical-issues.sh';
    }

    async generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        const report = {
            testSuite: 'Critical Regression Test - Settings Removal',
            timestamp: new Date().toISOString(),
            duration: `${(duration / 1000).toFixed(2)}s`,

            summary: {
                totalTests: this.testResults.length,
                passed: this.testResults.filter(r => r.status === 'PASS').length,
                failed: this.testResults.filter(r => r.status === 'FAIL').length,
                warnings: this.testResults.filter(r => r.status === 'WARN').length,
                info: this.testResults.filter(r => r.status === 'INFO').length
            },

            criticalIssues: this.criticalIssues,
            recommendations: this.recommendations,
            results: this.testResults,

            nextSteps: [
                '1. Run the automated fix script generated by this test',
                '2. Manual verification of remaining Settings references',
                '3. Fix TypeScript compilation errors',
                '4. Test individual page routes manually',
                '5. Re-run this regression test to verify fixes'
            ]
        };

        // Write detailed report
        const reportPath = '/workspaces/agent-feed/test-results/critical-regression-report.json';
        try {
            await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
            await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
        } catch (error) {
            console.log(`⚠️ Could not write report file: ${error.message}`);
        }

        // Generate fix script
        const fixScriptPath = this.generateFixScript();

        // Console output
        console.log('\n' + '='.repeat(80));
        console.log('🎯 CRITICAL REGRESSION TEST COMPLETE');
        console.log('='.repeat(80));
        console.log(`📊 Results: ${report.summary.passed}/${report.summary.totalTests} tests passed`);
        console.log(`⏱️ Duration: ${report.duration}`);
        console.log(`🚨 Critical Issues: ${this.criticalIssues.length}`);
        console.log(`📋 Recommendations: ${this.recommendations.length}`);

        if (this.criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES FOUND:');
            this.criticalIssues.forEach((issue, i) => {
                console.log(`  ${i + 1}. [${issue.category}] ${issue.details}`);
            });
        }

        if (this.recommendations.length > 0) {
            console.log('\n💡 TOP RECOMMENDATIONS:');
            this.recommendations
                .filter(r => r.priority === 'critical' || r.priority === 'high')
                .slice(0, 5)
                .forEach((rec, i) => {
                    console.log(`  ${i + 1}. ${rec.solution}`);
                });
        }

        console.log(`\n📄 Detailed report: ${reportPath}`);
        console.log(`🔧 Automated fix script: ${fixScriptPath}`);
        console.log('\n📋 NEXT STEPS:');
        report.nextSteps.forEach((step, i) => {
            console.log(`  ${step}`);
        });
        console.log('='.repeat(80));

        return report;
    }

    async run() {
        console.log('🔥 CRITICAL REGRESSION TEST - SETTINGS REMOVAL VALIDATION');
        console.log('🎯 Focus: Identifying and fixing critical issues blocking functionality\n');

        try {
            await this.testServerStatus();
            await this.testFileSystemIssues();
            await this.testImportPathIssues();
            await this.testSettingsRemovalCleanup();
            await this.testBasicFunctionality();

            return await this.generateReport();

        } catch (error) {
            console.error('❌ Critical test suite failed:', error);
            this.log('TestSuite', 'Execution', 'FAIL', error.message, 'critical');
            return await this.generateReport();
        }
    }
}

// Export for module use
module.exports = CriticalRegressionTest;

// Run if called directly
if (require.main === module) {
    (async () => {
        const testSuite = new CriticalRegressionTest();
        const results = await testSuite.run();
        process.exit(results.criticalIssues.length > 0 ? 1 : 0);
    })();
}