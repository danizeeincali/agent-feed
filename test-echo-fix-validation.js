#!/usr/bin/env node
/**
 * Echo Duplication Fix Validation Test
 * Tests that typing 'hello' shows exactly 'hello' once, not incremental buildup
 */

const WebSocket = require('ws');

class EchoFixValidator {
  constructor() {
    this.ws = null;
    this.receivedData = '';
    this.testResults = [];
    this.testTimeout = null;
  }

  async runValidation() {
    console.log('🧪 Starting Echo Duplication Fix Validation');
    console.log('=' .repeat(60));
    
    try {
      // Test 1: Connect to terminal server
      await this.testConnection();
      
      // Test 2: Send individual characters and monitor echo
      await this.testCharacterEcho();
      
      // Test 3: Send complete word and validate output
      await this.testCompleteWordEcho();
      
      // Test 4: Test backspace and line editing
      await this.testLineEditing();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  async testConnection() {
    console.log('🔌 Testing WebSocket connection...');
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:3002/terminal');
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        this.testResults.push({ test: 'Connection', status: 'PASS' });
        
        // Send initialization
        this.ws.send(JSON.stringify({
          type: 'init',
          cols: 80,
          rows: 24
        }));
        
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket connection failed:', error);
        this.testResults.push({ test: 'Connection', status: 'FAIL', error: error.message });
        reject(error);
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'data') {
            this.receivedData += message.data;
            console.log('📥 Received:', JSON.stringify(message.data));
          }
        } catch (e) {
          // Raw data
          this.receivedData += data.toString();
          console.log('📥 Raw received:', JSON.stringify(data.toString()));
        }
      });
    });
  }

  async testCharacterEcho() {
    console.log('\n📝 Testing individual character echo...');
    
    return new Promise((resolve) => {
      this.receivedData = '';
      let charsSent = '';
      const testChars = 'hello';
      let charIndex = 0;
      
      const sendNextChar = () => {
        if (charIndex < testChars.length) {
          const char = testChars[charIndex];
          charsSent += char;
          
          console.log(`📤 Sending character: '${char}' (${char.charCodeAt(0)})`);
          
          this.ws.send(JSON.stringify({
            type: 'input',
            data: char,
            timestamp: Date.now(),
            source: 'echo-test'
          }));
          
          charIndex++;
          setTimeout(sendNextChar, 100); // 100ms delay between characters
        } else {
          // Wait for final echo and analyze
          setTimeout(() => {
            this.analyzeCharacterEcho(charsSent);
            resolve();
          }, 500);
        }
      };
      
      setTimeout(sendNextChar, 1000); // Wait for shell prompt
    });
  }

  analyzeCharacterEcho(sentChars) {
    console.log('\n🔍 Analyzing character echo:');
    console.log(`📤 Characters sent: '${sentChars}'`);
    console.log(`📥 Data received: '${this.receivedData}'`);
    
    // Count occurrences of each character to detect duplication
    const charCounts = {};
    for (const char of this.receivedData) {
      if (sentChars.includes(char)) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }
    }
    
    console.log('📊 Character occurrence counts:', charCounts);
    
    // Check for character duplication
    let hasDuplication = false;
    let duplicatedChars = [];
    
    for (const char of sentChars) {
      const count = charCounts[char] || 0;
      if (count > 1) {
        hasDuplication = true;
        duplicatedChars.push(`'${char}':${count}`);
      }
    }
    
    if (hasDuplication) {
      console.log('❌ Character duplication detected:', duplicatedChars.join(', '));
      this.testResults.push({ 
        test: 'Character Echo', 
        status: 'FAIL', 
        issue: 'Character duplication detected',
        details: duplicatedChars 
      });
    } else {
      console.log('✅ No character duplication detected');
      this.testResults.push({ test: 'Character Echo', status: 'PASS' });
    }
  }

  async testCompleteWordEcho() {
    console.log('\n📝 Testing complete word echo...');
    
    return new Promise((resolve) => {
      this.receivedData = '';
      const testWord = 'hello';
      
      console.log(`📤 Sending complete word: '${testWord}'`);
      
      this.ws.send(JSON.stringify({
        type: 'input',
        data: testWord,
        timestamp: Date.now(),
        source: 'word-test'
      }));
      
      setTimeout(() => {
        this.analyzeWordEcho(testWord);
        resolve();
      }, 1000);
    });
  }

  analyzeWordEcho(testWord) {
    console.log('\n🔍 Analyzing word echo:');
    console.log(`📤 Word sent: '${testWord}'`);
    console.log(`📥 Data received: '${this.receivedData}'`);
    
    // Check if the word appears exactly once
    const wordOccurrences = (this.receivedData.match(new RegExp(testWord, 'g')) || []).length;
    
    console.log(`📊 Word '${testWord}' appears ${wordOccurrences} times`);
    
    if (wordOccurrences === 1) {
      console.log('✅ Word appears exactly once - correct echo behavior');
      this.testResults.push({ test: 'Word Echo', status: 'PASS' });
    } else if (wordOccurrences > 1) {
      console.log('❌ Word echo duplication detected');
      this.testResults.push({ 
        test: 'Word Echo', 
        status: 'FAIL', 
        issue: `Word appears ${wordOccurrences} times (expected 1)`
      });
    } else {
      console.log('⚠️  Word not echoed - possible input issue');
      this.testResults.push({ 
        test: 'Word Echo', 
        status: 'FAIL', 
        issue: 'Word not echoed back'
      });
    }
  }

  async testLineEditing() {
    console.log('\n📝 Testing line editing (backspace)...');
    
    return new Promise((resolve) => {
      this.receivedData = '';
      
      // Type 'hellx' then backspace and 'o'
      const sequence = [
        { data: 'h', delay: 100 },
        { data: 'e', delay: 100 },
        { data: 'l', delay: 100 },
        { data: 'l', delay: 100 },
        { data: 'x', delay: 100 },
        { data: '\b', delay: 200 }, // backspace
        { data: 'o', delay: 100 },
        { data: '\n', delay: 200 } // enter
      ];
      
      this.sendSequence(sequence, () => {
        setTimeout(() => {
          this.analyzeLineEditing();
          resolve();
        }, 500);
      });
    });
  }

  sendSequence(sequence, callback) {
    let index = 0;
    
    const sendNext = () => {
      if (index < sequence.length) {
        const item = sequence[index];
        const displayChar = item.data === '\b' ? '\\b' : 
                           item.data === '\n' ? '\\n' : item.data;
        console.log(`📤 Sending: '${displayChar}'`);
        
        this.ws.send(JSON.stringify({
          type: 'input',
          data: item.data,
          timestamp: Date.now(),
          source: 'editing-test'
        }));
        
        index++;
        setTimeout(sendNext, item.delay);
      } else {
        callback();
      }
    };
    
    sendNext();
  }

  analyzeLineEditing() {
    console.log('\n🔍 Analyzing line editing:');
    console.log(`📥 Final received data: '${this.receivedData}'`);
    
    // Should contain 'hello' without the 'x'
    if (this.receivedData.includes('hello') && !this.receivedData.includes('hellx')) {
      console.log('✅ Line editing works correctly');
      this.testResults.push({ test: 'Line Editing', status: 'PASS' });
    } else {
      console.log('❌ Line editing issues detected');
      this.testResults.push({ 
        test: 'Line Editing', 
        status: 'FAIL', 
        issue: 'Backspace not handled correctly'
      });
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 ECHO FIX VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    let passCount = 0;
    let failCount = 0;
    
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      const details = result.issue ? ` - ${result.issue}` : '';
      
      console.log(`${index + 1}. ${result.test}: ${status} ${result.status}${details}`);
      
      if (result.status === 'PASS') passCount++;
      else failCount++;
    });
    
    console.log('='.repeat(60));
    console.log(`📊 Summary: ${passCount} passed, ${failCount} failed`);
    
    if (failCount === 0) {
      console.log('🎉 ALL TESTS PASSED - Echo fix working correctly!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed - echo fix needs adjustment');
      process.exit(1);
    }
  }
}

// Run validation
const validator = new EchoFixValidator();
validator.runValidation().catch((error) => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});
