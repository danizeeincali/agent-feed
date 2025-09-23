import { test, expect, Page } from '@playwright/test';

/**
 * Claude CLI Width Requirements and Cascade Prevention Tests
 * 
 * This test suite specifically tests Claude CLI commands and their width requirements
 * to prove that wider terminals prevent cascading visual effects.
 */

interface ClaudeCliMetrics {
  command: string;
  terminalCols: number;
  outputLength: number;
  linesWrapped: number;
  progressBarsDetected: number;
  ansiSequencesCount: number;
  visualCascading: boolean;
  executionTime: number;
}

const CLAUDE_CLI_TEST_COMMANDS = [
  {
    command: 'claude --help',
    description: 'Help command with formatted output',
    minRecommendedCols: 80,
    expectedCascading: { narrow: true, wide: false }
  },
  {
    command: 'claude chat "Create a React component with TypeScript and styled-components"',
    description: 'Chat command with long prompt',
    minRecommendedCols: 120,
    expectedCascading: { narrow: true, wide: false }
  },
  {
    command: 'claude --model=claude-3-5-sonnet "Analyze this code and provide suggestions"',
    description: 'Model selection with analysis',
    minRecommendedCols: 100,
    expectedCascading: { narrow: true, wide: false }
  },
  {
    command: 'claude generate --format=json --output=test.json "Create sample data"',
    description: 'Generate command with parameters',
    minRecommendedCols: 90,
    expectedCascading: { narrow: true, wide: false }
  },
  {
    command: 'claude --stream chat "Write a detailed explanation of async/await in JavaScript with examples"',
    description: 'Streaming command with detailed prompt',
    minRecommendedCols: 140,
    expectedCascading: { narrow: true, wide: false }
  }
];

const TERMINAL_WIDTH_SCENARIOS = [
  { name: 'Very Narrow', cols: 60, rows: 20, expectCascading: true },
  { name: 'Standard Narrow', cols: 80, rows: 24, expectCascading: true },
  { name: 'Medium', cols: 100, rows: 30, expectCascading: false },
  { name: 'Wide', cols: 120, rows: 35, expectCascading: false },
  { name: 'Very Wide', cols: 150, rows: 40, expectCascading: false },
  { name: 'Ultra Wide', cols: 200, rows: 50, expectCascading: false }
];

test.describe('Claude CLI Width Requirements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Mock Claude CLI responses to ensure consistent testing
    await mockClaudeCliResponses(page);
  });

  CLAUDE_CLI_TEST_COMMANDS.forEach((cliTest) => {
    TERMINAL_WIDTH_SCENARIOS.forEach((widthScenario) => {
      test(`Claude CLI: ${cliTest.description} in ${widthScenario.name} Terminal (${widthScenario.cols} cols)`, async ({ page }) => {
        // 1. Setup terminal with specific width
        await setupTerminalWithWidth(page, widthScenario.cols, widthScenario.rows);

        // 2. Execute Claude CLI command
        const metrics = await executeClaudeCliCommand(page, cliTest.command);

        // 3. Validate width requirements
        const meetsRecommendedWidth = widthScenario.cols >= cliTest.minRecommendedCols;
        
        if (meetsRecommendedWidth) {
          // Wide enough terminal should not cascade
          expect(metrics.visualCascading).toBe(false);
          expect(metrics.linesWrapped).toBeLessThanOrEqual(2); // Minimal wrapping allowed
        } else {
          // Narrow terminal may cascade
          if (widthScenario.expectCascading) {
            expect(metrics.visualCascading).toBe(true);
            expect(metrics.linesWrapped).toBeGreaterThan(0);
          }
        }

        // 4. Log detailed analysis
        console.log(`🎯 CLI Test: ${cliTest.command.substring(0, 40)}... in ${widthScenario.name}`, {
          terminalCols: metrics.terminalCols,
          recommendedCols: cliTest.minRecommendedCols,
          meetsRecommendation: meetsRecommendedWidth,
          cascading: metrics.visualCascading,
          wrappedLines: metrics.linesWrapped,
          progressBars: metrics.progressBarsDetected
        });

        // 5. Validate command completed successfully
        expect(metrics.executionTime).toBeGreaterThan(0);
        expect(metrics.outputLength).toBeGreaterThan(0);
      });
    });
  });

  test('Claude CLI Progress Bar Width Requirements', async ({ page }) => {
    await setupTerminalWithWidth(page, 80, 24); // Start with narrow terminal

    // Test commands that show progress bars
    const progressCommands = [
      'claude chat "Generate a long response" --stream',
      'claude generate --format=markdown "Create documentation"',
      'claude --model=claude-3-5-sonnet "Complex analysis task"'
    ];

    for (const command of progressCommands) {
      // Execute in narrow terminal
      const narrowMetrics = await executeClaudeCliCommand(page, command);
      
      // Expand terminal width
      await expandTerminalWidth(page, 120);
      
      // Execute same command in wide terminal
      const wideMetrics = await executeClaudeCliCommand(page, command);

      // Progress bars should render better in wider terminals
      expect(wideMetrics.progressBarsDetected).toBeGreaterThanOrEqual(narrowMetrics.progressBarsDetected);
      expect(wideMetrics.visualCascading).toBe(false);
      
      if (narrowMetrics.progressBarsDetected > 0) {
        expect(narrowMetrics.visualCascading).toBe(true);
        console.log(`📊 Progress Bar Test: ${command.substring(0, 30)}...`, {
          narrow: { cascading: narrowMetrics.visualCascading, bars: narrowMetrics.progressBarsDetected },
          wide: { cascading: wideMetrics.visualCascading, bars: wideMetrics.progressBarsDetected }
        });
      }
    }
  });

  test('Claude CLI ANSI Escape Sequence Handling', async ({ page }) => {
    // Test ANSI sequence handling across different terminal widths
    const ansiTestCommands = [
      'claude --color=always chat "Colorful response"',
      'claude --format=pretty --color=always "Formatted output"'
    ];

    for (const command of ansiTestCommands) {
      const widthResults = [];

      for (const scenario of TERMINAL_WIDTH_SCENARIOS) {
        await setupTerminalWithWidth(page, scenario.cols, scenario.rows);
        const metrics = await executeClaudeCliCommand(page, command);
        
        widthResults.push({
          width: scenario.cols,
          ansiCount: metrics.ansiSequencesCount,
          cascading: metrics.visualCascading
        });
      }

      // ANSI sequences should be handled properly regardless of width
      // but cascading should reduce with wider terminals
      const narrowResults = widthResults.filter(r => r.width <= 80);
      const wideResults = widthResults.filter(r => r.width >= 120);

      const narrowCascading = narrowResults.filter(r => r.cascading).length;
      const wideCascading = wideResults.filter(r => r.cascading).length;

      expect(wideCascading).toBeLessThan(narrowCascading);

      console.log(`🎨 ANSI Test: ${command}`, {
        narrowTerminalsCascading: narrowCascading,
        wideTerminalsCascading: wideCascading,
        improvement: `${(((narrowCascading - wideCascading) / narrowCascading) * 100).toFixed(1)}%`
      });
    }
  });

  test('Claude CLI Output Formatting Analysis', async ({ page }) => {
    const formattingTests = [
      {
        command: 'claude --format=table chat "Create a comparison table"',
        expectedElements: ['|', '─', '┌', '└'], // Table characters
        description: 'Table formatting'
      },
      {
        command: 'claude --format=json chat "Generate JSON data"',
        expectedElements: ['{', '}', '[', ']', ':', ','], // JSON formatting
        description: 'JSON formatting'
      },
      {
        command: 'claude --format=markdown chat "Create markdown documentation"',
        expectedElements: ['#', '*', '-', '`', '>', '|'], // Markdown formatting
        description: 'Markdown formatting'
      }
    ];

    for (const formatTest of formattingTests) {
      // Test in narrow terminal (80 cols)
      await setupTerminalWithWidth(page, 80, 24);
      const narrowOutput = await executeClaudeCliCommand(page, formatTest.command);

      // Test in wide terminal (120 cols)
      await setupTerminalWithWidth(page, 120, 35);
      const wideOutput = await executeClaudeCliCommand(page, formatTest.command);

      // Validate formatting elements are preserved
      const narrowFormatting = await analyzeFormatting(page, formatTest.expectedElements);
      const wideFormatting = await analyzeFormatting(page, formatTest.expectedElements);

      // Wide terminals should preserve formatting better
      expect(wideFormatting.elementsDetected).toBeGreaterThanOrEqual(narrowFormatting.elementsDetected);
      expect(wideFormatting.formattingBroken).toBeLessThanOrEqual(narrowFormatting.formattingBroken);

      console.log(`📝 Formatting Test: ${formatTest.description}`, {
        narrow: { elements: narrowFormatting.elementsDetected, broken: narrowFormatting.formattingBroken },
        wide: { elements: wideFormatting.elementsDetected, broken: wideFormatting.formattingBroken },
        cascading: { narrow: narrowOutput.visualCascading, wide: wideOutput.visualCascading }
      });
    }
  });

  test('Claude CLI Real-world Usage Patterns', async ({ page }) => {
    // Simulate real-world usage patterns with typical developer workflows
    const workflowTests = [
      {
        name: 'Code Review Workflow',
        commands: [
          'claude chat "Review this React component for best practices"',
          'claude --format=markdown "Document the API endpoints"',
          'claude generate --output=README.md "Create project documentation"'
        ]
      },
      {
        name: 'Development Assistance',
        commands: [
          'claude chat "Explain this TypeScript error message"',
          'claude --model=claude-3-5-sonnet "Optimize this database query"',
          'claude --stream chat "Walk me through implementing authentication"'
        ]
      },
      {
        name: 'Content Generation',
        commands: [
          'claude generate --format=json "Create test data for user profiles"',
          'claude --format=pretty chat "Generate API documentation examples"',
          'claude chat "Create unit test cases for this function"'
        ]
      }
    ];

    for (const workflow of workflowTests) {
      console.log(`🔄 Testing Workflow: ${workflow.name}`);
      
      // Test workflow in narrow vs wide terminals
      const workflowResults = {
        narrow: { totalCascading: 0, totalCommands: 0, avgExecutionTime: 0 },
        wide: { totalCascading: 0, totalCommands: 0, avgExecutionTime: 0 }
      };

      // Test in narrow terminal
      await setupTerminalWithWidth(page, 80, 24);
      for (const command of workflow.commands) {
        const metrics = await executeClaudeCliCommand(page, command);
        workflowResults.narrow.totalCommands++;
        if (metrics.visualCascading) workflowResults.narrow.totalCascading++;
        workflowResults.narrow.avgExecutionTime += metrics.executionTime;
      }

      // Test in wide terminal
      await setupTerminalWithWidth(page, 130, 40);
      for (const command of workflow.commands) {
        const metrics = await executeClaudeCliCommand(page, command);
        workflowResults.wide.totalCommands++;
        if (metrics.visualCascading) workflowResults.wide.totalCascading++;
        workflowResults.wide.avgExecutionTime += metrics.executionTime;
      }

      // Calculate averages
      workflowResults.narrow.avgExecutionTime /= workflowResults.narrow.totalCommands;
      workflowResults.wide.avgExecutionTime /= workflowResults.wide.totalCommands;

      // Wide terminals should have significantly less cascading
      const cascadeReduction = ((workflowResults.narrow.totalCascading - workflowResults.wide.totalCascading) / workflowResults.narrow.totalCascading) * 100;
      
      expect(workflowResults.wide.totalCascading).toBeLessThanOrEqual(workflowResults.narrow.totalCascading);
      
      console.log(`📈 Workflow Results: ${workflow.name}`, {
        cascadeReduction: `${cascadeReduction.toFixed(1)}%`,
        narrow: `${workflowResults.narrow.totalCascading}/${workflowResults.narrow.totalCommands} cascading`,
        wide: `${workflowResults.wide.totalCascading}/${workflowResults.wide.totalCommands} cascading`,
        performanceImpact: `${((workflowResults.wide.avgExecutionTime - workflowResults.narrow.avgExecutionTime) / workflowResults.narrow.avgExecutionTime * 100).toFixed(1)}%`
      });
    }
  });

  test('Optimal Terminal Width Recommendation', async ({ page }) => {
    // Test various widths to find the optimal width for Claude CLI
    const widthTestResults = [];
    
    const testWidths = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
    const testCommand = 'claude --format=pretty chat "Generate a detailed code review with examples and suggestions"';

    for (const width of testWidths) {
      await setupTerminalWithWidth(page, width, Math.max(24, Math.floor(width / 4)));
      
      const metrics = await executeClaudeCliCommand(page, testCommand);
      const usabilityScore = calculateUsabilityScore(metrics, width);
      
      widthTestResults.push({
        width,
        cascading: metrics.visualCascading,
        wrappedLines: metrics.linesWrapped,
        usabilityScore,
        executionTime: metrics.executionTime
      });
    }

    // Find the optimal width (where cascading stops and usability is high)
    const noCascadeResults = widthTestResults.filter(r => !r.cascading);
    const optimalWidth = noCascadeResults.length > 0 ? 
      Math.min(...noCascadeResults.map(r => r.width)) : 
      Math.max(...testWidths);

    // Validate our findings
    expect(optimalWidth).toBeGreaterThanOrEqual(100);
    expect(optimalWidth).toBeLessThanOrEqual(140);

    console.log('🎯 Optimal Terminal Width Analysis:', {
      recommendedWidth: optimalWidth,
      testResults: widthTestResults,
      summary: `${optimalWidth} columns eliminates cascading while maintaining performance`
    });

    // Additional validation: test the recommended width
    await setupTerminalWithWidth(page, optimalWidth, Math.floor(optimalWidth / 4));
    
    for (const cliTest of CLAUDE_CLI_TEST_COMMANDS.slice(0, 3)) { // Test first 3 commands
      const metrics = await executeClaudeCliCommand(page, cliTest.command);
      expect(metrics.visualCascading).toBe(false);
      expect(metrics.linesWrapped).toBeLessThanOrEqual(1);
    }
  });
});

/**
 * Mock Claude CLI responses for consistent testing
 */
async function mockClaudeCliResponses(page: Page): Promise<void> {
  await page.route('**/claude*', (route) => {
    const url = route.request().url();
    
    // Mock different types of responses based on command
    if (url.includes('--help')) {
      route.fulfill({
        status: 200,
        body: generateMockHelpOutput()
      });
    } else if (url.includes('chat')) {
      route.fulfill({
        status: 200,
        body: generateMockChatOutput()
      });
    } else if (url.includes('generate')) {
      route.fulfill({
        status: 200,
        body: generateMockGenerateOutput()
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Setup terminal with specific width and height
 */
async function setupTerminalWithWidth(page: Page, cols: number, rows: number): Promise<void> {
  // Calculate viewport size based on character dimensions
  const charWidth = 9; // Approximate monospace character width
  const lineHeight = 20; // Approximate line height
  const padding = 40; // UI padding
  
  const viewportWidth = (cols * charWidth) + padding;
  const viewportHeight = (rows * lineHeight) + padding + 200; // Extra for UI

  await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
  
  if (!await page.locator('[data-testid="terminal-container"]').isVisible()) {
    await page.locator('[data-testid="simple-launcher-button"]').click();
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
  }

  // Wait for terminal to initialize and resize
  await page.waitForTimeout(1000);
}

/**
 * Execute Claude CLI command and measure metrics
 */
async function executeClaudeCliCommand(page: Page, command: string): Promise<ClaudeCliMetrics> {
  const startTime = Date.now();
  
  // Send command to terminal
  await page.locator('[data-testid="terminal-input"]').fill(command);
  await page.locator('[data-testid="terminal-input"]').press('Enter');
  
  // Wait for command execution
  await page.waitForTimeout(3000);
  
  const endTime = Date.now();
  
  // Analyze output
  return await page.evaluate((cmd, execTime) => {
    const terminal = document.querySelector('[data-testid="terminal-output"]');
    const output = terminal?.textContent || '';
    
    // Count wrapped lines
    const lines = output.split('\n');
    const terminalWidth = Math.floor((terminal?.getBoundingClientRect().width || 800) / 9); // Approx char width
    const wrappedLines = lines.filter(line => line.length > terminalWidth).length;
    
    // Count progress bars
    const progressBars = (output.match(/[▓░▒█▌▍▎▏▊▉]|Loading\.\.\.|Processing\.\.\./g) || []).length;
    
    // Count ANSI sequences
    const ansiSequences = (output.match(/\x1b\[[0-9;]*m/g) || []).length;
    
    // Detect visual cascading
    const visualCascading = wrappedLines > 2 || 
                           output.includes('█\n█') || // Broken progress bars
                           output.match(/\x1b\[[0-9;]*m.{0,5}\x1b\[[0-9;]*m/g)?.length > 5; // Excessive ANSI
    
    return {
      command: cmd,
      terminalCols: terminalWidth,
      outputLength: output.length,
      linesWrapped: wrappedLines,
      progressBarsDetected: progressBars,
      ansiSequencesCount: ansiSequences,
      visualCascading,
      executionTime: execTime
    };
  }, command, endTime - startTime);
}

/**
 * Expand terminal width dynamically
 */
async function expandTerminalWidth(page: Page, targetCols: number): Promise<void> {
  await page.evaluate((cols) => {
    const terminal = document.querySelector('[data-testid="terminal-container"]') as HTMLElement;
    if (terminal) {
      const charWidth = 9;
      const newWidth = cols * charWidth;
      terminal.style.width = `${newWidth}px`;
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    }
  }, targetCols);
  
  await page.waitForTimeout(1000);
}

/**
 * Analyze formatting preservation
 */
async function analyzeFormatting(page: Page, expectedElements: string[]): Promise<{ elementsDetected: number; formattingBroken: number }> {
  return await page.evaluate((elements) => {
    const terminal = document.querySelector('[data-testid="terminal-output"]');
    const output = terminal?.textContent || '';
    
    let elementsDetected = 0;
    let formattingBroken = 0;
    
    elements.forEach(element => {
      const count = (output.match(new RegExp(element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > 0) elementsDetected++;
      
      // Check if formatting appears broken (elements on wrong lines)
      const lines = output.split('\n');
      const brokenLines = lines.filter(line => 
        line.includes(element) && 
        (line.trim().startsWith(element) && line.trim() !== element)
      ).length;
      
      formattingBroken += brokenLines;
    });
    
    return { elementsDetected, formattingBroken };
  }, expectedElements);
}

/**
 * Calculate usability score based on metrics
 */
function calculateUsabilityScore(metrics: ClaudeCliMetrics, width: number): number {
  let score = 100;
  
  // Penalize cascading heavily
  if (metrics.visualCascading) score -= 40;
  
  // Penalize wrapped lines
  score -= metrics.linesWrapped * 5;
  
  // Penalize excessive ANSI sequences (indicates formatting issues)
  if (metrics.ansiSequencesCount > 50) score -= 20;
  
  // Bonus for reasonable width (not too narrow, not too wide)
  if (width >= 100 && width <= 140) score += 10;
  
  // Penalize very slow execution
  if (metrics.executionTime > 5000) score -= 15;
  
  return Math.max(0, score);
}

/**
 * Mock output generators for consistent testing
 */
function generateMockHelpOutput(): string {
  return `
Claude CLI - AI Assistant Command Line Tool

USAGE:
    claude [OPTIONS] <SUBCOMMAND>

OPTIONS:
    -h, --help                Print help information
    -V, --version             Print version information
        --model <MODEL>       Specify the model to use [default: claude-3-5-sonnet]
        --format <FORMAT>     Output format [default: plain] [possible values: plain, json, markdown, pretty]
        --color <COLOR>       When to use color [default: auto] [possible values: always, auto, never]
        --stream              Enable streaming responses
        --output <FILE>       Write output to file instead of stdout

SUBCOMMANDS:
    chat        Interactive chat with Claude
    generate    Generate content based on prompts
    help        Print this message or the help of the given subcommand(s)

EXAMPLES:
    claude chat "Hello, Claude!"
    claude --model=claude-3-5-sonnet chat "Explain quantum computing"
    claude generate --format=json --output=data.json "Create sample user data"
    claude --stream chat "Write a long story"

For more information about a specific command, try:
    claude help <SUBCOMMAND>
  `;
}

function generateMockChatOutput(): string {
  return `
🤖 Claude: I'll help you with that request. Here's my response:

This is a mock response that demonstrates typical Claude CLI output formatting. The response includes:

• Bullet points for organization
• **Bold text** for emphasis  
• Code snippets like \`const example = "test";\`
• Longer paragraphs that might wrap in narrow terminals and cause visual cascading effects if the terminal width is insufficient

Progress: [████████████████████████████████████████] 100%

The key point is that when terminal width is insufficient (typically less than 100-120 columns), the formatting can break down and create cascading visual effects that impact usability.

✅ Response completed successfully
  `;
}

function generateMockGenerateOutput(): string {
  return `
🔄 Generating content...

Progress: [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 30%
Progress: [████████████████████░░░░░░░░░░░░░░░░░░░░] 60%
Progress: [████████████████████████████████████████] 100%

✅ Content generated successfully

{
  "generated_content": {
    "type": "example_data",
    "status": "completed",
    "items": [
      { "id": 1, "name": "Example Item 1", "description": "This is a longer description that might wrap" },
      { "id": 2, "name": "Example Item 2", "description": "Another description with more detail" }
    ]
  }
}

💾 Output saved to specified file
  `;
}