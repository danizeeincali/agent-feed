#!/usr/bin/env node

/**
 * Test script to reproduce the carriage return corruption bug
 * This simulates what happens in the backend terminal server
 */

console.log('Testing carriage return handling...\n');

// Simulate the data that comes from the frontend
const testInputs = [
    'claude\r',
    'claude\r\n',
    'cd prod && claude\r',
    'cd prod && claude\r\n',
    'ls -la\r\n'
];

testInputs.forEach((input, i) => {
    console.log(`Test ${i + 1}: Input = ${JSON.stringify(input)}`);
    console.log(`  Length: ${input.length}`);
    console.log(`  Char codes: [${Array.from(input).map(c => c.charCodeAt(0)).join(', ')}]`);
    
    // This is what's happening in the backend - writing directly to process.stdin
    // Let's see what happens when we convert it to string and back
    const asString = input.toString();
    console.log(`  toString(): ${JSON.stringify(asString)}`);
    console.log(`  Are they equal? ${input === asString}`);
    
    // The problem might be how bash processes the \r\n
    if (input.includes('\r\n')) {
        console.log(`  Contains \\r\\n - this could cause "claudern" if \\r\\n becomes "rn"`);
    }
    if (input.endsWith('\r')) {
        console.log(`  Ends with \\r - this is correct for terminal input`);
    }
    
    console.log('');
});

console.log('Key finding:');
console.log('- Commands with \\r\\n might be interpreted incorrectly');
console.log('- The \\r\\n sequence could be getting processed as literal "rn" characters');
console.log('- Backend should sanitize input to use only \\n for Unix terminals');