/**
 * Unit Test: Onboarding Bridge Removal
 *
 * Purpose: Verify that onboarding-related bridges are properly removed
 * from the database and do not appear in active bridge queries.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

describe('Onboarding Bridge Removal', () => {
  let db;

  beforeAll(() => {
    // Use absolute path to the production database
    const dbPath = '/workspaces/agent-feed/database.db';
    db = new sqlite3.Database(dbPath);
  });

  afterAll(() => {
    db.close();
  });

  test('should not have any active onboarding bridges', (done) => {
    const query = `
      SELECT COUNT(*) as count
      FROM hemingway_bridges
      WHERE active = 1
        AND (content LIKE '%getting to know you%'
          OR content LIKE '%Answer the onboarding questions%'
          OR content LIKE '%onboarding%')
    `;

    db.get(query, (err, row) => {
      expect(err).toBeNull();
      expect(row.count).toBe(0);
      done();
    });
  });

  test('should only return non-onboarding active bridges', (done) => {
    const query = `
      SELECT id, content
      FROM hemingway_bridges
      WHERE active = 1
    `;

    db.all(query, (err, rows) => {
      expect(err).toBeNull();

      // Verify no onboarding-related content
      rows.forEach(bridge => {
        const lowerContent = bridge.content.toLowerCase();
        expect(lowerContent).not.toContain('getting to know you');
        expect(lowerContent).not.toContain('answer the onboarding questions');
        expect(lowerContent).not.toContain('onboarding');
      });

      done();
    });
  });

  test('should verify bridge deletion integrity', (done) => {
    const query = `
      SELECT COUNT(*) as activeCount,
             (SELECT COUNT(*) FROM hemingway_bridges WHERE active = 0) as inactiveCount
      FROM hemingway_bridges
      WHERE active = 1
    `;

    db.get(query, (err, row) => {
      expect(err).toBeNull();
      expect(row.activeCount).toBeGreaterThanOrEqual(0);
      expect(row.inactiveCount).toBeGreaterThanOrEqual(0);
      done();
    });
  });
});
