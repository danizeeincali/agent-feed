/**
 * Agent Count Validation Test
 * Verifies that all 23 agents are properly registered in PostgreSQL
 * and accessible via the API
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

describe('Agent Registration Validation - 23 Agents', () => {
  let allAgents = [];

  beforeAll(async () => {
    // Fetch all agents from API
    const response = await axios.get(`${API_BASE_URL}/agents`, {
      params: { userId: 'anonymous' }
    });
    allAgents = response.data.data;
  });

  test('API returns exactly 23 agents', () => {
    expect(allAgents).toHaveLength(23);
    console.log(`\n✅ API returned ${allAgents.length} agents`);
  });

  test('All agents have required fields', () => {
    const requiredFields = [
      'id',
      'name',
      'display_name',
      'description',
      'system_prompt',
      'avatar_color',
      'status'
    ];

    allAgents.forEach(agent => {
      requiredFields.forEach(field => {
        expect(agent[field]).toBeDefined();
      });
    });

    console.log('✅ All 23 agents have required fields');
  });

  test('All agents are active', () => {
    const inactiveAgents = allAgents.filter(a => a.status !== 'active');

    expect(inactiveAgents).toHaveLength(0);
    console.log('✅ All 23 agents are active');
  });

  test('All agents have unique names', () => {
    const names = allAgents.map(a => a.name);
    const uniqueNames = new Set(names);

    expect(uniqueNames.size).toBe(23);
    console.log('✅ All 23 agents have unique names');
  });

  test('Agent list includes expected system agents', () => {
    const expectedSystemAgents = [
      'APIIntegrator',
      'DatabaseManager',
      'ProductionValidator',
      'SecurityAnalyzer',
      'PerformanceTuner',
      'BackendDeveloper'
    ];

    const agentNames = allAgents.map(a => a.name);

    expectedSystemAgents.forEach(name => {
      expect(agentNames).toContain(name);
    });

    console.log('✅ All expected system agents present');
  });

  test('Agent list includes expected user-facing agents', () => {
    const expectedUserAgents = [
      'personal-todos-agent',
      'meeting-prep-agent',
      'get-to-know-you-agent',
      'follow-ups-agent',
      'link-logger-agent',
      'meeting-next-steps-agent'
    ];

    const agentNames = allAgents.map(a => a.name);

    expectedUserAgents.forEach(name => {
      expect(agentNames).toContain(name);
    });

    console.log('✅ All expected user-facing agents present');
  });

  test('Agent list includes meta and page agents', () => {
    const expectedMetaAgents = [
      'meta-agent',
      'meta-update-agent',
      'page-builder-agent',
      'page-verification-agent',
      'dynamic-page-testing-agent'
    ];

    const agentNames = allAgents.map(a => a.name);

    expectedMetaAgents.forEach(name => {
      expect(agentNames).toContain(name);
    });

    console.log('✅ All expected meta and page agents present');
  });

  test('Generate complete agent list summary', () => {
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPLETE AGENT LIST (23 Agents)');
    console.log('='.repeat(70));

    const agentsByType = {
      system: [],
      userFacing: [],
      meta: [],
      testing: [],
      other: []
    };

    allAgents.forEach(agent => {
      const name = agent.name;

      if (['APIIntegrator', 'DatabaseManager', 'ProductionValidator', 'SecurityAnalyzer', 'PerformanceTuner', 'BackendDeveloper'].includes(name)) {
        agentsByType.system.push(agent);
      } else if (name.includes('meta-') || name.includes('page-')) {
        agentsByType.meta.push(agent);
      } else if (name.includes('test') || name.includes('verification')) {
        agentsByType.testing.push(agent);
      } else if (name.endsWith('-agent')) {
        agentsByType.userFacing.push(agent);
      } else {
        agentsByType.other.push(agent);
      }
    });

    console.log('\n🔧 System Agents (6):');
    agentsByType.system.forEach(a => {
      console.log(`   - ${a.name} (${a.display_name})`);
    });

    console.log('\n👥 User-Facing Agents (10):');
    agentsByType.userFacing.forEach(a => {
      console.log(`   - ${a.name} (${a.display_name})`);
    });

    console.log('\n🤖 Meta & Page Agents (5):');
    agentsByType.meta.forEach(a => {
      console.log(`   - ${a.name} (${a.display_name})`);
    });

    console.log('\n🧪 Testing Agents (1):');
    agentsByType.testing.forEach(a => {
      console.log(`   - ${a.name} (${a.display_name})`);
    });

    console.log('\n🔄 Other Agents (1):');
    agentsByType.other.forEach(a => {
      console.log(`   - ${a.name} (${a.display_name})`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Total: ${allAgents.length} agents registered in PostgreSQL`);
    console.log('='.repeat(70) + '\n');

    expect(allAgents.length).toBe(23);
  });
});
