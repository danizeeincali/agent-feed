// FilterPanel Debug Script - Run this in browser console to test FilterPanel visibility
console.log('🔍 FilterPanel Debug Script Starting...');

// 1. Check if FilterPanel is rendered
function checkFilterPanelExists() {
    console.log('\n1. Checking if FilterPanel component exists...');
    
    // Look for the filter button by various selectors
    const filterSelectors = [
        '[class*="filter"]',
        'button[class*="filter"]', 
        '[class*="Filter"]',
        'button:contains("All Posts")',
        'button:contains("Filter")',
        '[role="button"]'
    ];
    
    let filterButton = null;
    for (const selector of filterSelectors) {
        try {
            filterButton = document.querySelector(selector);
            if (filterButton && filterButton.textContent.includes('Posts')) {
                console.log('✅ Found filter button with selector:', selector);
                console.log('✅ Button text:', filterButton.textContent);
                console.log('✅ Button classes:', filterButton.className);
                console.log('✅ Button styles:', window.getComputedStyle(filterButton).display);
                return filterButton;
            }
        } catch (e) {
            // Skip invalid selectors
        }
    }
    
    console.log('❌ FilterPanel button not found with standard selectors');
    
    // More aggressive search
    const allButtons = document.querySelectorAll('button');
    console.log(`\n🔍 Checking ${allButtons.length} buttons for filter text...`);
    
    for (const button of allButtons) {
        const text = button.textContent.toLowerCase();
        if (text.includes('all posts') || text.includes('filter') || text.includes('agent') || text.includes('hashtag')) {
            console.log('🎯 Found potential filter button:', button.textContent);
            console.log('   Classes:', button.className);
            console.log('   Display:', window.getComputedStyle(button).display);
            console.log('   Visibility:', window.getComputedStyle(button).visibility);
            console.log('   Opacity:', window.getComputedStyle(button).opacity);
            return button;
        }
    }
    
    return null;
}

// 2. Test clicking the filter button
function testFilterButtonClick(button) {
    console.log('\n2. Testing filter button click...');
    
    if (!button) {
        console.log('❌ No button to test');
        return;
    }
    
    // Simulate click
    try {
        button.click();
        console.log('✅ Button click successful');
        
        // Check for dropdown after click
        setTimeout(() => {
            const dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="menu"], [class*="option"], .absolute');
            console.log(`📋 Found ${dropdowns.length} potential dropdown elements after click`);
            
            dropdowns.forEach((dropdown, i) => {
                console.log(`   Dropdown ${i}:`, dropdown.textContent.substring(0, 100));
            });
            
            // Look for "Advanced Filter" text
            const advancedFilter = Array.from(document.querySelectorAll('*')).find(el => 
                el.textContent.includes('Advanced Filter')
            );
            
            if (advancedFilter) {
                console.log('🎯 Found "Advanced Filter" option!');
                console.log('   Element:', advancedFilter);
                console.log('   Text:', advancedFilter.textContent);
            } else {
                console.log('❌ "Advanced Filter" option not found');
            }
        }, 500);
        
    } catch (e) {
        console.log('❌ Button click failed:', e.message);
    }
}

// 3. Check CSS and styling issues
function checkStylingIssues() {
    console.log('\n3. Checking for common styling issues...');
    
    // Check for hidden elements
    const hiddenElements = document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [style*="opacity: 0"]');
    console.log(`👻 Found ${hiddenElements.length} hidden elements`);
    
    // Check z-index issues
    const elementsWithZIndex = document.querySelectorAll('[style*="z-index"], [class*="z-"]');
    console.log(`🏗️  Found ${elementsWithZIndex.length} elements with z-index`);
    
    // Check for overflow issues
    const overflowElements = document.querySelectorAll('[style*="overflow: hidden"]');
    console.log(`📦 Found ${overflowElements.length} elements with overflow:hidden`);
}

// 4. Check React component tree
function checkReactComponents() {
    console.log('\n4. Checking React component structure...');
    
    // Look for React components in DOM
    const reactElements = document.querySelectorAll('[data-reactroot], [data-react-*]');
    console.log(`⚛️  Found ${reactElements.length} React-related elements`);
    
    // Check for React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('✅ React DevTools detected');
        
        // Try to find FilterPanel in component tree
        try {
            const fiberNodes = Array.from(document.querySelectorAll('*'))
                .map(el => el._reactInternalFiber || el.__reactInternalInstance)
                .filter(fiber => fiber);
            
            console.log(`🔍 Found ${fiberNodes.length} React fiber nodes`);
        } catch (e) {
            console.log('Could not access React internals');
        }
    }
}

// 5. Test API integration
function testAPIIntegration() {
    console.log('\n5. Testing API integration...');
    
    // Test filter data endpoint
    fetch('/api/v1/filter-data')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Filter data API working:', {
                agents: data.agents?.length || 0,
                hashtags: data.hashtags?.length || 0
            });
        })
        .catch(error => {
            console.log('❌ Filter data API failed:', error.message);
        });
    
    // Test suggestions endpoint
    fetch('/api/v1/filter-suggestions?type=agents&query=prod')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Filter suggestions API working:', data.length, 'results');
        })
        .catch(error => {
            console.log('❌ Filter suggestions API failed:', error.message);
        });
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running FilterPanel diagnostic tests...\n');
    
    const filterButton = checkFilterPanelExists();
    checkStylingIssues();
    checkReactComponents();
    testAPIIntegration();
    
    if (filterButton) {
        testFilterButtonClick(filterButton);
    }
    
    console.log('\n✅ Diagnostic tests completed. Check results above.');
    console.log('\n💡 If FilterPanel is not visible:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Verify component is imported correctly');
    console.log('   3. Check if CSS is blocking the component');
    console.log('   4. Inspect the DOM manually with browser DevTools');
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.filterPanelDebug = {
    checkFilterPanelExists,
    testFilterButtonClick,
    checkStylingIssues,
    checkReactComponents,
    testAPIIntegration,
    runAllTests
};

console.log('\n🎯 FilterPanel Debug functions available as window.filterPanelDebug');