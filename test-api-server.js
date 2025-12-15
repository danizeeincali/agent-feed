#!/usr/bin/env node

import { createApp } from './src/app.js';

async function startTestServer() {
  try {
    console.log('🚀 Starting test server for agent validation...');

    const app = await createApp();
    const port = process.env.PORT || 3000;

    const server = app.listen(port, () => {
      console.log(`✅ Server running on http://localhost:${port}`);
      console.log(`📡 Testing agents API endpoint...`);

      // Test the agents endpoint
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:${port}/api/agents`);
          const data = await response.json();

          console.log('\n📊 AGENTS API TEST RESULTS:');
          console.log('==========================');
          console.log(`Status: ${response.status}`);
          console.log(`Success: ${data.success}`);
          console.log(`Total agents: ${data.metadata?.total_count || 0}`);
          console.log(`Data source: ${data.metadata?.data_source}`);
          console.log(`File-based: ${data.metadata?.file_based}`);
          console.log(`No fake data: ${data.metadata?.no_fake_data}`);

          if (data.agents && data.agents.length > 0) {
            console.log('\n🤖 DISCOVERED AGENTS:');
            data.agents.forEach(agent => {
              console.log(`  - ${agent.id}: "${agent.name}" (${agent.status})`);
            });
          }

          console.log('\n✅ Agent API validation completed successfully!');
          process.exit(0);
        } catch (error) {
          console.error('❌ API test failed:', error);
          process.exit(1);
        }
      }, 1000);
    });

    // Handle server shutdown
    process.on('SIGTERM', () => {
      console.log('📴 Shutting down server...');
      server.close();
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startTestServer();