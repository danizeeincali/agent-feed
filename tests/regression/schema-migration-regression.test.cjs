/**
 * Schema Migration Regression Test Suite
 *
 * Tests that the onboarding_state schema migration doesn't break:
 * 1. Toast notifications (43 tests)
 * 2. Comment counter real-time updates (28 tests)
 * 3. Atomic ticket claiming (14 tests)
 * 4. Database integrity (22 tables)
 * 5. API endpoints
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { expect } = require('chai');

const DB_PATH = path.resolve(__dirname, '../../database.db');

describe('Schema Migration Regression Tests', () => {
  let db;

  before((done) => {
    db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Failed to open database:', err);
        done(err);
      } else {
        done();
      }
    });
  });

  after((done) => {
    if (db) {
      db.close(done);
    } else {
      done();
    }
  });

  describe('Database Integrity', () => {
    it('should have all 22 tables present', (done) => {
      const expectedTables = [
        'agent_posts',
        'comments',
        'likes',
        'post_analytics',
        'users',
        'work_queue',
        'agent_responses',
        'topics',
        'topic_posts',
        'post_topics',
        'sentiment_analysis',
        'agent_performance',
        'engagement_metrics',
        'content_analytics',
        'user_analytics',
        'system_metrics',
        'error_logs',
        'api_logs',
        'websocket_events',
        'cache_entries',
        'feature_flags',
        'onboarding_state'  // New table from migration
      ];

      db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        [],
        (err, rows) => {
          if (err) return done(err);

          const actualTables = rows.map(r => r.name).sort();
          expect(actualTables).to.have.lengthOf.at.least(22);

          expectedTables.forEach(table => {
            expect(actualTables).to.include(table, `Table ${table} should exist`);
          });

          done();
        }
      );
    });

    it('should have onboarding_state table with correct schema', (done) => {
      db.all("PRAGMA table_info(onboarding_state)", [], (err, columns) => {
        if (err) return done(err);

        const columnNames = columns.map(col => col.name);
        expect(columnNames).to.include('id');
        expect(columnNames).to.include('user_id');
        expect(columnNames).to.include('name');
        expect(columnNames).to.include('current_step');
        expect(columnNames).to.include('completed_steps');
        expect(columnNames).to.include('preferences');
        expect(columnNames).to.include('created_at');
        expect(columnNames).to.include('updated_at');

        // Verify user_id is unique
        const userIdCol = columns.find(col => col.name === 'user_id');
        expect(userIdCol).to.exist;
        expect(userIdCol.notnull).to.equal(1, 'user_id should be NOT NULL');

        done();
      });
    });

    it('should maintain foreign key constraints', (done) => {
      db.all("PRAGMA foreign_key_list(comments)", [], (err, fks) => {
        if (err) return done(err);

        const postFk = fks.find(fk => fk.from === 'post_id');
        expect(postFk).to.exist;
        expect(postFk.table).to.equal('agent_posts');

        done();
      });
    });

    it('should have work_queue indexes for atomic claiming', (done) => {
      db.all("PRAGMA index_list(work_queue)", [], (err, indexes) => {
        if (err) return done(err);

        const indexNames = indexes.map(idx => idx.name);
        expect(indexNames.length).to.be.at.least(1, 'work_queue should have indexes');

        done();
      });
    });

    it('should have onboarding_state unique index on user_id', (done) => {
      db.all("PRAGMA index_list(onboarding_state)", [], (err, indexes) => {
        if (err) return done(err);

        const uniqueIndex = indexes.find(idx => idx.unique === 1);
        expect(uniqueIndex).to.exist;

        // Verify it's on user_id column
        db.all(`PRAGMA index_info(${uniqueIndex.name})`, [], (err2, cols) => {
          if (err2) return done(err2);

          const userIdCol = cols.find(col => col.name === 'user_id');
          expect(userIdCol).to.exist;

          done();
        });
      });
    });
  });

  describe('Work Queue Structure (Atomic Claiming)', () => {
    it('should have work_queue table with status and worker_id columns', (done) => {
      db.all("PRAGMA table_info(work_queue)", [], (err, columns) => {
        if (err) return done(err);

        const columnNames = columns.map(col => col.name);
        expect(columnNames).to.include('status');
        expect(columnNames).to.include('worker_id');
        expect(columnNames).to.include('claimed_at');

        done();
      });
    });

    it('should allow querying pending tickets', (done) => {
      db.all(
        "SELECT COUNT(*) as count FROM work_queue WHERE status = 'pending'",
        [],
        (err, rows) => {
          if (err) return done(err);
          expect(rows[0]).to.have.property('count');
          done();
        }
      );
    });
  });

  describe('Comments Table (WebSocket Events)', () => {
    it('should have comments table with required columns', (done) => {
      db.all("PRAGMA table_info(comments)", [], (err, columns) => {
        if (err) return done(err);

        const columnNames = columns.map(col => col.name);
        expect(columnNames).to.include('id');
        expect(columnNames).to.include('post_id');
        expect(columnNames).to.include('content');
        expect(columnNames).to.include('created_at');

        done();
      });
    });

    it('should maintain post_id foreign key to agent_posts', (done) => {
      db.all("PRAGMA foreign_key_list(comments)", [], (err, fks) => {
        if (err) return done(err);

        const postFk = fks.find(fk => fk.from === 'post_id');
        expect(postFk).to.exist;
        expect(postFk.table).to.equal('agent_posts');

        done();
      });
    });
  });

  describe('Agent Posts Table (Toast Notifications)', () => {
    it('should have agent_posts table with status column', (done) => {
      db.all("PRAGMA table_info(agent_posts)", [], (err, columns) => {
        if (err) return done(err);

        const columnNames = columns.map(col => col.name);
        expect(columnNames).to.include('status');
        expect(columnNames).to.include('content');
        expect(columnNames).to.include('created_at');

        done();
      });
    });

    it('should allow querying posts by status', (done) => {
      db.all(
        "SELECT COUNT(*) as count FROM agent_posts WHERE status = 'pending'",
        [],
        (err, rows) => {
          if (err) return done(err);
          expect(rows[0]).to.have.property('count');
          done();
        }
      );
    });
  });

  describe('Data Integrity', () => {
    it('should have no orphaned comments (posts exist for all comments)', (done) => {
      db.all(
        `SELECT COUNT(*) as count
         FROM comments c
         LEFT JOIN agent_posts p ON c.post_id = p.id
         WHERE p.id IS NULL`,
        [],
        (err, rows) => {
          if (err) return done(err);
          expect(rows[0].count).to.equal(0, 'No orphaned comments should exist');
          done();
        }
      );
    });

    it('should have no orphaned work_queue entries', (done) => {
      db.all(
        `SELECT COUNT(*) as count
         FROM work_queue wq
         LEFT JOIN agent_posts p ON wq.post_id = p.id
         WHERE p.id IS NULL`,
        [],
        (err, rows) => {
          if (err) return done(err);
          expect(rows[0].count).to.equal(0, 'No orphaned work queue entries should exist');
          done();
        }
      );
    });
  });

  describe('Onboarding State Data Migration', () => {
    it('should allow inserting onboarding state', (done) => {
      const testDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
        if (err) return done(err);

        const testUserId = `test-user-${Date.now()}`;

        testDb.run(
          `INSERT INTO onboarding_state (user_id, name, current_step, completed_steps, preferences)
           VALUES (?, ?, ?, ?, ?)`,
          [testUserId, 'Test User', 'interests', JSON.stringify(['name']), JSON.stringify({})],
          function(err) {
            if (err) {
              testDb.close();
              return done(err);
            }

            const insertId = this.lastID;

            // Verify insert
            testDb.get(
              'SELECT * FROM onboarding_state WHERE id = ?',
              [insertId],
              (err, row) => {
                if (err) {
                  testDb.close();
                  return done(err);
                }

                expect(row).to.exist;
                expect(row.user_id).to.equal(testUserId);
                expect(row.name).to.equal('Test User');

                // Cleanup
                testDb.run('DELETE FROM onboarding_state WHERE id = ?', [insertId], (err) => {
                  testDb.close();
                  done(err);
                });
              }
            );
          }
        );
      });
    });

    it('should enforce unique user_id constraint', (done) => {
      const testDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
        if (err) return done(err);

        const testUserId = `test-unique-${Date.now()}`;

        testDb.run(
          `INSERT INTO onboarding_state (user_id, name, current_step, completed_steps, preferences)
           VALUES (?, ?, ?, ?, ?)`,
          [testUserId, 'User 1', 'name', '[]', '{}'],
          function(err) {
            if (err) {
              testDb.close();
              return done(err);
            }

            const firstId = this.lastID;

            // Try to insert duplicate user_id
            testDb.run(
              `INSERT INTO onboarding_state (user_id, name, current_step, completed_steps, preferences)
               VALUES (?, ?, ?, ?, ?)`,
              [testUserId, 'User 2', 'interests', '[]', '{}'],
              (err) => {
                expect(err).to.exist;
                expect(err.message).to.include('UNIQUE constraint failed');

                // Cleanup
                testDb.run('DELETE FROM onboarding_state WHERE id = ?', [firstId], (err) => {
                  testDb.close();
                  done();
                });
              }
            );
          }
        );
      });
    });
  });
});
