/**
 * Quick Echo Validation Test
 * Simple demonstration of terminal echo duplication prevention
 */

const { chromium } = require('playwright');

async function validateEchoPrevention() {
    console.log('🧪 Starting Quick Echo Validation Test');
    console.log('====================================');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to terminal
        console.log('📍 Navigating to http://localhost:5173');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
        
        // Wait for terminal to be ready
        console.log('⏳ Waiting for terminal to initialize...');
        await page.waitForSelector('.xterm-screen', { timeout: 10000 });
        await page.waitForTimeout(2000); // Allow terminal to fully initialize
        
        // Get initial terminal content
        const initialContent = await page.textContent('.xterm-screen') || '';
        console.log('📋 Initial terminal content captured');
        
        // Test typing 'hello'
        console.log('⌨️  Typing "hello" character by character...');
        const testString = 'hello';
        
        for (let i = 0; i < testString.length; i++) {
            const char = testString[i];
            await page.type('.xterm-helper-textarea', char, { delay: 100 });
            console.log(`   Typed: "${char}"`);
            
            // Check for duplication after each character
            await page.waitForTimeout(200);
            const currentContent = await page.textContent('.xterm-screen') || '';
            const newContent = currentContent.slice(initialContent.length);
            
            // Count occurrences of current partial string
            const partialString = testString.slice(0, i + 1);
            const regex = new RegExp(partialString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = (newContent.match(regex) || []).length;
            
            if (matches > 1) {
                console.log(`❌ ECHO DUPLICATION DETECTED!`);
                console.log(`   Partial string: "${partialString}"`);
                console.log(`   Found ${matches} occurrences (expected: 1)`);
                console.log(`   Content: "${newContent}"`);
                return false;
            }
            
            console.log(`   ✅ No duplication for "${partialString}" (found ${matches} occurrence)`);
        }
        
        // Final validation
        await page.waitForTimeout(500);
        const finalContent = await page.textContent('.xterm-screen') || '';
        const finalNewContent = finalContent.slice(initialContent.length);
        
        const fullMatches = (finalNewContent.match(/hello/g) || []).length;
        
        console.log('\n📊 Final Results:');
        console.log(`   Test string: "${testString}"`);
        console.log(`   Occurrences found: ${fullMatches}`);
        console.log(`   Expected: 1`);
        
        if (fullMatches === 1) {
            console.log('✅ SUCCESS: No echo duplication detected!');
            console.log('✅ Typing "hello" resulted in exactly one "hello" appearing');
            return true;
        } else {
            console.log(`❌ FAILURE: Found ${fullMatches} occurrences of "hello" (expected 1)`);
            console.log(`   Final content: "${finalNewContent}"`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ TEST ERROR: ${error.message}`);
        return false;
    } finally {
        await browser.close();
    }
}

// Run the validation
validateEchoPrevention().then(success => {
    if (success) {
        console.log('\n🎉 Echo duplication prevention is working correctly!');
        process.exit(0);
    } else {
        console.log('\n🚨 Echo duplication detected - needs investigation!');
        process.exit(1);
    }
}).catch(error => {
    console.log(`\n💥 Test failed with error: ${error.message}`);
    process.exit(1);
});