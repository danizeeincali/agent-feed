const AgentRepository = require('../repositories/agent.repository');
const PageRepository = require('../repositories/page.repository');

module.exports = {
  version: 1,
  description: 'Initial schema for agents and pages',

  up(db) {
    console.log('Creating agents table...');
    AgentRepository.createTable();

    console.log('Creating agent_pages table...');
    PageRepository.createTable();

    console.log('Schema created successfully');
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS agent_pages;
      DROP TABLE IF EXISTS agents;
    `);
  }
};