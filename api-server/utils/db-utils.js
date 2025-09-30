const crypto = require('crypto');

/**
 * Generate stable UUID from agent name
 * Same name always produces same UUID
 */
function generateAgentUUID(agentName) {
  const hash = crypto
    .createHash('sha256')
    .update(agentName)
    .digest('hex');

  // Format as UUID v5-style
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

/**
 * Generate page ID
 */
function generatePageId() {
  return 'page-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

/**
 * Parse JSON metadata safely
 */
function parseMetadata(metadataString) {
  if (!metadataString) return null;
  try {
    return JSON.parse(metadataString);
  } catch (error) {
    console.error('Failed to parse metadata:', error);
    return null;
  }
}

/**
 * Serialize metadata to JSON
 */
function serializeMetadata(metadata) {
  if (!metadata) return null;
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    console.error('Failed to serialize metadata:', error);
    return null;
  }
}

/**
 * Validate page ID format
 */
function isValidPageId(pageId) {
  return typeof pageId === 'string' && /^page-\d+-[a-f0-9]+$/.test(pageId);
}

/**
 * Validate agent ID format (UUID)
 */
function isValidAgentId(agentId) {
  return typeof agentId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(agentId);
}

/**
 * Sanitize string for safe storage
 */
function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

/**
 * Execute database query with error handling
 */
function executeQuery(db, query, params = []) {
  try {
    const stmt = db.prepare(query);
    return stmt.run(...params);
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

/**
 * Get single row from database
 */
function getRow(db, query, params = []) {
  try {
    const stmt = db.prepare(query);
    return stmt.get(...params);
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

/**
 * Get all rows from database
 */
function getAllRows(db, query, params = []) {
  try {
    const stmt = db.prepare(query);
    return stmt.all(...params);
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

/**
 * Transaction wrapper
 */
function transaction(db, callback) {
  const trans = db.transaction(callback);
  return trans();
}

module.exports = {
  generateAgentUUID,
  generatePageId,
  parseMetadata,
  serializeMetadata,
  isValidPageId,
  isValidAgentId,
  sanitizeString,
  executeQuery,
  getRow,
  getAllRows,
  transaction
};