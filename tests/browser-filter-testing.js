const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runAdvancedFilterTest() {
    console.log('🚀 Starting Comprehensive Browser Filter Testing');
    
    // Create results directory
    const resultsDir = path.join(__dirname, 'filter-test-results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const testResults = {
        timestamp: new Date().toISOString(),
        url: 'http://localhost:5173',
        findings: [],
        screenshots: [],
        consoleErrors: [],
        networkCalls: [],
        filterElements: [],
        userWorkflows: []
    };
    
    // Launch browser in headless mode for CI environment
    const browser = await chromium.launch({ 
        headless: true,
        slowMo: 100
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Monitor console messages
    page.on('console', msg => {
        const logEntry = {
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
            timestamp: new Date().toISOString()
        };
        testResults.consoleErrors.push(logEntry);
        console.log(`📝 Console [${msg.type()}]:`, msg.text());
    });
    
    // Monitor network requests
    page.on('request', request => {
        if (request.url().includes('api') || request.url().includes('filter')) {
            const networkEntry = {
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                postData: request.postData(),
                timestamp: new Date().toISOString()
            };
            testResults.networkCalls.push(networkEntry);
            console.log(`🌐 Request: ${request.method()} ${request.url()}`);
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('api') || response.url().includes('filter')) {
            console.log(`📡 Response: ${response.status()} ${response.url()}`);
        }
    });
    
    try {
        console.log('🌍 Navigating to http://localhost:5173...');
        
        // Navigate with extended timeout
        await page.goto('http://localhost:5173', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Wait for app to load
        await page.waitForTimeout(3000);
        
        // Capture initial state
        const initialScreenshot = path.join(resultsDir, '01-initial-state.png');
        await page.screenshot({ path: initialScreenshot, fullPage: true });
        testResults.screenshots.push('01-initial-state.png');
        console.log('📸 Captured initial state screenshot');
        
        // Document page title and URL
        const title = await page.title();
        const url = page.url();
        testResults.findings.push({
            type: 'page_info',
            title,
            url,
            timestamp: new Date().toISOString()
        });
        
        console.log(`📄 Page Title: ${title}`);
        console.log(`🔗 Current URL: ${url}`);
        
        // Wait for React to fully load
        await page.waitForTimeout(2000);
        
        // Look for filter-related elements
        console.log('🔍 Searching for filter UI elements...');
        
        // Search for various filter selectors
        const filterSelectors = [
            '[data-testid*="filter"]',
            '.filter',
            '[class*="filter"]',
            '[id*="filter"]',
            'button[class*="filter"]',
            'input[placeholder*="filter"]',
            'select[class*="filter"]',
            '.FilterPanel',
            '.MultiSelectFilter',
            '.EnhancedFilterPanel',
            '[data-testid="filter-panel"]',
            '[data-testid="filter-button"]',
            '[data-testid="advanced-filter"]',
            '[data-testid="multi-select-filter"]'
        ];
        
        for (const selector of filterSelectors) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
                    
                    for (let i = 0; i < elements.length; i++) {
                        const element = elements[i];
                        const boundingBox = await element.boundingBox();
                        const textContent = await element.textContent();
                        const tagName = await element.evaluate(el => el.tagName);
                        const className = await element.getAttribute('class');
                        const id = await element.getAttribute('id');
                        const dataTestId = await element.getAttribute('data-testid');
                        
                        const elementInfo = {
                            selector,
                            index: i,
                            tagName,
                            className,
                            id,
                            dataTestId,
                            textContent: textContent?.trim(),
                            boundingBox,
                            timestamp: new Date().toISOString()
                        };
                        
                        testResults.filterElements.push(elementInfo);
                        console.log(`  📍 Element ${i + 1}: ${tagName} - "${textContent?.trim()}" - Class: ${className}`);
                    }
                } else {
                    console.log(`❌ No elements found for selector: ${selector}`);
                }
            } catch (error) {
                console.log(`⚠️ Error checking selector ${selector}:`, error.message);
            }
        }
        
        // Look for any buttons that might be filter-related
        console.log('🔍 Searching for all buttons...');
        const buttons = await page.$$('button');
        console.log(`Found ${buttons.length} buttons on the page`);
        
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const text = await button.textContent();
            const className = await button.getAttribute('class');
            const ariaLabel = await button.getAttribute('aria-label');
            
            if (text || className || ariaLabel) {
                console.log(`  🔘 Button ${i + 1}: "${text?.trim()}" - Class: ${className} - Aria: ${ariaLabel}`);
                
                // Check if button might be filter-related
                const filterKeywords = ['filter', 'search', 'sort', 'category', 'type', 'select', 'advanced'];
                const isFilterRelated = filterKeywords.some(keyword => 
                    (text && text.toLowerCase().includes(keyword)) ||
                    (className && className.toLowerCase().includes(keyword)) ||
                    (ariaLabel && ariaLabel.toLowerCase().includes(keyword))
                );
                
                if (isFilterRelated) {
                    console.log(`    ✨ This appears to be filter-related!`);
                    testResults.filterElements.push({
                        type: 'button',
                        text: text?.trim(),
                        className,
                        ariaLabel,
                        isFilterRelated: true,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        // Look for input elements
        console.log('🔍 Searching for all input elements...');
        const inputs = await page.$$('input, select, textarea');
        console.log(`Found ${inputs.length} input elements on the page`);
        
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const type = await input.getAttribute('type');
            const placeholder = await input.getAttribute('placeholder');
            const className = await input.getAttribute('class');
            const name = await input.getAttribute('name');
            const id = await input.getAttribute('id');
            
            console.log(`  📝 Input ${i + 1}: Type: ${type}, Placeholder: "${placeholder}", Class: ${className}, Name: ${name}, ID: ${id}`);
            
            testResults.filterElements.push({
                type: 'input',
                inputType: type,
                placeholder,
                className,
                name,
                id,
                timestamp: new Date().toISOString()
            });
        }
        
        // Capture screenshot after element discovery
        const elementsScreenshot = path.join(resultsDir, '02-elements-discovered.png');
        await page.screenshot({ path: elementsScreenshot, fullPage: true });
        testResults.screenshots.push('02-elements-discovered.png');
        
        // Try to interact with filter elements if found
        if (testResults.filterElements.length > 0) {
            console.log('🎯 Attempting to interact with filter elements...');
            
            for (const elementInfo of testResults.filterElements) {
                if (elementInfo.selector && elementInfo.type !== 'input') {
                    try {
                        console.log(`🖱️ Trying to click element: ${elementInfo.selector}`);
                        
                        // Take screenshot before interaction
                        const beforeScreenshot = path.join(resultsDir, `03-before-${elementInfo.selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
                        await page.screenshot({ path: beforeScreenshot, fullPage: true });
                        
                        const elements = await page.$$(elementInfo.selector);
                        if (elements[elementInfo.index || 0]) {
                            await elements[elementInfo.index || 0].click();
                            await page.waitForTimeout(1000);
                            
                            // Take screenshot after interaction
                            const afterScreenshot = path.join(resultsDir, `04-after-${elementInfo.selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
                            await page.screenshot({ path: afterScreenshot, fullPage: true });
                            testResults.screenshots.push(beforeScreenshot, afterScreenshot);
                            
                            console.log(`✅ Successfully clicked element: ${elementInfo.selector}`);
                            
                            testResults.userWorkflows.push({
                                action: 'click',
                                selector: elementInfo.selector,
                                success: true,
                                timestamp: new Date().toISOString()
                            });
                        }
                    } catch (error) {
                        console.log(`❌ Failed to interact with ${elementInfo.selector}:`, error.message);
                        testResults.userWorkflows.push({
                            action: 'click',
                            selector: elementInfo.selector,
                            success: false,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
        }
        
        // Test if there are any dropdowns or select elements
        console.log('🔍 Testing for dropdown menus...');
        const selects = await page.$$('select');
        for (let i = 0; i < selects.length; i++) {
            try {
                const select = selects[i];
                const options = await select.$$('option');
                console.log(`📋 Select ${i + 1} has ${options.length} options`);
                
                if (options.length > 1) {
                    // Try selecting different options
                    for (let j = 1; j < Math.min(3, options.length); j++) {
                        const option = options[j];
                        const value = await option.getAttribute('value');
                        const text = await option.textContent();
                        
                        console.log(`🎯 Selecting option: ${text} (value: ${value})`);
                        await select.selectOption({ index: j });
                        await page.waitForTimeout(500);
                        
                        testResults.userWorkflows.push({
                            action: 'select_option',
                            selectIndex: i,
                            optionValue: value,
                            optionText: text?.trim(),
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            } catch (error) {
                console.log(`⚠️ Error testing select ${i}:`, error.message);
            }
        }
        
        // Look for any advanced filter panels or modals
        console.log('🔍 Checking for modal dialogs or panels...');
        
        // Check if any modals appeared
        const modals = await page.$$('[role="dialog"], .modal, [class*="modal"], [class*="popup"], [class*="overlay"]');
        if (modals.length > 0) {
            console.log(`🎭 Found ${modals.length} potential modal/dialog elements`);
            
            for (let i = 0; i < modals.length; i++) {
                const modal = modals[i];
                const isVisible = await modal.isVisible();
                const className = await modal.getAttribute('class');
                const role = await modal.getAttribute('role');
                
                console.log(`  🎭 Modal ${i + 1}: Visible: ${isVisible}, Class: ${className}, Role: ${role}`);
                
                if (isVisible) {
                    const modalScreenshot = path.join(resultsDir, `05-modal-${i + 1}.png`);
                    await page.screenshot({ path: modalScreenshot, fullPage: true });
                    testResults.screenshots.push(`05-modal-${i + 1}.png`);
                }
            }
        }
        
        // Final comprehensive screenshot
        const finalScreenshot = path.join(resultsDir, '06-final-state.png');
        await page.screenshot({ path: finalScreenshot, fullPage: true });
        testResults.screenshots.push('06-final-state.png');
        
        // Get final page source
        const pageSource = await page.content();
        const sourceFile = path.join(resultsDir, 'page-source.html');
        fs.writeFileSync(sourceFile, pageSource, 'utf8');
        
        console.log('✅ Browser testing completed successfully');
        
    } catch (error) {
        console.error('❌ Error during browser testing:', error);
        testResults.findings.push({
            type: 'error',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
    
    await browser.close();
    
    // Save comprehensive results
    const resultsFile = path.join(resultsDir, 'comprehensive-test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2), 'utf8');
    
    console.log(`📊 Test results saved to: ${resultsFile}`);
    
    // Generate summary report
    const summaryReport = generateSummaryReport(testResults);
    const reportFile = path.join(resultsDir, 'BROWSER_FILTER_TEST_REPORT.md');
    fs.writeFileSync(reportFile, summaryReport, 'utf8');
    
    console.log(`📋 Summary report saved to: ${reportFile}`);
    
    return testResults;
}

function generateSummaryReport(testResults) {
    const report = `# Comprehensive Browser Filter Testing Report

## Test Overview
- **Timestamp**: ${testResults.timestamp}
- **URL Tested**: ${testResults.url}
- **Screenshots Captured**: ${testResults.screenshots.length}
- **Console Messages**: ${testResults.consoleErrors.length}
- **Network Calls**: ${testResults.networkCalls.length}
- **Filter Elements Found**: ${testResults.filterElements.length}
- **User Workflow Actions**: ${testResults.userWorkflows.length}

## Filter UI Elements Discovery

### Summary
${testResults.filterElements.length > 0 
    ? `Found ${testResults.filterElements.length} filter-related elements on the page.`
    : 'No filter-related UI elements were discovered on the page.'
}

### Discovered Elements
${testResults.filterElements.map((element, index) => `
**Element ${index + 1}:**
- Type: ${element.type || element.tagName || 'Unknown'}
- Selector: ${element.selector || 'N/A'}
- Text Content: "${element.textContent || element.text || 'No text'}"
- Class Name: ${element.className || 'None'}
- ID: ${element.id || 'None'}
- Data Test ID: ${element.dataTestId || 'None'}
- Filter Related: ${element.isFilterRelated ? '✅ Yes' : '❌ No'}
`).join('\n')}

## Network Activity Analysis

### API Calls During Testing
${testResults.networkCalls.length > 0 
    ? testResults.networkCalls.map((call, index) => `
**Request ${index + 1}:**
- URL: ${call.url}
- Method: ${call.method}
- Timestamp: ${call.timestamp}
`).join('\n')
    : 'No API calls were detected during filter testing.'
}

## Console Messages & Errors

${testResults.consoleErrors.length > 0 
    ? testResults.consoleErrors.map((error, index) => `
**Message ${index + 1}:**
- Type: ${error.type}
- Text: ${error.text}
- Location: ${error.location ? `${error.location.url}:${error.location.lineNumber}` : 'Unknown'}
- Timestamp: ${error.timestamp}
`).join('\n')
    : 'No console errors or warnings detected.'
}

## User Workflow Testing

### Interaction Results
${testResults.userWorkflows.length > 0 
    ? testResults.userWorkflows.map((workflow, index) => `
**Action ${index + 1}:**
- Type: ${workflow.action}
- Target: ${workflow.selector || workflow.selectIndex || 'Unknown'}
- Success: ${workflow.success ? '✅' : '❌'}
- Details: ${workflow.optionText || workflow.error || 'None'}
- Timestamp: ${workflow.timestamp}
`).join('\n')
    : 'No user workflow interactions were performed.'
}

## Key Findings

${testResults.findings.map((finding, index) => `
**Finding ${index + 1}:**
- Type: ${finding.type}
- Details: ${finding.title || finding.message || 'No details'}
- Timestamp: ${finding.timestamp}
`).join('\n')}

## Screenshots Captured

${testResults.screenshots.map((screenshot, index) => `
${index + 1}. ${screenshot}
`).join('')}

## Recommendations

### Advanced Filter Functionality Status
${testResults.filterElements.length > 0 
    ? '✅ Filter UI elements were found and tested.'
    : '❌ No advanced filter functionality was discovered on the page.'
}

### Filter Reset Workflow
${testResults.userWorkflows.some(w => w.action === 'click' && w.success) 
    ? '✅ Interactive elements were successfully tested.'
    : '❌ No successful filter interactions were completed.'
}

### API Integration
${testResults.networkCalls.length > 0 
    ? '✅ Network activity was detected during testing.'
    : '❌ No API calls were made during filter operations.'
}

### Console Health
${testResults.consoleErrors.filter(e => e.type === 'error').length === 0 
    ? '✅ No console errors detected.'
    : '❌ Console errors were found during testing.'
}

---

**Report Generated**: ${new Date().toISOString()}
**Test Environment**: Real Browser Automation (Playwright)
**Test Type**: Comprehensive Filter Functionality Validation
`;

    return report;
}

// Run the test
runAdvancedFilterTest().catch(console.error);