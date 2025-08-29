#!/usr/bin/env node

import { readdir } from 'fs/promises';
import { join } from 'path';
import colors from 'colors';

class TDDLondonTestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async loadTests() {
    const testFiles = await readdir('.');
    for (const file of testFiles) {
      if (file.endsWith('.test.js')) {
        console.log(colors.blue(`Loading test: ${file}`));
        try {
          const testModule = await import(`./${file}`);
          if (testModule.default) {
            this.tests.push({
              name: file,
              testSuite: testModule.default
            });
          }
        } catch (error) {
          console.error(colors.red(`Failed to load ${file}: ${error.message}`));
        }
      }
    }
  }

  async runTests() {
    console.log(colors.yellow('🧪 TDD London School Integration Test Suite'));
    console.log(colors.yellow('Testing Frontend-Backend Network Communication'));
    console.log(colors.yellow('================================================'));

    for (const { name, testSuite } of this.tests) {
      console.log(colors.cyan(`\n📋 Running ${name}...`));
      
      try {
        await testSuite.run();
        this.results.passed++;
        console.log(colors.green(`✅ ${name} completed`));
      } catch (error) {
        this.results.failed++;
        this.results.errors.push({
          test: name,
          error: error.message,
          stack: error.stack
        });
        console.log(colors.red(`❌ ${name} failed: ${error.message}`));
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log(colors.yellow('\n================================================'));
    console.log(colors.yellow('📊 Test Results Summary'));
    console.log(colors.green(`✅ Passed: ${this.results.passed}`));
    console.log(colors.red(`❌ Failed: ${this.results.failed}`));

    if (this.results.errors.length > 0) {
      console.log(colors.red('\n🚨 NETWORK ERRORS EXPOSED:'));
      this.results.errors.forEach((error, index) => {
        console.log(colors.red(`\n${index + 1}. ${error.test}:`));
        console.log(colors.red(`   Error: ${error.error}`));
        if (process.argv.includes('--verbose')) {
          console.log(colors.gray(`   Stack: ${error.stack}`));
        }
      });
    }

    console.log(colors.yellow('\n🎯 TDD London School: Tests should FAIL first to expose issues!'));
  }
}

// Run the tests
const runner = new TDDLondonTestRunner();
await runner.loadTests();
await runner.runTests();

export default TDDLondonTestRunner;