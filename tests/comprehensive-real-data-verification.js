/**
 * Comprehensive Real Data Verification Test
 * 
 * This test validates that the agent-feed application displays authentic data
 * from API endpoints rather than mock, generated, or placeholder content.
 * 
 * FAILURE CONDITIONS:
 * - Math.random() generated content
 * - Hardcoded "N/A", "Unknown", or placeholder text
 * - Non-deterministic data that changes on refresh
 * - Mock activities or posts
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class RealDataVerificationTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            testStatus: 'RUNNING',
            backendHealth: false,
            frontendHealth: false,
            agentPageAccess: false,
            overviewTabValidation: {
                passed: false,
                errors: [],
                screenshots: [],
                dataConsistency: false
            },
            detailsTabValidation: {
                passed: false,
                errors: [],
                screenshots: [],
                dataConsistency: false
            },
            activityTabValidation: {
                passed: false,
                errors: [],
                screenshots: [],
                dataConsistency: false
            },
            mockDataDetected: [],
            placeholderDataDetected: [],
            randomDataDetected: [],
            consistencyCheck: {
                overviewData: { initial: null, afterRefresh: null, consistent: false },
                detailsData: { initial: null, afterRefresh: null, consistent: false },
                activityData: { initial: null, afterRefresh: null, consistent: false }
            }
        };
        this.screenshotDir = '/workspaces/agent-feed/tests/reports/real-data-validation-artifacts';
        this.agentId = 'agent-feed-back-agent';
        this.baseUrl = 'http://localhost:5174';
        this.backendUrl = 'http://localhost:3001';
    }

    async setup() {
        // Ensure screenshot directory exists
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        this.browser = await chromium.launch({ 
            headless: true,
            args: ['--disable-web-security', '--disable-features=VizDisplayCompositor', '--no-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // Set viewport for consistent screenshots
        await this.page.setViewportSize({ width: 1920, height: 1080 });
        
        // Add console listener to detect potential mock data generation
        this.page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Math.random') || text.includes('mock') || text.includes('fake')) {
                this.results.randomDataDetected.push({
                    type: 'console',
                    message: text,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.backendUrl}/api/agents`);
            this.results.backendHealth = response.ok;
            
            if (!response.ok) {
                throw new Error(`Backend health check failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Backend health check passed. Found ${data.length} agents.`);
            return true;
        } catch (error) {
            console.error('Backend health check failed:', error.message);
            this.results.backendHealth = false;
            return false;
        }
    }

    async checkFrontendHealth() {
        try {
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
            this.results.frontendHealth = true;
            console.log('Frontend health check passed.');
            return true;
        } catch (error) {
            console.error('Frontend health check failed:', error.message);
            this.results.frontendHealth = false;
            return false;
        }
    }

    async navigateToAgentPage() {
        try {
            const agentUrl = `${this.baseUrl}/agents/${this.agentId}`;
            await this.page.goto(agentUrl, { waitUntil: 'networkidle', timeout: 30000 });
            
            // Wait for agent data to load
            await this.page.waitForSelector('[data-testid="agent-overview"]', { timeout: 10000 });
            
            this.results.agentPageAccess = true;
            console.log(`Successfully navigated to agent page: ${agentUrl}`);
            return true;
        } catch (error) {
            console.error('Failed to navigate to agent page:', error.message);
            this.results.agentPageAccess = false;
            return false;
        }
    }

    async validateOverviewTab() {
        console.log('Validating Overview tab...');
        
        try {
            // Click Overview tab if not already active
            const overviewTab = await this.page.locator('[data-tab="overview"]').first();
            if (await overviewTab.isVisible()) {
                await overviewTab.click();
                await this.page.waitForTimeout(2000);
            }

            // Capture initial data
            const initialData = await this.extractOverviewData();
            this.results.consistencyCheck.overviewData.initial = initialData;

            // Take screenshot
            const screenshotPath = path.join(this.screenshotDir, 'overview-tab-initial.png');
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            this.results.overviewTabValidation.screenshots.push(screenshotPath);

            // Validate data authenticity
            const validationErrors = await this.validateOverviewDataAuthenticity(initialData);
            this.results.overviewTabValidation.errors = validationErrors;

            // Refresh page and check consistency
            await this.page.reload({ waitUntil: 'networkidle' });
            await this.page.waitForSelector('[data-testid="agent-overview"]', { timeout: 10000 });
            
            const afterRefreshData = await this.extractOverviewData();
            this.results.consistencyCheck.overviewData.afterRefresh = afterRefreshData;

            // Take screenshot after refresh
            const refreshScreenshotPath = path.join(this.screenshotDir, 'overview-tab-after-refresh.png');
            await this.page.screenshot({ path: refreshScreenshotPath, fullPage: true });
            this.results.overviewTabValidation.screenshots.push(refreshScreenshotPath);

            // Check data consistency
            const isConsistent = this.compareDataConsistency(initialData, afterRefreshData);
            this.results.consistencyCheck.overviewData.consistent = isConsistent;
            this.results.overviewTabValidation.dataConsistency = isConsistent;

            if (!isConsistent) {
                this.results.overviewTabValidation.errors.push('Data inconsistent between page loads - indicates random/mock data');
            }

            this.results.overviewTabValidation.passed = validationErrors.length === 0 && isConsistent;
            
            return this.results.overviewTabValidation.passed;
        } catch (error) {
            this.results.overviewTabValidation.errors.push(`Overview tab validation failed: ${error.message}`);
            return false;
        }
    }

    async validateDetailsTab() {
        console.log('Validating Details tab...');
        
        try {
            // Click Details tab
            const detailsTab = await this.page.locator('[data-tab="details"]').first();
            await detailsTab.click();
            await this.page.waitForTimeout(2000);

            // Capture initial data
            const initialData = await this.extractDetailsData();
            this.results.consistencyCheck.detailsData.initial = initialData;

            // Take screenshot
            const screenshotPath = path.join(this.screenshotDir, 'details-tab-initial.png');
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            this.results.detailsTabValidation.screenshots.push(screenshotPath);

            // Validate data authenticity
            const validationErrors = await this.validateDetailsDataAuthenticity(initialData);
            this.results.detailsTabValidation.errors = validationErrors;

            // Refresh page and check consistency
            await this.page.reload({ waitUntil: 'networkidle' });
            await this.page.waitForSelector('[data-testid="agent-overview"]', { timeout: 10000 });
            
            // Navigate back to Details tab
            const detailsTabAfterRefresh = await this.page.locator('[data-tab="details"]').first();
            await detailsTabAfterRefresh.click();
            await this.page.waitForTimeout(2000);
            
            const afterRefreshData = await this.extractDetailsData();
            this.results.consistencyCheck.detailsData.afterRefresh = afterRefreshData;

            // Take screenshot after refresh
            const refreshScreenshotPath = path.join(this.screenshotDir, 'details-tab-after-refresh.png');
            await this.page.screenshot({ path: refreshScreenshotPath, fullPage: true });
            this.results.detailsTabValidation.screenshots.push(refreshScreenshotPath);

            // Check data consistency
            const isConsistent = this.compareDataConsistency(initialData, afterRefreshData);
            this.results.consistencyCheck.detailsData.consistent = isConsistent;
            this.results.detailsTabValidation.dataConsistency = isConsistent;

            if (!isConsistent) {
                this.results.detailsTabValidation.errors.push('Data inconsistent between page loads - indicates random/mock data');
            }

            this.results.detailsTabValidation.passed = validationErrors.length === 0 && isConsistent;
            
            return this.results.detailsTabValidation.passed;
        } catch (error) {
            this.results.detailsTabValidation.errors.push(`Details tab validation failed: ${error.message}`);
            return false;
        }
    }

    async validateActivityTab() {
        console.log('Validating Activity tab...');
        
        try {
            // Click Activity tab
            const activityTab = await this.page.locator('[data-tab="activity"]').first();
            await activityTab.click();
            await this.page.waitForTimeout(2000);

            // Capture initial data
            const initialData = await this.extractActivityData();
            this.results.consistencyCheck.activityData.initial = initialData;

            // Take screenshot
            const screenshotPath = path.join(this.screenshotDir, 'activity-tab-initial.png');
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            this.results.activityTabValidation.screenshots.push(screenshotPath);

            // Validate data authenticity
            const validationErrors = await this.validateActivityDataAuthenticity(initialData);
            this.results.activityTabValidation.errors = validationErrors;

            // Refresh page and check consistency
            await this.page.reload({ waitUntil: 'networkidle' });
            await this.page.waitForSelector('[data-testid="agent-overview"]', { timeout: 10000 });
            
            // Navigate back to Activity tab
            const activityTabAfterRefresh = await this.page.locator('[data-tab="activity"]').first();
            await activityTabAfterRefresh.click();
            await this.page.waitForTimeout(2000);
            
            const afterRefreshData = await this.extractActivityData();
            this.results.consistencyCheck.activityData.afterRefresh = afterRefreshData;

            // Take screenshot after refresh
            const refreshScreenshotPath = path.join(this.screenshotDir, 'activity-tab-after-refresh.png');
            await this.page.screenshot({ path: refreshScreenshotPath, fullPage: true });
            this.results.activityTabValidation.screenshots.push(refreshScreenshotPath);

            // Check data consistency
            const isConsistent = this.compareDataConsistency(initialData, afterRefreshData);
            this.results.consistencyCheck.activityData.consistent = isConsistent;
            this.results.activityTabValidation.dataConsistency = isConsistent;

            if (!isConsistent) {
                this.results.activityTabValidation.errors.push('Data inconsistent between page loads - indicates random/mock data');
            }

            this.results.activityTabValidation.passed = validationErrors.length === 0 && isConsistent;
            
            return this.results.activityTabValidation.passed;
        } catch (error) {
            this.results.activityTabValidation.errors.push(`Activity tab validation failed: ${error.message}`);
            return false;
        }
    }

    async extractOverviewData() {
        return await this.page.evaluate(() => {
            const data = {};
            
            // Extract key metrics
            const metricsElements = document.querySelectorAll('[data-testid*="metric"], .metric-value, .stat-value');
            metricsElements.forEach((el, index) => {
                data[`metric_${index}`] = el.textContent?.trim() || '';
            });

            // Extract text content for analysis
            const overviewSection = document.querySelector('[data-testid="agent-overview"]') || 
                                  document.querySelector('.overview-content') ||
                                  document.querySelector('.agent-overview');
            
            if (overviewSection) {
                data.fullText = overviewSection.textContent?.trim() || '';
            }

            return data;
        });
    }

    async extractDetailsData() {
        return await this.page.evaluate(() => {
            const data = {};
            
            // Extract performance metrics
            const performanceElements = document.querySelectorAll('[data-testid*="performance"], .performance-metric, .detail-metric');
            performanceElements.forEach((el, index) => {
                data[`performance_${index}`] = el.textContent?.trim() || '';
            });

            // Extract text content for analysis
            const detailsSection = document.querySelector('[data-testid="agent-details"]') || 
                                 document.querySelector('.details-content') ||
                                 document.querySelector('.agent-details');
            
            if (detailsSection) {
                data.fullText = detailsSection.textContent?.trim() || '';
            }

            return data;
        });
    }

    async extractActivityData() {
        return await this.page.evaluate(() => {
            const data = {};
            
            // Extract activity items
            const activityElements = document.querySelectorAll('[data-testid*="activity"], .activity-item, .post-item, .mention-item');
            activityElements.forEach((el, index) => {
                data[`activity_${index}`] = el.textContent?.trim() || '';
            });

            // Extract text content for analysis
            const activitySection = document.querySelector('[data-testid="agent-activity"]') || 
                                  document.querySelector('.activity-content') ||
                                  document.querySelector('.agent-activity');
            
            if (activitySection) {
                data.fullText = activitySection.textContent?.trim() || '';
            }

            return data;
        });
    }

    async validateOverviewDataAuthenticity(data) {
        const errors = [];
        const suspiciousPatterns = [
            /Math\.random/i,
            /placeholder/i,
            /lorem ipsum/i,
            /test data/i,
            /mock/i,
            /fake/i,
            /n\/a/gi,
            /unknown/gi,
            /coming soon/i,
            /not available/i
        ];

        const fullText = data.fullText || '';
        
        suspiciousPatterns.forEach(pattern => {
            if (pattern.test(fullText)) {
                errors.push(`Suspicious pattern detected in overview: ${pattern.source}`);
            }
        });

        // Check for numeric values that look generated
        Object.values(data).forEach(value => {
            if (typeof value === 'string') {
                // Check for obviously fake decimals (too many decimal places)
                const decimalMatch = value.match(/\d+\.\d{5,}/);
                if (decimalMatch) {
                    errors.push(`Suspicious decimal precision in overview: ${decimalMatch[0]}`);
                }
            }
        });

        return errors;
    }

    async validateDetailsDataAuthenticity(data) {
        const errors = [];
        const suspiciousPatterns = [
            /Math\.random/i,
            /placeholder/i,
            /lorem ipsum/i,
            /test data/i,
            /mock/i,
            /fake/i,
            /n\/a/gi,
            /unknown/gi,
            /coming soon/i,
            /not available/i,
            /random/i
        ];

        const fullText = data.fullText || '';
        
        suspiciousPatterns.forEach(pattern => {
            if (pattern.test(fullText)) {
                errors.push(`Suspicious pattern detected in details: ${pattern.source}`);
            }
        });

        return errors;
    }

    async validateActivityDataAuthenticity(data) {
        const errors = [];
        const suspiciousPatterns = [
            /Math\.random/i,
            /placeholder/i,
            /lorem ipsum/i,
            /test data/i,
            /mock/i,
            /fake/i,
            /generated activity/i,
            /sample post/i,
            /example mention/i
        ];

        const fullText = data.fullText || '';
        
        suspiciousPatterns.forEach(pattern => {
            if (pattern.test(fullText)) {
                errors.push(`Suspicious pattern detected in activity: ${pattern.source}`);
            }
        });

        // Check if activity items look too generic or generated
        Object.entries(data).forEach(([key, value]) => {
            if (key.startsWith('activity_') && typeof value === 'string') {
                if (value.length > 0 && (value.includes('Lorem') || value.includes('Example') || value.includes('Test'))) {
                    errors.push(`Generic activity content detected: ${value.substring(0, 50)}...`);
                }
            }
        });

        return errors;
    }

    compareDataConsistency(initial, afterRefresh) {
        // Compare key data points to ensure they're consistent
        const initialKeys = Object.keys(initial);
        const refreshKeys = Object.keys(afterRefresh);

        if (initialKeys.length !== refreshKeys.length) {
            return false;
        }

        for (const key of initialKeys) {
            if (initial[key] !== afterRefresh[key]) {
                // Allow for minor differences in timestamps or loading states
                if (key.includes('time') || key.includes('loading')) {
                    continue;
                }
                return false;
            }
        }

        return true;
    }

    async generateReport() {
        const overallPassed = this.results.overviewTabValidation.passed && 
                             this.results.detailsTabValidation.passed && 
                             this.results.activityTabValidation.passed;

        this.results.testStatus = overallPassed ? 'PASSED' : 'FAILED';

        const report = {
            ...this.results,
            summary: {
                overallStatus: this.results.testStatus,
                totalErrors: [
                    ...this.results.overviewTabValidation.errors,
                    ...this.results.detailsTabValidation.errors,
                    ...this.results.activityTabValidation.errors
                ].length,
                screenshotsGenerated: [
                    ...this.results.overviewTabValidation.screenshots,
                    ...this.results.detailsTabValidation.screenshots,
                    ...this.results.activityTabValidation.screenshots
                ].length,
                dataConsistencyStatus: {
                    overview: this.results.overviewTabValidation.dataConsistency,
                    details: this.results.detailsTabValidation.dataConsistency,
                    activity: this.results.activityTabValidation.dataConsistency
                }
            }
        };

        const reportPath = '/workspaces/agent-feed/tests/real-data-verification-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('\n=== REAL DATA VERIFICATION RESULTS ===');
        console.log(`Overall Status: ${report.summary.overallStatus}`);
        console.log(`Backend Health: ${this.results.backendHealth ? 'HEALTHY' : 'FAILED'}`);
        console.log(`Frontend Health: ${this.results.frontendHealth ? 'HEALTHY' : 'FAILED'}`);
        console.log(`Agent Page Access: ${this.results.agentPageAccess ? 'SUCCESS' : 'FAILED'}`);
        console.log(`Overview Tab: ${this.results.overviewTabValidation.passed ? 'PASSED' : 'FAILED'}`);
        console.log(`Details Tab: ${this.results.detailsTabValidation.passed ? 'PASSED' : 'FAILED'}`);
        console.log(`Activity Tab: ${this.results.activityTabValidation.passed ? 'PASSED' : 'FAILED'}`);
        console.log(`Total Errors: ${report.summary.totalErrors}`);
        console.log(`Screenshots: ${report.summary.screenshotsGenerated}`);
        console.log(`Report saved to: ${reportPath}`);

        if (!overallPassed) {
            console.log('\n=== FAILURE DETAILS ===');
            [...this.results.overviewTabValidation.errors,
             ...this.results.detailsTabValidation.errors,
             ...this.results.activityTabValidation.errors].forEach(error => {
                console.log(`- ${error}`);
            });
        }

        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.setup();
            
            // Health checks
            const backendHealthy = await this.checkBackendHealth();
            if (!backendHealthy) {
                throw new Error('Backend health check failed');
            }

            const frontendHealthy = await this.checkFrontendHealth();
            if (!frontendHealthy) {
                throw new Error('Frontend health check failed');
            }

            // Navigate to agent page
            const pageAccessible = await this.navigateToAgentPage();
            if (!pageAccessible) {
                throw new Error('Could not access agent page');
            }

            // Validate each tab
            await this.validateOverviewTab();
            await this.validateDetailsTab();
            await this.validateActivityTab();

            // Generate report
            const report = await this.generateReport();
            
            return report;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test if called directly
if (require.main === module) {
    const test = new RealDataVerificationTest();
    test.run().then(report => {
        process.exit(report.summary.overallStatus === 'PASSED' ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = RealDataVerificationTest;