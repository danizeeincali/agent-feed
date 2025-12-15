// Regression Test Suite for Carriage Return and Terminal Control Sequences
// Prevents cascading fix from breaking Claude CLI spinner functionality

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { getPortConfig } from '../config/ports.config';

describe('Terminal Carriage Return Regression Tests', () => {
  const ports = getPortConfig('test');
  let wsTerminal: WebSocket;
  
  beforeAll(async () => {
    // Connect to WebSocket terminal server
    wsTerminal = new WebSocket(`ws://localhost:${ports.websocketTerminal}/terminal`);
    
    return new Promise((resolve) => {
      wsTerminal.on('open', resolve);
    });
  });
  
  afterAll(() => {
    wsTerminal?.close();
  });
  
  describe('Carriage Return Preservation', () => {
    it('should preserve standalone \\r for spinner overwriting', (done) => {
      const testSequence = 'Loading...\rDone!';
      let receivedData = '';
      
      wsTerminal.on('message', (data) => {
        receivedData += data.toString();
        
        // Check that carriage return is preserved
        expect(receivedData).toContain('\r');
        expect(receivedData).not.toContain('Loading...\nDone!');
        done();
      });
      
      wsTerminal.send(JSON.stringify({
        type: 'input',
        data: testSequence
      }));
    });
    
    it('should handle Claude CLI spinner animations correctly', (done) => {
      const spinnerFrames = [
        'Processing... |',
        'Processing... /',
        'Processing... -',
        'Processing... \\',
        'Complete!      '
      ];
      
      let frameIndex = 0;
      let lastOutput = '';
      
      const sendNextFrame = () => {
        if (frameIndex < spinnerFrames.length) {
          const frame = frameIndex === 0 ? 
            spinnerFrames[frameIndex] : 
            '\r' + spinnerFrames[frameIndex];
          
          wsTerminal.send(JSON.stringify({
            type: 'input',
            data: frame
          }));
          frameIndex++;
        }
      };
      
      wsTerminal.on('message', (data) => {
        const output = data.toString();
        lastOutput = output;
        
        if (frameIndex < spinnerFrames.length) {
          setTimeout(sendNextFrame, 100);
        } else {
          // Final frame should show "Complete!" not cascaded frames
          expect(lastOutput).toContain('Complete!');
          expect(lastOutput).not.toMatch(/Processing.*\nProcessing/);
          done();
        }
      });
      
      sendNextFrame();
    });
    
    it('should preserve \\r\\n line endings without cascade', () => {
      const testData = 'Line 1\r\nLine 2\r\nLine 3';
      
      return new Promise<void>((resolve) => {
        wsTerminal.on('message', (data) => {
          const output = data.toString();
          
          // Should preserve proper line structure
          expect(output.split('\n')).toHaveLength(3);
          expect(output).not.toContain('\r\r');
          resolve();
        });
        
        wsTerminal.send(JSON.stringify({
          type: 'input',
          data: testData
        }));
      });
    });
  });
  
  describe('ANSI Escape Sequence Processing', () => {
    it('should handle \\r\\x1b[K (clear line + return) correctly', (done) => {
      const testSequence = 'Old text\r\x1b[KNew text';
      
      wsTerminal.on('message', (data) => {
        const output = data.toString();
        
        // Should preserve both carriage return and clear sequence
        expect(output).toContain('\r');
        expect(output).toContain('\x1b[K');
        expect(output).toContain('New text');
        expect(output).not.toContain('Old textNew text'); // No cascade
        done();
      });
      
      wsTerminal.send(JSON.stringify({
        type: 'input',
        data: testSequence
      }));
    });
    
    it('should not convert \\r to cursor positioning sequences', (done) => {
      const testSequence = 'Text\rOverwrite';
      
      wsTerminal.on('message', (data) => {
        const output = data.toString();
        
        // Should contain actual \r, not \x1b[1G
        expect(output).toContain('\r');
        expect(output).not.toContain('\x1b[1G');
        done();
      });
      
      wsTerminal.send(JSON.stringify({
        type: 'input',
        data: testSequence
      }));
    });
  });
  
  describe('Cascade Prevention Validation', () => {
    it('should prevent character duplication cascading', (done) => {
      const testPattern = 'hello';
      let outputCount = 0;
      
      wsTerminal.on('message', (data) => {
        outputCount++;
        const output = data.toString();
        
        // Should not see progressive duplication: h -> he -> hel -> hell -> hello
        expect(output).not.toMatch(/h\nh\he\nhello/);
        expect(output).not.toContain('h\nhe\nhel\nhell\nhello');
        
        if (outputCount >= 1) {
          done();
        }
      });
      
      wsTerminal.send(JSON.stringify({
        type: 'input',
        data: testPattern
      }));
    });
  });
});