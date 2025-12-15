/**
 * Onboarding Name Persistence Integration Test
 */

const { expect } = require('chai');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '../../database.db');

describe('Onboarding Name Persistence Integration', () => {
  let db;

  before(() => {
    db = new Database(DB_PATH);
  });

  after(() => {
    try {
      db.prepare('DELETE FROM onboarding_state WHERE user_id LIKE ?').run('test-%');
      db.close();
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });

  it('should save user name to onboarding_state table', () => {
    const userId = 'test-save-' + Date.now();
    const stmt = db.prepare('INSERT INTO onboarding_state (user_id, name, current_step, completed_steps, preferences) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(userId, 'Alice Johnson', 'interests', JSON.stringify(['name']), '{}');

    expect(result.changes).to.equal(1);

    const row = db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get(userId);
    expect(row.name).to.equal('Alice Johnson');
  });

  it('should enforce unique constraint on user_id', () => {
    const userId = 'test-dup-' + Date.now();
    db.prepare('INSERT INTO onboarding_state (user_id, name, current_step, completed_steps, preferences) VALUES (?, ?, ?, ?, ?)').run(userId, 'User 1', 'name', '[]', '{}');

    let error;
    try {
      db.prepare('INSERT INTO onboarding_state (user_id, name, current_step, completed_steps, preferences) VALUES (?, ?, ?, ?, ?)').run(userId, 'User 2', 'name', '[]', '{}');
    } catch (err) {
      error = err;
    }

    expect(error).to.exist;
    expect(error.message).to.include('UNIQUE constraint failed');
  });
});
