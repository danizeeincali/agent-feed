/**
 * FOCUSED TOOL CALL VALIDATION
 * 
 * Specifically tests the tool call visualization and command execution flow
 * Based on findings from comprehensive validation
 */

const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const axios = require('axios');

class FocusedToolCallValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.ws = null;
        this.results = {
            toolCallVisualization: {},
            commandExecution: {},
            realtimeFlow: {}
        };
    }

    async initialize() {
        console.log('🎯 FOCUSED TOOL CALL VALIDATION STARTING');
        console.log('=' .repeat(60));
        
        this.browser = await puppeteer.launch({
            headless: false, // Visible for debugging
            devtools: true,
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        
        // Enhanced console monitoring
        this.page.on('console', (msg) => {
            const text = msg.text();
            if (text.includes('Tool call') || text.includes('●') || text.includes('Bash')) {
                console.log(`[TOOL CALL] ${text}`);
            } else if (msg.type() === 'error') {
                console.error(`[BROWSER ERROR] ${text}`);
            }
        });

        console.log('✅ Browser initialized with debugging enabled');
    }

    async testDirectToolCallVisualization() {
        console.log('\n🔧 DIRECT TOOL CALL VISUALIZATION TEST');
        console.log('-' .repeat(50));

        try {
            // Navigate to application
            await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
            
            // Look for terminal or input areas
            await this.page.waitForTimeout(2000);
            
            // Inject tool call testing
            const toolCallTest = await this.page.evaluate(() => {
                // Look for tool call formatter utilities
                const hasToolCallFormatter = window.ToolCallFormatter !== undefined;
                
                // Check for existing tool call elements
                const existingToolCalls = document.querySelectorAll('[class*="tool"], .tool-call, [data-tool]');
                
                // Test formatting function directly if available
                let formattingTest = false;
                if (window.ToolCallFormatter && window.ToolCallFormatter.formatOutputWithToolCalls) {
                    try {
                        const testOutput = 'Running command: ls -la';
                        const formatted = window.ToolCallFormatter.formatOutputWithToolCalls(testOutput);
                        formattingTest = formatted.includes('●') || formatted !== testOutput;
                    } catch (e) {
                        console.error('Tool call formatting test failed:', e);
                    }
                }
                
                return {
                    hasFormatter: hasToolCallFormatter,
                    existingToolCalls: existingToolCalls.length,
                    formattingWorks: formattingTest,
                    pageText: document.body.textContent.slice(0, 500)
                };
            });
            
            console.log(`   Tool Call Formatter Available: ${toolCallTest.hasFormatter}`);
            console.log(`   Existing Tool Call Elements: ${toolCallTest.existingToolCalls}`);
            console.log(`   Formatting Function Works: ${toolCallTest.formattingWorks}`);
            
            this.results.toolCallVisualization.formatter_available = toolCallTest.hasFormatter;
            this.results.toolCallVisualization.existing_elements = toolCallTest.existingToolCalls > 0;
            this.results.toolCallVisualization.formatting_works = toolCallTest.formattingWorks;
            
            return toolCallTest;
            
        } catch (error) {
            console.error(`❌ Tool call visualization test error: ${error.message}`);
            return false;
        }
    }

    async testClaudeInstanceCreation() {
        console.log('\n🤖 CLAUDE INSTANCE CREATION TEST');
        console.log('-' .repeat(50));

        try {
            // Look for "Create Claude Instance" or similar buttons
            const instanceCreation = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const createButtons = buttons.filter(btn => 
                    btn.textContent?.toLowerCase().includes('create') ||
                    btn.textContent?.toLowerCase().includes('instance') ||
                    btn.textContent?.toLowerCase().includes('claude')
                );
                
                return {
                    totalButtons: buttons.length,
                    createButtons: createButtons.length,
                    buttonTexts: buttons.map(btn => btn.textContent?.substring(0, 30)).filter(Boolean)
                };
            });
            
            console.log(`   Total Buttons Found: ${instanceCreation.totalButtons}`);
            console.log(`   Create Instance Buttons: ${instanceCreation.createButtons}`);
            console.log(`   Button Texts: ${instanceCreation.buttonTexts.join(', ')}`);
            
            // Try to find and click a relevant button
            if (instanceCreation.createButtons > 0) {
                const clicked = await this.page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const createBtn = buttons.find(btn => 
                        btn.textContent?.toLowerCase().includes('create')
                    );
                    
                    if (createBtn) {
                        createBtn.click();
                        return true;
                    }
                    return false;
                });
                
                if (clicked) {
                    console.log('   ✅ Create button clicked');
                    await this.page.waitForTimeout(3000);
                    
                    // Check for any new elements or state changes
                    const afterClick = await this.page.evaluate(() => {
                        const hasTerminal = document.querySelectorAll('[class*="terminal"]').length > 0;
                        const hasLoading = document.body.textContent?.includes('Loading') || 
                                          document.body.textContent?.includes('Creating');
                        const hasNewElements = document.querySelectorAll('div').length;
                        
                        return { hasTerminal, hasLoading, elementCount: hasNewElements };
                    });
                    
                    console.log(`   Terminal Elements: ${afterClick.hasTerminal}`);
                    console.log(`   Loading State: ${afterClick.hasLoading}`);
                    console.log(`   Total Elements: ${afterClick.elementCount}`);
                    
                    this.results.commandExecution.instance_creation = clicked;
                    this.results.commandExecution.terminal_available = afterClick.hasTerminal;
                }
            }
            
            return instanceCreation;
            
        } catch (error) {
            console.error(`❌ Instance creation test error: ${error.message}`);
            return false;
        }
    }

    async testDirectWebSocketCommunication() {
        console.log('\n🔌 DIRECT WEBSOCKET COMMUNICATION TEST');
        console.log('-' .repeat(50));

        return new Promise((resolve) => {
            try {
                this.ws = new WebSocket('ws://localhost:3000/terminal');
                
                this.ws.on('open', () => {
                    console.log('   ✅ WebSocket connected to terminal endpoint');
                    
                    // Send a test command
                    const testCommand = {
                        type: 'input',
                        data: 'echo "Tool Call Test"\n'
                    };
                    
                    this.ws.send(JSON.stringify(testCommand));
                    console.log('   📤 Sent test command:', testCommand);
                });
                
                let messageCount = 0;
                this.ws.on('message', (data) => {
                    messageCount++;
                    console.log(`   📨 Message ${messageCount}:`, data.toString().substring(0, 100));
                    
                    try {
                        const parsed = JSON.parse(data.toString());
                        
                        if (parsed.type === 'data' && parsed.data) {
                            // Check if this looks like tool call output
                            const isToolCall = parsed.data.includes('●') || 
                                             parsed.data.includes('Bash') || 
                                             parsed.data.includes('Tool Call Test');
                            
                            if (isToolCall) {
                                console.log('   🎯 TOOL CALL DETECTED IN WEBSOCKET:');
                                console.log(`   ${parsed.data}`);
                                this.results.realtimeFlow.tool_call_in_ws = true;
                            }
                        }
                        
                        this.results.realtimeFlow.message_count = messageCount;
                        this.results.realtimeFlow.websocket_working = true;
                        
                    } catch (parseError) {
                        // Raw data, not JSON
                        if (data.toString().includes('●') || data.toString().includes('echo')) {
                            console.log('   🎯 TOOL CALL IN RAW DATA:', data.toString().substring(0, 200));
                        }
                    }
                });
                
                this.ws.on('error', (error) => {
                    console.error('   ❌ WebSocket error:', error.message);
                    this.results.realtimeFlow.websocket_working = false;
                    resolve(false);
                });
                
                // Close after 10 seconds
                setTimeout(() => {
                    if (this.ws) {
                        this.ws.close();
                    }
                    console.log(`   📊 WebSocket test complete: ${messageCount} messages received`);
                    resolve(true);
                }, 10000);
                
            } catch (error) {
                console.error(`❌ WebSocket communication test error: ${error.message}`);
                resolve(false);
            }
        });
    }

    async testCommandExecutionFlow() {
        console.log('\n⚡ COMMAND EXECUTION FLOW TEST');
        console.log('-' .repeat(50));

        try {
            // Test different command input scenarios
            const commands = [
                'ls -la',
                'echo "Hello World"',
                'pwd',
                'whoami'
            ];
            
            for (const cmd of commands) {
                console.log(`\n   Testing command: ${cmd}`);
                
                // Try to find input elements
                const inputResult = await this.page.evaluate((command) => {
                    // Look for various input types
                    const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"], .xterm-helper-textarea');
                    
                    if (inputs.length > 0) {
                        const input = inputs[0];
                        
                        // Try to focus and type
                        try {
                            input.focus();
                            input.value = command;
                            
                            // Trigger input events
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                            
                            return {
                                inputFound: true,
                                inputType: input.tagName.toLowerCase(),
                                value: input.value
                            };
                        } catch (e) {
                            return {
                                inputFound: true,
                                inputType: input.tagName.toLowerCase(),
                                error: e.message
                            };
                        }
                    }
                    
                    return { inputFound: false };
                }, cmd);
                
                console.log(`   Input Result:`, inputResult);
                
                if (inputResult.inputFound) {
                    // Wait for potential output
                    await this.page.waitForTimeout(3000);
                    
                    // Check for command output or tool call visualization
                    const outputCheck = await this.page.evaluate((command) => {
                        const pageText = document.body.textContent;
                        const hasCommandOutput = pageText.includes(command) || 
                                               pageText.includes('total') || 
                                               pageText.includes('Hello World') ||
                                               pageText.includes('workspaces');
                        
                        const hasToolCallVisualization = pageText.includes('●') || 
                                                        pageText.includes('Bash(') ||
                                                        document.querySelector('[class*="tool-call"]') !== null;
                        
                        return {
                            hasOutput: hasCommandOutput,
                            hasToolCall: hasToolCallVisualization,
                            textSample: pageText.substring(0, 500)
                        };
                    }, cmd);
                    
                    console.log(`   Output Check:`, outputCheck);
                    
                    if (outputCheck.hasToolCall) {
                        this.results.commandExecution.tool_call_visualization = true;
                        console.log('   🎯 TOOL CALL VISUALIZATION CONFIRMED!');
                    }
                    
                    if (outputCheck.hasOutput) {
                        this.results.commandExecution.command_execution = true;
                        console.log('   ✅ Command execution confirmed');
                    }
                }
            }
            
            return true;
            
        } catch (error) {
            console.error(`❌ Command execution flow test error: ${error.message}`);
            return false;
        }
    }

    async generateFocusedReport() {
        console.log('\n📋 FOCUSED VALIDATION REPORT');
        console.log('=' .repeat(60));
        
        console.log('\n🔧 TOOL CALL VISUALIZATION:');
        Object.entries(this.results.toolCallVisualization).forEach(([key, value]) => {
            const status = value ? '✅ WORKING' : '❌ NOT WORKING';
            const label = key.replace(/_/g, ' ').toUpperCase();
            console.log(`   ${label}: ${status}`);
        });
        
        console.log('\n⚡ COMMAND EXECUTION:');
        Object.entries(this.results.commandExecution).forEach(([key, value]) => {
            const status = value ? '✅ WORKING' : '❌ NOT WORKING';
            const label = key.replace(/_/g, ' ').toUpperCase();
            console.log(`   ${label}: ${status}`);
        });
        
        console.log('\n🔄 REAL-TIME FLOW:');
        Object.entries(this.results.realtimeFlow).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
                const status = value ? '✅ WORKING' : '❌ NOT WORKING';
                const label = key.replace(/_/g, ' ').toUpperCase();
                console.log(`   ${label}: ${status}`);
            } else {
                const label = key.replace(/_/g, ' ').toUpperCase();
                console.log(`   ${label}: ${value}`);
            }
        });
        
        // Calculate focused pass rate
        const allValues = Object.values({
            ...this.results.toolCallVisualization,
            ...this.results.commandExecution,
            ...Object.fromEntries(
                Object.entries(this.results.realtimeFlow).filter(([k, v]) => typeof v === 'boolean')
            )
        });
        
        const passCount = allValues.filter(Boolean).length;
        const totalCount = allValues.length;
        const focusedPassRate = totalCount > 0 ? ((passCount / totalCount) * 100).toFixed(1) : 0;
        
        console.log('\n📊 FOCUSED ASSESSMENT:');
        console.log(`   Tool Call Tests: ${passCount}/${totalCount} passed`);
        console.log(`   Focused Pass Rate: ${focusedPassRate}%`);
        
        console.log('\n🎯 FOCUSED VERDICT:');
        if (focusedPassRate >= 80) {
            console.log('   ✅ TOOL CALL SYSTEM WORKING');
        } else if (focusedPassRate >= 60) {
            console.log('   ⚠️  TOOL CALL SYSTEM PARTIALLY WORKING');
        } else {
            console.log('   ❌ TOOL CALL SYSTEM NEEDS WORK');
        }
        
        return {
            results: this.results,
            focusedPassRate,
            verdict: focusedPassRate >= 60 ? 'WORKING' : 'NEEDS_WORK'
        };
    }

    async cleanup() {
        if (this.ws) {
            this.ws.close();
        }
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log('\n✅ Focused validation cleanup complete');
    }

    async runFocusedValidation() {
        try {
            await this.initialize();
            await this.testDirectToolCallVisualization();
            await this.testClaudeInstanceCreation();
            await this.testDirectWebSocketCommunication();
            await this.testCommandExecutionFlow();
            
            return await this.generateFocusedReport();
        } catch (error) {
            console.error('❌ Focused validation failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Execute if run directly
if (require.main === module) {
    (async () => {
        const validator = new FocusedToolCallValidator();
        
        try {
            const result = await validator.runFocusedValidation();
            process.exit(result.verdict === 'WORKING' ? 0 : 1);
        } catch (error) {
            console.error('Focused validation suite failed:', error);
            process.exit(1);
        }
    })();
}

module.exports = FocusedToolCallValidator;