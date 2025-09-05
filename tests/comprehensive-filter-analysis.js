/**
 * COMPREHENSIVE FILTER ANALYSIS AND TESTING
 * Deep inspection of the actual filter implementation
 */

const { chromium } = require('playwright');
const fs = require('fs');

class ComprehensiveFilterAnalysis {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            url: 'http://localhost:4173',
            domAnalysis: {},
            filterImplementation: {},
            apiTests: {},
            realInteractionTests: []
        };
    }

    async setup() {
        console.log('🔧 Setting up comprehensive analysis...');
        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({ viewport: { width: 1280, height: 720 } });
        this.page = await this.context.newPage();
        
        // Capture all requests
        this.page.on('request', request => {
            if (request.url().includes('/api/')) {
                console.log(`📡 API Request: ${request.method()} ${request.url()}`);
            }
        });
        
        this.page.on('response', response => {
            if (response.url().includes('/api/')) {
                console.log(`📡 API Response: ${response.status()} ${response.url()}`);
            }
        });
    }

    async navigateAndWaitForLoad() {
        console.log('🌐 Loading application...');
        await this.page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(3000); // Give React time to render
    }

    async analyzeDOMStructure() {
        console.log('🔍 Analyzing DOM structure...');
        
        const domAnalysis = await this.page.evaluate(() => {
            const analysis = {
                title: document.title,
                bodyContent: document.body ? document.body.innerHTML.length : 0,
                allButtons: [],
                allInputs: [],
                allSelects: [],
                reactComponents: [],
                filterRelatedElements: [],
                dataTestIds: []
            };

            // Get all buttons
            document.querySelectorAll('button').forEach((btn, index) => {
                analysis.allButtons.push({
                    index,
                    text: btn.textContent.trim(),
                    className: btn.className,
                    id: btn.id,
                    visible: btn.offsetParent !== null,
                    tagName: btn.tagName,
                    innerHTML: btn.innerHTML.substring(0, 200),
                    attributes: Array.from(btn.attributes).reduce((acc, attr) => {
                        acc[attr.name] = attr.value;
                        return acc;
                    }, {})
                });
            });

            // Get all inputs
            document.querySelectorAll('input, select').forEach((input, index) => {
                const inputData = {
                    index,
                    tagName: input.tagName,
                    type: input.type,
                    name: input.name,
                    placeholder: input.placeholder,
                    className: input.className,
                    id: input.id,
                    visible: input.offsetParent !== null,
                    value: input.value,
                    attributes: Array.from(input.attributes).reduce((acc, attr) => {
                        acc[attr.name] = attr.value;
                        return acc;
                    }, {})
                };
                
                if (input.tagName === 'SELECT') {
                    analysis.allSelects.push(inputData);
                } else {
                    analysis.allInputs.push(inputData);
                }
            });

            // Look for data-testid attributes
            document.querySelectorAll('[data-testid]').forEach(el => {
                analysis.dataTestIds.push({
                    testId: el.getAttribute('data-testid'),
                    tagName: el.tagName,
                    className: el.className,
                    text: el.textContent.trim().substring(0, 100),
                    visible: el.offsetParent !== null
                });
            });

            // Look for filter-related elements by various selectors
            const filterSelectors = [
                '[class*="filter"]',
                '[id*="filter"]',
                '[data-*="filter"]',
                'button[class*="Filter"]',
                'button[class*="advanced"]',
                'div[class*="filter"]',
                '.filter',
                '#filter'
            ];

            filterSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        analysis.filterRelatedElements.push({
                            selector,
                            tagName: el.tagName,
                            className: el.className,
                            id: el.id,
                            text: el.textContent.trim().substring(0, 100),
                            visible: el.offsetParent !== null
                        });
                    });
                } catch (e) {
                    // Ignore invalid selectors
                }
            });

            // Look for React component names in the DOM
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_ELEMENT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                if (node.className && typeof node.className === 'string') {
                    const classNames = node.className.split(' ');
                    classNames.forEach(className => {
                        if (className.includes('Filter') || className.includes('filter')) {
                            analysis.reactComponents.push({
                                tagName: node.tagName,
                                className: node.className,
                                id: node.id,
                                text: node.textContent.trim().substring(0, 50)
                            });
                        }
                    });
                }
            }

            return analysis;
        });

        this.results.domAnalysis = domAnalysis;
        console.log(`Found ${domAnalysis.allButtons.length} buttons, ${domAnalysis.allInputs.length} inputs, ${domAnalysis.allSelects.length} selects`);
        console.log(`Found ${domAnalysis.filterRelatedElements.length} filter-related elements`);
    }

    async testActualFilterFunctionality() {
        console.log('🧪 Testing actual filter functionality...');
        
        const filterTests = [];

        // Test 1: Look for any clickable element that might be a filter
        const potentialFilterElements = await this.page.evaluate(() => {
            const elements = [];
            
            // Check all buttons for filter-like text
            document.querySelectorAll('button').forEach(btn => {
                const text = btn.textContent.toLowerCase();
                if (text.includes('filter') || text.includes('advanced') || text.includes('search')) {
                    elements.push({
                        type: 'button',
                        text: btn.textContent.trim(),
                        className: btn.className,
                        selector: `button:has-text("${btn.textContent.trim()}")`
                    });
                }
            });

            // Check for dropdown/select elements
            document.querySelectorAll('select').forEach(select => {
                elements.push({
                    type: 'select',
                    name: select.name,
                    className: select.className,
                    options: Array.from(select.options).map(opt => opt.text)
                });
            });

            return elements;
        });

        filterTests.push({
            test: 'Potential filter elements search',
            success: potentialFilterElements.length > 0,
            data: potentialFilterElements,
            details: `Found ${potentialFilterElements.length} potential filter elements`
        });

        // Test 2: Try to interact with any found elements
        for (const element of potentialFilterElements) {
            if (element.type === 'button') {
                try {
                    await this.page.click(`text="${element.text}"`);
                    await this.page.waitForTimeout(1000);
                    
                    // Check if anything changed in the DOM
                    const afterClick = await this.page.evaluate(() => {
                        return {
                            visibleInputs: Array.from(document.querySelectorAll('input:not([type="hidden"])')).filter(input => input.offsetParent !== null).length,
                            visibleSelects: Array.from(document.querySelectorAll('select')).filter(select => select.offsetParent !== null).length,
                            modalDialogs: document.querySelectorAll('[role="dialog"], .modal, .popup').length
                        };
                    });

                    filterTests.push({
                        test: `Click button: "${element.text}"`,
                        success: true,
                        data: afterClick,
                        details: `Inputs: ${afterClick.visibleInputs}, Selects: ${afterClick.visibleSelects}, Modals: ${afterClick.modalDialogs}`
                    });
                } catch (error) {
                    filterTests.push({
                        test: `Click button: "${element.text}"`,
                        success: false,
                        error: error.message
                    });
                }
            }
        }

        this.results.realInteractionTests = filterTests;
    }

    async testAPIDirectly() {
        console.log('📡 Testing API directly...');
        
        const apiTests = {};

        // Test the actual API endpoints we saw in the browser
        const endpoints = [
            '/api/v1/agent-posts?limit=20&offset=0&filter=all&search=&sortBy=published_at&sortOrder=DESC',
            '/api/v1/filter-data',
            '/api/v1/agent-posts?limit=10&offset=0&filter=ProductionValidator'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.page.evaluate(async (url) => {
                    const response = await fetch(`http://localhost:4173${url}`);
                    return {
                        status: response.status,
                        ok: response.ok,
                        data: response.ok ? await response.json() : null,
                        headers: Object.fromEntries(response.headers.entries())
                    };
                }, endpoint);

                apiTests[endpoint] = {
                    success: response.ok,
                    status: response.status,
                    dataLength: response.data ? (Array.isArray(response.data) ? response.data.length : Object.keys(response.data).length) : 0,
                    data: response.data
                };
            } catch (error) {
                apiTests[endpoint] = {
                    success: false,
                    error: error.message
                };
            }
        }

        this.results.apiTests = apiTests;
    }

    async analyzeFilterImplementation() {
        console.log('🔬 Analyzing filter implementation...');
        
        // Extract the actual React component implementation
        const implementation = await this.page.evaluate(() => {
            const analysis = {
                hasReactDevTools: !!window.React,
                reactVersion: window.React ? window.React.version : 'unknown',
                reactComponents: [],
                globalVariables: [],
                filterLogic: null
            };

            // Check for global variables that might contain filter logic
            Object.keys(window).forEach(key => {
                if (key.toLowerCase().includes('filter') || key.toLowerCase().includes('search')) {
                    analysis.globalVariables.push({
                        name: key,
                        type: typeof window[key],
                        value: typeof window[key] === 'function' ? 'function' : String(window[key]).substring(0, 100)
                    });
                }
            });

            // Look for filter-related code in script tags
            const scripts = Array.from(document.querySelectorAll('script')).map(script => script.src || script.innerHTML);
            analysis.scriptCount = scripts.length;
            analysis.hasFilterInScripts = scripts.some(script => 
                script.toLowerCase().includes('filter') || script.toLowerCase().includes('advanced')
            );

            return analysis;
        });

        this.results.filterImplementation = implementation;
    }

    async generateComprehensiveReport() {
        const reportPath = '/workspaces/agent-feed/tests/COMPREHENSIVE_FILTER_ANALYSIS_REPORT.md';
        
        const report = `# COMPREHENSIVE FILTER ANALYSIS REPORT

**Analysis Time:** ${this.results.timestamp}
**Target URL:** ${this.results.url}

## Executive Summary

The comprehensive analysis reveals detailed information about the filter functionality implementation in the Agent Feed application.

## DOM Structure Analysis

### Buttons Found
Total buttons: **${this.results.domAnalysis.allButtons?.length || 0}**

${(this.results.domAnalysis.allButtons || []).map((btn, i) => `
#### Button ${i + 1}
- **Text:** "${btn.text}"
- **Classes:** ${btn.className || 'none'}
- **ID:** ${btn.id || 'none'}
- **Visible:** ${btn.visible ? '✅' : '❌'}
- **Attributes:** ${JSON.stringify(btn.attributes, null, 2)}
`).join('\n')}

### Input Elements Found
- **Text Inputs:** ${this.results.domAnalysis.allInputs?.length || 0}
- **Select Dropdowns:** ${this.results.domAnalysis.allSelects?.length || 0}

${(this.results.domAnalysis.allSelects || []).map((select, i) => `
#### Select ${i + 1}
- **Name:** ${select.name}
- **Classes:** ${select.className}
- **Visible:** ${select.visible ? '✅' : '❌'}
`).join('\n')}

### Data Test IDs Found
${(this.results.domAnalysis.dataTestIds || []).map(item => `
- **${item.testId}** (${item.tagName}) - ${item.visible ? '✅ Visible' : '❌ Hidden'}
  - Text: "${item.text}"
`).join('\n')}

### Filter-Related Elements
Total filter elements found: **${this.results.domAnalysis.filterRelatedElements?.length || 0}**

${(this.results.domAnalysis.filterRelatedElements || []).map((el, i) => `
#### Filter Element ${i + 1}
- **Selector:** ${el.selector}
- **Tag:** ${el.tagName}
- **Classes:** ${el.className}
- **Text:** "${el.text}"
- **Visible:** ${el.visible ? '✅' : '❌'}
`).join('\n')}

## Real Interaction Tests

${(this.results.realInteractionTests || []).map((test, i) => `
### Test ${i + 1}: ${test.test}
**Result:** ${test.success ? '✅ PASSED' : '❌ FAILED'}
${test.details ? `**Details:** ${test.details}` : ''}
${test.error ? `**Error:** ${test.error}` : ''}
${test.data ? `**Data:** \`\`\`json\n${JSON.stringify(test.data, null, 2)}\n\`\`\`` : ''}
`).join('\n')}

## API Testing Results

${Object.entries(this.results.apiTests || {}).map(([endpoint, result]) => `
### ${endpoint}
**Status:** ${result.success ? '✅ SUCCESS' : '❌ FAILED'}
- **HTTP Status:** ${result.status || 'N/A'}
- **Data Length:** ${result.dataLength || 0}
${result.error ? `- **Error:** ${result.error}` : ''}
${result.data && result.success ? `
**Sample Data:**
\`\`\`json
${JSON.stringify(Array.isArray(result.data) ? result.data.slice(0, 2) : result.data, null, 2)}
\`\`\`
` : ''}
`).join('\n')}

## Filter Implementation Analysis

### React Environment
- **React Available:** ${this.results.filterImplementation.hasReactDevTools ? '✅' : '❌'}
- **React Version:** ${this.results.filterImplementation.reactVersion || 'Unknown'}
- **Script Count:** ${this.results.filterImplementation.scriptCount || 0}
- **Filter Code Present:** ${this.results.filterImplementation.hasFilterInScripts ? '✅' : '❌'}

### Global Filter Variables
${(this.results.filterImplementation.globalVariables || []).map(variable => `
- **${variable.name}** (${variable.type}): ${variable.value}
`).join('\n')}

## Key Findings and Recommendations

### Current State
1. **Application Loading:** ✅ Application loads successfully
2. **API Connectivity:** ${Object.values(this.results.apiTests || {}).some(r => r.success) ? '✅' : '❌'} API endpoints are accessible
3. **Filter UI:** ${(this.results.domAnalysis.filterRelatedElements?.length || 0) > 0 ? '✅' : '❌'} Filter elements detected
4. **Interactive Elements:** ${(this.results.domAnalysis.allButtons?.length || 0)} buttons available for interaction

### Issues Identified
${(this.results.realInteractionTests || []).filter(test => !test.success).length > 0 ? `
- Some interaction tests failed
- Potential UI element accessibility issues
` : '- No major interaction issues detected'}

### Recommendations
1. **Filter Button Implementation:** ${(this.results.domAnalysis.allButtons || []).some(btn => btn.text.toLowerCase().includes('filter')) ? 'Filter buttons are present but may need better accessibility attributes' : 'Consider adding clearly labeled filter buttons'}

2. **API Integration:** ${Object.values(this.results.apiTests || {}).some(r => r.success) ? 'API endpoints are working - focus on frontend integration' : 'Fix API connectivity issues'}

3. **User Experience:** Add data-testid attributes to filter elements for better testing and accessibility

---
*Generated by Comprehensive Filter Analysis Suite*
`;

        fs.writeFileSync(reportPath, report);
        console.log(`📊 Comprehensive report saved to: ${reportPath}`);

        // Also save raw data
        const dataPath = '/workspaces/agent-feed/tests/comprehensive-filter-data.json';
        fs.writeFileSync(dataPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Raw data saved to: ${dataPath}`);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runAnalysis() {
        try {
            await this.setup();
            await this.navigateAndWaitForLoad();
            await this.analyzeDOMStructure();
            await this.testActualFilterFunctionality();
            await this.testAPIDirectly();
            await this.analyzeFilterImplementation();
            await this.generateComprehensiveReport();
            
            console.log('✅ Comprehensive analysis complete!');
            return { success: true, results: this.results };
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            return { success: false, error: error.message };
        } finally {
            await this.cleanup();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new ComprehensiveFilterAnalysis();
    analyzer.runAnalysis().then(result => {
        console.log('🏁 Analysis complete!');
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('💥 Analysis failed:', error);
        process.exit(1);
    });
}

module.exports = ComprehensiveFilterAnalysis;