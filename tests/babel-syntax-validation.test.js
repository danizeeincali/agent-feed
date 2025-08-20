/**
 * SPARC:debug TDD Test - Babel Syntax Validation
 * Testing WebSocketContext.tsx compilation and syntax correctness
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Babel Syntax Validation - WebSocketContext.tsx', () => {
  const contextFile = '/workspaces/agent-feed/frontend/src/context/WebSocketContext.tsx';
  
  test('should compile WebSocketContext.tsx without Babel syntax errors', async () => {
    // Read the file content
    const fileContent = fs.readFileSync(contextFile, 'utf8');
    
    // Check for orphaned brackets/braces
    const lines = fileContent.split('\n');
    let braceCount = 0;
    let bracketCount = 0;
    let parenCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Count opening/closing characters
      for (const char of line) {
        switch (char) {
          case '{': braceCount++; break;
          case '}': braceCount--; break;
          case '[': bracketCount++; break;
          case ']': bracketCount--; break;
          case '(': parenCount++; break;
          case ')': parenCount--; break;
        }
      }
    }
    
    // All brackets should be balanced
    expect(braceCount).toBe(0);
    expect(bracketCount).toBe(0);
    expect(parenCount).toBe(0);
  }, 10000);
  
  test('should not have orphaned closing braces', () => {
    const fileContent = fs.readFileSync(contextFile, 'utf8');
    const lines = fileContent.split('\n');
    
    // Check line 149 specifically (the error location)
    const line149 = lines[148]; // 0-indexed
    
    // Should not be just a closing brace
    expect(line149?.trim()).not.toBe('});');
    expect(line149?.trim()).not.toBe('}');
  });
  
  test('should have valid TypeScript/React syntax', () => {
    const fileContent = fs.readFileSync(contextFile, 'utf8');
    
    // Should not have syntax that would cause Babel errors
    expect(fileContent).not.toMatch(/^\s*}\s*;\s*$/m); // Orphaned closing brace
    expect(fileContent).not.toMatch(/^\s*}\s*$/m); // Orphaned closing brace without semicolon
    
    // Should have proper React imports
    expect(fileContent).toMatch(/import.*React/);
    
    // Should have proper TypeScript interfaces
    expect(fileContent).toMatch(/interface\s+\w+/);
  });
  
  test('should successfully transpile with Babel', async () => {
    return new Promise((resolve, reject) => {
      // Try to compile the file with Babel
      const babel = spawn('npx', ['babel', contextFile, '--presets=@babel/preset-react,@babel/preset-typescript'], {
        cwd: '/workspaces/agent-feed/frontend'
      });
      
      let stderr = '';
      let stdout = '';
      
      babel.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      babel.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      babel.on('close', (code) => {
        if (code === 0) {
          expect(stdout.length).toBeGreaterThan(0); // Should produce output
          expect(stderr).not.toMatch(/Unexpected token/); // No syntax errors
          resolve();
        } else {
          reject(new Error(`Babel compilation failed: ${stderr}`));
        }
      });
      
      // Set timeout
      setTimeout(() => {
        babel.kill();
        reject(new Error('Babel compilation timeout'));
      }, 30000);
    });
  }, 35000);
  
  test('should import from WebSocketSingletonContext correctly', () => {
    const fileContent = fs.readFileSync(contextFile, 'utf8');
    
    // Should have correct import syntax
    expect(fileContent).toMatch(/import.*WebSocketSingletonContext/);
    expect(fileContent).toMatch(/useWebSocketSingletonContext/);
    expect(fileContent).toMatch(/WebSocketSingletonProvider/);
  });
});