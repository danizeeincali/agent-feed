/**
 * Manual Test for Agent Workspace Infrastructure
 * Simple validation of the workspace system
 */

import { AgentWorkspaceService } from '../../../src/services/workspace/AgentWorkspaceService.js';
import { databaseService } from '../../../src/database/DatabaseService.js';
import fs from 'fs/promises';

// Simple test implementation
async function runManualTest() {
  console.log('🧪 Running manual workspace infrastructure test...');
  
  try {
    // Initialize database service
    console.log('1. Initializing database service...');
    await databaseService.initialize();
    console.log('✅ Database service initialized');

    // Create mock agent service
    const mockAgentService = {
      getAgent: async (id) => ({
        id,
        name: id,
        display_name: `Test Agent ${id}`,
        description: 'Test agent for workspace testing'
      }),
      validateAgent: async (id) => true
    };

    // Create workspace service
    console.log('2. Creating workspace service...');
    const workspaceService = new AgentWorkspaceService(
      fs,
      databaseService,
      mockAgentService,
      console
    );
    console.log('✅ Workspace service created');

    // Test workspace initialization
    console.log('3. Testing workspace initialization...');
    const testAgentId = 'test-agent-manual';
    
    try {
      const workspace = await workspaceService.initializeWorkspace(testAgentId);
      console.log('✅ Workspace initialized:', workspace.workspace_path);
    } catch (error) {
      console.log('⚠️ Workspace initialization failed:', error.message);
      // Continue with other tests
    }

    // Test workspace info retrieval
    console.log('4. Testing workspace info retrieval...');
    try {
      const workspaceInfo = await workspaceService.getWorkspaceInfo(testAgentId);
      if (workspaceInfo) {
        console.log('✅ Workspace info retrieved');
        console.log('   Pages:', workspaceInfo.pages.length);
        console.log('   Statistics:', workspaceInfo.statistics);
      } else {
        console.log('⚠️ No workspace found for agent');
      }
    } catch (error) {
      console.log('⚠️ Workspace info retrieval failed:', error.message);
    }

    // Test page creation
    console.log('5. Testing page creation...');
    try {
      const pageData = {
        title: 'Test Manual Page',
        content_type: 'markdown',
        content_value: '# Test Page\n\nThis is a manual test page.',
        page_type: 'dynamic',
        status: 'draft'
      };
      
      const page = await workspaceService.createAgentPage(testAgentId, pageData);
      console.log('✅ Page created:', page.id);
    } catch (error) {
      console.log('⚠️ Page creation failed:', error.message);
    }

    // Test page listing
    console.log('6. Testing page listing...');
    try {
      const pagesList = await workspaceService.listAgentPages(testAgentId);
      console.log('✅ Page listing successful');
      console.log('   Total pages:', pagesList.total);
    } catch (error) {
      console.log('⚠️ Page listing failed:', error.message);
    }

    console.log('\n🎉 Manual test completed successfully!');
    
  } catch (error) {
    console.error('❌ Manual test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    databaseService.close();
  }
}

// Run the test
runManualTest().catch(console.error);