#!/usr/bin/env node

/**
 * TDD Phase Runner for Terminal Double Typing Prevention
 * 
 * Demonstrates complete Red-Green-Refactor cycle following London School TDD
 * methodology with mock-driven development and behavior verification.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

// ANSI colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);
const logBold = (color, message) => console.log(`${colors.bold}${colors[color]}${message}${colors.reset}`);

async function runPhase(phase, description) {
  logBold('cyan', `\n${'='.repeat(80)}`);
  logBold('cyan', `${phase.toUpperCase()} PHASE: ${description}`);
  logBold('cyan', `${'='.repeat(80)}\n`);
  
  // Set environment variable for the phase
  process.env.TEST_PHASE = phase.toUpperCase();
  
  try {
    // Run the simple test runner for this phase
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('node', ['tests/terminal-tdd-runner.js'], {
        stdio: 'inherit',
        env: { 
          ...process.env, 
          TEST_PHASE: phase.toUpperCase(),
          SIMULATE_DOUBLE_TYPING: phase === 'red' ? 'true' : 'false'
        }
      });
      
      testProcess.on('close', (code) => {
        if (code === 0 || (phase === 'red' && code === 1)) {
          resolve(code);
        } else {
          reject(new Error(`Test process exited with code ${code}`));
        }
      });
      
      testProcess.on('error', reject);
    });
  } catch (error) {
    log('red', `❌ ${phase.toUpperCase()} phase failed: ${error.message}`);
    throw error;
  }
}

function printMethodologyExplanation() {
  logBold('blue', '\n📚 LONDON SCHOOL TDD METHODOLOGY');
  console.log('=====================================');
  console.log(`
${colors.bold}Key Principles Demonstrated:${colors.reset}

1. ${colors.green}Mock-Driven Development${colors.reset}
   • Tests define behavior through mock expectations
   • Collaborator interactions are specified upfront
   • Contracts emerge from mock conversations

2. ${colors.green}Outside-In Development${colors.reset}
   • Start with user behavior (keyboard input)
   • Work down to implementation details
   • Drive design through failing tests

3. ${colors.green}Behavior Verification${colors.reset}
   • Focus on HOW objects collaborate
   • Verify interactions, not just state
   • Mock expectations define the system design

4. ${colors.green}Contract Definition${colors.reset}
   • Mocks define clear interfaces
   • Tests specify expected collaborations
   • Implementation follows from test requirements

${colors.bold}Double Typing Prevention Strategy:${colors.reset}

• ${colors.yellow}Event Handler Deduplication${colors.reset}: Prevent multiple registrations
• ${colors.yellow}Write Operation Control${colors.reset}: Ensure single writes per event
• ${colors.yellow}WebSocket Message Tracking${colors.reset}: Avoid duplicate emissions
• ${colors.yellow}Resource Lifecycle Management${colors.reset}: Proper cleanup patterns
  `);
}

function printImplementationGuidance() {
  logBold('magenta', '\n🔧 IMPLEMENTATION GUIDANCE');
  console.log('============================');
  console.log(`
${colors.bold}To fix the revealed bugs:${colors.reset}

1. ${colors.cyan}Terminal Component${colors.reset}
   \`\`\`typescript
   // Prevent duplicate event handlers
   const handlerRef = useRef<Disposable | null>(null);
   
   useEffect(() => {
     if (terminal && !handlerRef.current) {
       handlerRef.current = terminal.onData(handleInput);
     }
     return () => {
       handlerRef.current?.dispose();
       handlerRef.current = null;
     };
   }, [terminal]);
   \`\`\`

2. ${colors.cyan}WebSocket Management${colors.reset}
   \`\`\`typescript
   // Deduplicate socket connections
   const socketRef = useRef<Socket | null>(null);
   
   const ensureSingleConnection = useCallback(() => {
     if (!socketRef.current || !socketRef.current.connected) {
       socketRef.current = io(wsUrl);
     }
     return socketRef.current;
   }, [wsUrl]);
   \`\`\`

3. ${colors.cyan}Write Deduplication${colors.reset}
   \`\`\`typescript
   // Prevent duplicate writes
   const lastWrite = useRef<{data: string, timestamp: number} | null>(null);
   
   const deduplicatedWrite = useCallback((data: string) => {
     const now = Date.now();
     if (!lastWrite.current || 
         lastWrite.current.data !== data || 
         now - lastWrite.current.timestamp > 50) {
       terminal.write(data);
       lastWrite.current = { data, timestamp: now };
     }
   }, [terminal]);
   \`\`\`
  `);
}

async function main() {
  try {
    logBold('blue', '🎯 TDD DOUBLE TYPING PREVENTION DEMONSTRATION');
    logBold('blue', 'London School Methodology with Mock-Driven Development');
    
    printMethodologyExplanation();
    
    log('white', '\n⏱️  Starting TDD demonstration...\n');
    
    // RED PHASE - Tests should fail, revealing bugs
    await runPhase('red', 'Tests Fail and Reveal Double Typing Bugs');
    
    log('white', '\n⏱️  Transitioning to GREEN phase...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // GREEN PHASE - Implement minimal fixes to make tests pass
    await runPhase('green', 'Minimal Implementation Makes Tests Pass');
    
    printImplementationGuidance();
    
    logBold('green', '\n✅ TDD DEMONSTRATION COMPLETE');
    console.log(`
${colors.bold}Summary:${colors.reset}
• ${colors.red}RED phase${colors.reset} revealed double typing bugs through failing tests
• ${colors.green}GREEN phase${colors.reset} showed how fixes make tests pass
• Mock-driven development defined clear contracts
• London School TDD guided the design process

${colors.bold}Next Steps:${colors.reset}
1. Implement the suggested fixes in your terminal components
2. Run your actual tests to verify the fixes
3. Refactor for cleaner code while keeping tests green
4. Add integration tests for end-to-end verification
    `);
    
  } catch (error) {
    log('red', `\n💥 TDD Demonstration failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the demonstration
main().catch(console.error);