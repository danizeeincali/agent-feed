/**
 * Verification Test for Claude Code UI Removal
 *
 * This test verifies that the Claude Code UI has been successfully removed
 * from RealSocialMediaFeed while maintaining core functionality.
 */

import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Claude Code UI Removal Verification', () => {

  test('RealSocialMediaFeed should not contain Claude Code state variables', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/RealSocialMediaFeed.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check that Claude Code state variables are removed
    expect(content).not.toContain('const [claudeMessage, setClaudeMessage]');
    expect(content).not.toContain('const [claudeMessages, setClaudeMessages]');
    expect(content).not.toContain('const [claudeLoading, setClaudeLoading]');
    expect(content).not.toContain('const [showClaudeCode, setShowClaudeCode]');
  });

  test('RealSocialMediaFeed should not contain sendToClaudeCode function', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/RealSocialMediaFeed.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check that sendToClaudeCode function is removed
    expect(content).not.toContain('const sendToClaudeCode = useCallback');
    expect(content).not.toContain('sendToClaudeCode');
  });

  test('RealSocialMediaFeed should not contain Claude Code UI button', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/RealSocialMediaFeed.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check that Claude Code button is removed
    expect(content).not.toContain('🤖 Claude Code');
    expect(content).not.toContain('setShowClaudeCode');
  });

  test('RealSocialMediaFeed should not contain Claude Code UI panel', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/RealSocialMediaFeed.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check that Claude Code UI panel is removed
    expect(content).not.toContain('🤖 Claude Code SDK');
    expect(content).not.toContain('Real file system access & tool execution');
    expect(content).not.toContain('claudeMessages.map');
    expect(content).not.toContain('onChange={(e) => setClaudeMessage');
  });

  test('ClaudeCodePanel.tsx should be deleted', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/ClaudeCodePanel.tsx');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  test('BulletproofClaudeCodePanel.tsx should be deleted', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/BulletproofClaudeCodePanel.tsx');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  test('BulletproofComponents.tsx should not import or export ClaudeCodePanel', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/BulletproofComponents.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check that ClaudeCodePanel imports and exports are removed
    expect(content).not.toContain('import ClaudeCodePanelOriginal');
    expect(content).not.toContain('export const BulletproofClaudeCodePanel');
    expect(content).not.toContain('BulletproofClaudeCodePanel,');
  });

  test('RealSocialMediaFeed should still contain core functionality', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/RealSocialMediaFeed.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Verify core functionality remains
    expect(content).toContain('const [posts, setPosts]');
    expect(content).toContain('const [loading, setLoading]');
    expect(content).toContain('loadPosts');
    expect(content).toContain('StreamingTickerWorking');
    expect(content).toContain('Agent Feed');
    expect(content).toContain('Real-time posts from production agents');
  });

  test('Component should export correctly', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/RealSocialMediaFeed.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Verify exports remain intact
    expect(content).toContain('export default RealSocialMediaFeed');
    expect(content).toContain('export { RealSocialMediaFeed }');
  });

  test('StreamingTickerWorking should remain in sidebar', () => {
    const filePath = path.join(__dirname, '../frontend/src/components/RealSocialMediaFeed.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Verify StreamingTicker remains (replaces Claude Code functionality)
    expect(content).toContain('📊 Live Tool Execution');
    expect(content).toContain('<StreamingTickerWorking');
    expect(content).toContain('enabled={true}');
  });
});