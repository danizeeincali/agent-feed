/**
 * Database wrapper for feedback loop
 * Provides async-like interface over better-sqlite3 sync API
 */

class FeedbackDatabase {
  constructor(db) {
    this.db = db;
  }

  run(query, params = []) {
    return this.db.prepare(query).run(...params);
  }

  get(query, params = []) {
    return this.db.prepare(query).get(...params);
  }

  all(query, params = []) {
    return this.db.prepare(query).all(...params);
  }
}

export default FeedbackDatabase;
