/**
 * Global Setup for Jest Test Suite
 */

const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');

module.exports = async () => {
  // Create temporary test directory
  const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-feed-tests-'));
  
  // Store test directory path globally
  global.__TEST_DIR__ = testDir;
  
  // Create test agent files
  await fs.mkdir(path.join(testDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(testDir, 'workspaces'), { recursive: true });
  
  const testAgent = `---
name: global-test-agent
description: Global test agent for integration tests
tools: [Read, Write, Edit]
model: sonnet
color: "#blue"
proactive: true
priority: P1
usage: Global testing purposes
---

# Global Test Agent

This agent is created during global test setup.`;

  await fs.writeFile(
    path.join(testDir, 'agents', 'global-test-agent.md'),
    testAgent
  );

  console.log('Test environment initialized:', testDir);
};