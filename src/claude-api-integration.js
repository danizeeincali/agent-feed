#!/usr/bin/env node

/**
 * Claude Code API Integration
 * Real API-based communication with Claude Code instead of terminal PTY
 * Uses --print --output-format json for structured responses
 */

const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

class ClaudeCodeAPIClient {
  constructor(options = {}) {
    this.workingDirectory = options.workingDirectory || process.cwd();
    this.allowedTools = options.allowedTools || [];
    this.disallowedTools = options.disallowedTools || [];
    this.sessionId = null;
    this.debug = options.debug || false;
  }

  /**
   * Send prompt to Claude Code API and get structured JSON response
   * @param {string} prompt - The prompt to send to Claude
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Claude Code API response
   */
  async sendPrompt(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '--print',
        '--output-format', 'json',
        '--dangerously-skip-permissions', // For sandbox environments
        prompt
      ];

      // Add allowed/disallowed tools if specified
      if (this.allowedTools.length > 0) {
        args.push('--allowed-tools', ...this.allowedTools);
      }
      if (this.disallowedTools.length > 0) {
        args.push('--disallowed-tools', ...this.disallowedTools);
      }

      if (this.debug) {
        console.log(`🔍 Claude API: Executing command: claude ${args.join(' ')}`);
      }

      const claudeProcess = spawn('claude', args, {
        cwd: this.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });

      let stdout = '';
      let stderr = '';

      claudeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      claudeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      claudeProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Claude API Error (code ${code}):`, stderr);
          reject(new Error(`Claude Code API failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const response = JSON.parse(stdout.trim());
          
          // Store session ID for continuity
          if (response.session_id) {
            this.sessionId = response.session_id;
          }

          if (this.debug) {
            console.log(`✅ Claude API Response:`, {
              result: response.result?.substring(0, 100) + '...',
              success: !response.is_error,
              duration: response.duration_ms,
              session: response.session_id?.substring(0, 8)
            });
          }

          resolve(response);
        } catch (parseError) {
          console.error('Failed to parse Claude Code JSON response:', parseError);
          console.error('Raw stdout:', stdout);
          reject(new Error(`Invalid JSON response from Claude Code: ${parseError.message}`));
        }
      });

      claudeProcess.on('error', (error) => {
        console.error('Claude API Process Error:', error);
        reject(new Error(`Failed to start Claude Code process: ${error.message}`));
      });

      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        claudeProcess.kill('SIGTERM');
        reject(new Error('Claude Code API request timed out'));
      }, options.timeout || 30000);

      claudeProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Send a coding-specific prompt to Claude
   * @param {string} task - Coding task description
   * @param {object} context - Additional context (files, etc.)
   * @returns {Promise<object>} - Claude Code response with code
   */
  async generateCode(task, context = {}) {
    let prompt = task;
    
    if (context.files && context.files.length > 0) {
      prompt += '\n\nContext files:\n' + context.files.map(f => `- ${f}`).join('\n');
    }
    
    if (context.framework) {
      prompt += `\n\nUse ${context.framework} framework.`;
    }

    return this.sendPrompt(prompt);
  }

  /**
   * Ask Claude a conversational question
   * @param {string} question - The question to ask
   * @returns {Promise<object>} - Claude's response
   */
  async askQuestion(question) {
    return this.sendPrompt(question);
  }

  /**
   * Continue a conversation with context
   * @param {string} message - Next message in conversation
   * @param {string} systemPrompt - Optional system prompt
   * @returns {Promise<object>} - Claude's response
   */
  async continueConversation(message, systemPrompt = null) {
    let prompt = message;
    
    if (systemPrompt) {
      prompt = `System: ${systemPrompt}\n\nUser: ${message}`;
    }

    return this.sendPrompt(prompt);
  }

  /**
   * Get Claude's help with debugging
   * @param {string} code - Code with issues
   * @param {string} error - Error message
   * @returns {Promise<object>} - Claude's debugging help
   */
  async debugCode(code, error) {
    const prompt = `Help me debug this code:

\`\`\`
${code}
\`\`\`

Error: ${error}

Please explain the issue and provide a fix.`;

    return this.sendPrompt(prompt);
  }
}

module.exports = { ClaudeCodeAPIClient };

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing Claude Code API Integration...');
    
    const client = new ClaudeCodeAPIClient({ 
      debug: true,
      workingDirectory: '/workspaces/agent-feed'
    });

    try {
      // Test 1: Simple math
      console.log('\n1️⃣ Testing simple question...');
      const mathResponse = await client.askQuestion('What is 5 + 3?');
      console.log('Math result:', mathResponse.result);

      // Test 2: Code generation
      console.log('\n2️⃣ Testing code generation...');
      const codeResponse = await client.generateCode('Create a simple React functional component called HelloWorld');
      console.log('Code result:', codeResponse.result?.substring(0, 200) + '...');

      // Test 3: Conversation
      console.log('\n3️⃣ Testing conversation...');
      const chatResponse = await client.continueConversation('What are your capabilities?');
      console.log('Chat result:', chatResponse.result?.substring(0, 200) + '...');

      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  })();
}